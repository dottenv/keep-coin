from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timezone

from sqlalchemy import func, or_

from app.errors import ApiError
from app.extensions import db
from app.models import Account, Category, CategoryKeyword, RecurringPhrase, Transaction, User
from app.models.category_keyword import normalize_keyword
from app.services.access_service import accessible_account_ids, account_role, require_role
from app.services.account_service import AccountService
from app.services.category_service import CategoryService


class TransactionService:
    @staticmethod
    def list(
        user_id,
        limit: int = 100,
        search: str | None = None,
        tx_type: str | None = None,
        category: str | None = None,
        account_id=None,
        recurring: bool | None = None,
    ) -> list[Transaction]:
        accessible = accessible_account_ids(user_id)
        if not accessible:
            return []
        query = Transaction.query.filter(
            or_(
                Transaction.account_id.in_(accessible),
                Transaction.to_account_id.in_(accessible),
            )
        )

        if tx_type:
            query = query.filter(Transaction.type == tx_type)
        if category:
            query = query.filter(Transaction.category == category)
        if account_id:
            query = query.filter(Transaction.account_id == account_id)
        if recurring is not None:
            titles = _recurring_titles(user_id)
            if recurring:
                query = query.filter(func.lower(Transaction.title).in_(titles))
            else:
                query = query.filter(func.lower(Transaction.title).notin_(titles))

        rows = query.order_by(Transaction.date.desc(), Transaction.created_at.desc()).all()

        # Поиск по названию — в Python (SQLite lower() не работает с кириллицей).
        if search:
            q = search.casefold().strip()
            rows = [tx for tx in rows if q in tx.title.casefold()]

        _ensure_phrases_synced(user_id)
        return _attach_authors(user_id, _mark_recurring(user_id, rows[:limit]))

    @staticmethod
    def get_for_user(user_id, transaction_id) -> Transaction:
        tx = db.session.get(Transaction, transaction_id)
        if tx is None:
            raise ApiError("transaction_not_found", 404)
        accessible = accessible_account_ids(user_id)
        if not (
            tx.account_id in accessible
            or (tx.to_account_id and tx.to_account_id in accessible)
        ):
            raise ApiError("transaction_not_found", 404)
        _ensure_phrases_synced(user_id)
        return _attach_authors(user_id, _mark_recurring(user_id, [tx]))[0]

    @staticmethod
    def create(user_id, data: dict) -> Transaction:
        tx_type = data["type"]
        require_role(user_id, data["account_id"], "owner", "editor")
        account = AccountService.get_accessible(user_id, data["account_id"])
        to_account = None
        if to_account_id := data.get("to_account_id"):
            if to_account_id == account.id:
                raise ApiError("transfer_same_account", 400)
            require_role(user_id, to_account_id, "owner", "editor")
            to_account = AccountService.get_accessible(user_id, to_account_id)
        elif tx_type == "transfer":
            raise ApiError("transfer_requires_to_account", 400)

        title = data.get("title", "").strip()
        if tx_type != "transfer" and not title:
            raise ApiError("title_required", 400)

        amount = data["amount"]
        currency = account.currency

        # Балансы обновляются в рамках одной транзакции БД.
        if tx_type == "income":
            account.balance += amount
        elif tx_type == "expense":
            account.balance -= amount
        else:  # transfer
            account.balance -= amount
            to_account.balance += amount

        tx = Transaction(
            user_id=user_id,
            type=tx_type,
            account_id=account.id,
            to_account_id=to_account.id if to_account else None,
            title=title,
            category="other",
            amount=amount,
            currency=currency,
            date=data["date"],
        )
        _apply_category(user_id, tx, data)
        _learn_keyword(user_id, tx)
        db.session.add(tx)
        db.session.commit()

        _sync_phrases(user_id)
        tx.recurring = False  # детект выполняется при чтении (list/get)
        return tx

    @staticmethod
    def update(user_id, transaction_id, data: dict) -> Transaction:
        tx = TransactionService.get_for_user(user_id, transaction_id)
        require_role(user_id, tx.account_id, "owner", "editor")
        if tx.to_account_id:
            require_role(user_id, tx.to_account_id, "owner", "editor")

        # Отменяем старый эффект на балансах…
        old_type = tx.type
        if old_type == "income":
            tx.account.balance -= tx.amount
        elif old_type == "expense":
            tx.account.balance += tx.amount
        elif tx.to_account is not None:
            tx.account.balance += tx.amount
            tx.to_account.balance -= tx.amount

        new_type = data.get("type") or tx.type
        account = tx.account
        if data.get("account_id"):
            require_role(user_id, data["account_id"], "owner", "editor")
            account = AccountService.get_accessible(user_id, data["account_id"])
        to_account = tx.to_account
        if "to_account_id" in data:
            if data["to_account_id"]:
                require_role(user_id, data["to_account_id"], "owner", "editor")
                to_account = AccountService.get_accessible(user_id, data["to_account_id"])
            else:
                to_account = None
        if new_type == "transfer":
            if to_account is None:
                raise ApiError("transfer_requires_to_account", 400)
            if to_account.id == account.id:
                raise ApiError("transfer_same_account", 400)
        else:
            to_account = None

        amount = data.get("amount") if data.get("amount") is not None else tx.amount

        # …и применяем новый эффект.
        if new_type == "income":
            account.balance += amount
        elif new_type == "expense":
            account.balance -= amount
        else:  # transfer
            account.balance -= amount
            to_account.balance += amount

        tx.type = new_type
        tx.account_id = account.id
        tx.account = account
        tx.to_account_id = to_account.id if to_account else None
        tx.to_account = to_account
        tx.amount = amount
        if data.get("title") is not None:
            tx.title = data["title"].strip()
        if data.get("date") is not None:
            tx.date = data["date"]

        if "category" in data or "category_id" in data:
            _apply_category(user_id, tx, data)
            _learn_keyword(user_id, tx)

        db.session.commit()
        _sync_phrases(user_id)
        return _mark_recurring(user_id, [tx])[0]

    @staticmethod
    def delete(user_id, transaction_id) -> None:
        tx = TransactionService.get_for_user(user_id, transaction_id)
        require_role(user_id, tx.account_id, "owner", "editor")
        if tx.to_account_id:
            require_role(user_id, tx.to_account_id, "owner", "editor")
        # Возвращаем баланс: доход снимаем, расход возвращаем, перевод откатываем.
        if tx.type == "income":
            tx.account.balance -= tx.amount
        elif tx.type == "expense":
            tx.account.balance += tx.amount
        elif tx.to_account is not None:
            tx.account.balance += tx.amount
            tx.to_account.balance -= tx.amount
        db.session.delete(tx)
        db.session.commit()
        _sync_phrases(user_id)

    @staticmethod
    def suggestions(user_id, tx_type: str | None = None, q: str | None = None, limit: int = 8):
        """Подсказки из прошлых операций: чипы для быстрого заполнения формы."""
        accessible = accessible_account_ids(user_id)
        if not accessible:
            return []
        query = Transaction.query.filter(
            or_(
                Transaction.account_id.in_(accessible),
                Transaction.to_account_id.in_(accessible),
            )
        )
        if tx_type:
            query = query.filter(Transaction.type == tx_type)
        txs = (
            query.order_by(Transaction.date.desc(), Transaction.created_at.desc())
            .limit(300)
            .all()
        )

        agg: dict[str, dict] = {}
        for tx in txs:
            key = (tx.title or "").strip().lower()
            if not key:
                continue
            if q and q.strip().lower() not in key:
                continue
            item = agg.setdefault(
                key,
                {
                    "title": (tx.title or "").strip(),
                    "category": tx.category,
                    "amount": float(tx.amount),
                    "currency": tx.currency,
                    "count": 0,
                    "last_date": tx.date,
                },
            )
            item["count"] += 1

        return sorted(agg.values(), key=lambda x: -x["count"])[:limit]

    @staticmethod
    def suggest_category(user_id, title: str | None):
        """Подсказать категорию по запомненному ключевому слову (названию)."""
        kw = normalize_keyword(title or "")
        if not kw:
            return None
        ck = CategoryKeyword.query.filter_by(user_id=user_id, keyword=kw).first()
        if ck is None or ck.category is None:
            return None
        c = ck.category
        return {
            "id": str(c.id),
            "name": c.name,
            "color": c.color,
            "icon": c.icon,
            "kind": c.kind,
        }

    @staticmethod
    def summary(user_id, filters: dict | None = None) -> dict:
        """Агрегаты для страницы «Статистика» (по счетам с доступом).

        Поддерживает фильтры: account_id, category (код/название), type,
        date_from, date_to.
        """
        filters = filters or {}
        _ensure_phrases_synced(user_id)
        accessible = accessible_account_ids(user_id)
        q = Transaction.query.filter(
            or_(
                Transaction.account_id.in_(accessible),
                Transaction.to_account_id.in_(accessible),
            )
        )
        if filters.get("account_id"):
            q = q.filter(Transaction.account_id == filters["account_id"])
        if filters.get("type"):
            q = q.filter(Transaction.type == filters["type"])
        if filters.get("date_from"):
            q = q.filter(Transaction.date >= filters["date_from"])
        if filters.get("date_to"):
            q = q.filter(Transaction.date <= filters["date_to"])

        # Все метрики считаются из одного отфильтрованного набора, поэтому
        # каждый виджет страницы «Статистика» подчиняется активным фильтрам.
        txns = q.all()

        total_income = float(sum(t.amount for t in txns if t.type == "income"))
        total_expense = float(sum(t.amount for t in txns if t.type == "expense"))

        now = datetime.now(timezone.utc)
        month_start = date(now.year, now.month, 1)
        nm = _next_month(month_start)
        month_income = float(
            sum(t.amount for t in txns if t.type == "income" and month_start <= t.date < nm)
        )
        month_expense = float(
            sum(t.amount for t in txns if t.type == "expense" and month_start <= t.date < nm)
        )

        category_filter = filters.get("category")
        cats_by_id = {c.id: c for c in Category.query.filter_by(user_id=user_id).all()}
        cat_totals: dict[tuple, float] = defaultdict(float)
        for t in txns:
            if t.type != "expense":
                continue
            if category_filter and t.category != category_filter:
                continue
            cat_totals[(t.category_id, t.category)] += float(t.amount)

        expense_by_category = []
        for (cat_id, code), total in cat_totals.items():
            name = color = icon = None
            if cat_id and cat_id in cats_by_id:
                c = cats_by_id[cat_id]
                name, color, icon = c.name, c.color, c.icon
            expense_by_category.append(
                {
                    "category": code,
                    "category_id": str(cat_id) if cat_id else None,
                    "name": name,
                    "color": color,
                    "icon": icon,
                    "total": total,
                }
            )
        expense_by_category.sort(key=lambda x: x["total"], reverse=True)

        # Динамика по месяцам: последние 6 календарных месяцев от текущего.
        buckets = []
        y, m = now.year, now.month
        for _ in range(6):
            buckets.append(date(y, m, 1))
            m -= 1
            if m == 0:
                m = 12
                y -= 1
        buckets.reverse()
        monthly = []
        for ms in buckets:
            nxt = _next_month(ms)
            inc = sum(t.amount for t in txns if t.type == "income" and ms <= t.date < nxt)
            exp = sum(t.amount for t in txns if t.type == "expense" and ms <= t.date < nxt)
            monthly.append(
                {"month": ms.strftime("%Y-%m"), "income": float(inc), "expense": float(exp)}
            )

        titles = _recurring_titles(user_id)
        recurring_titles = {
            (t.title or "").strip().lower()
            for t in txns
            if (t.title or "").strip().lower() in titles
        }

        return {
            "total_income": total_income,
            "total_expense": total_expense,
            "month_income": month_income,
            "month_expense": month_expense,
            "expense_by_category": expense_by_category,
            "recurring_count": len(recurring_titles),
            "monthly": monthly,
        }


def _apply_category(user_id, tx: Transaction, data: dict) -> None:
    """Связывает операцию с категорией.

    Кастомная категория — по `category_id` (название сохраняется в `category`),
    встроенная — по коду в `category`.
    """
    if data.get("category_id"):
        cat = CategoryService.get_for_user(user_id, data["category_id"])
        tx.category_id = cat.id
        tx.category = cat.name
    elif data.get("category"):
        tx.category_id = None
        tx.category = data["category"]
    else:
        tx.category_id = None
        tx.category = "other"


def _learn_keyword(user_id, tx: Transaction) -> None:
    """Запоминает сопоставление «название → категория» для автоподстановки."""
    if not tx.category_id:
        return
    kw = normalize_keyword(tx.title)
    if not kw:
        return
    existing = CategoryKeyword.query.filter_by(user_id=user_id, keyword=kw).first()
    if existing is None:
        db.session.add(
            CategoryKeyword(user_id=user_id, keyword=kw, category_id=tx.category_id)
        )
    elif existing.category_id != tx.category_id:
        existing.category_id = tx.category_id


def _tx_title(tx) -> str:
    return (tx.title or "").strip().lower()


def _next_month(month_start: date) -> date:
    if month_start.month == 12:
        return date(month_start.year + 1, 1, 1)
    return date(month_start.year, month_start.month + 1, 1)


def _tx_key(tx) -> tuple | None:
    """Ключ «повторяемости»: тип + счёт + нормализованное название + сумма."""
    title = _tx_title(tx)
    if not title:
        return None
    return (tx.type, str(tx.account_id), title, str(tx.amount))


def _recurring_groups(user_id) -> dict:
    rows = (
        db.session.query(
            Transaction.type,
            Transaction.account_id,
            Transaction.title,
            Transaction.amount,
            Transaction.date,
        )
        .filter(Transaction.user_id == user_id)
        .all()
    )
    by_key: dict[tuple, dict] = {}
    for tx_type, account_id, title, amount, tx_date in rows:
        key = (tx_type, str(account_id), (title or "").strip().lower(), str(amount))
        if not key[2]:
            continue
        entry = by_key.setdefault(key, {"title": (title or "").strip().lower()})
        entry.setdefault("months", set()).add((tx_date.year, tx_date.month))
    return by_key


def _recurring_titles(user_id) -> set[str]:
    return {
        p.phrase
        for p in RecurringPhrase.query.filter_by(user_id=user_id).all()
    }


def _mark_recurring(user_id, txs: list) -> list:
    titles = _recurring_titles(user_id)
    for tx in txs:
        tx.recurring = _tx_title(tx) in titles
    return txs


def _attach_authors(user_id, txs: list) -> list:
    """Проставляет `_author_name`/`_is_own` для отображения автора операции.

    Автор показывается только для операций, созданных другим пользователем
    (семейный/общий доступ), чтобы было видно, кто и что внёс.
    """
    if not txs:
        return txs
    ids = {t.user_id for t in txs}
    names = {u.id: u.display_name for u in User.query.filter(User.id.in_(ids)).all()}
    for t in txs:
        t._author_name = names.get(t.user_id)
        t._is_own = t.user_id == user_id
    return txs


def _sync_phrases(user_id) -> None:
    """Запоминает «ключевые слова»: названия, повторяющиеся в ≥2 разных месяцах.

    Учитываются только операции после последнего сброса ключевых слов
    (keywords_reset_at), чтобы сброс реально «обнулял» детекцию.
    """
    user = db.session.get(User, user_id)
    since = user.keywords_reset_at if user and user.keywords_reset_at else None

    rows = (
        db.session.query(
            Transaction.type,
            Transaction.account_id,
            Transaction.title,
            Transaction.amount,
            Transaction.date,
        )
        .filter(Transaction.user_id == user_id)
        .all()
    )
    by_key: dict[tuple, dict] = {}
    for tx_type, account_id, title, amount, tx_date in rows:
        if since is not None and tx_date < since.date():
            continue
        key = (tx_type, str(account_id), (title or "").strip().lower(), str(amount))
        if not key[2]:
            continue
        entry = by_key.setdefault(key, {"title": (title or "").strip().lower()})
        entry.setdefault("months", set()).add((tx_date.year, tx_date.month))

    existing = _recurring_titles(user_id)
    to_add = []
    for key, meta in by_key.items():
        if len(meta["months"]) >= 2 and meta["title"] not in existing:
            to_add.append(
                RecurringPhrase(user_id=user_id, phrase=meta["title"])
            )
            existing.add(meta["title"])
    if to_add:
        db.session.add_all(to_add)
        db.session.commit()


def _ensure_phrases_synced(user_id) -> None:
    """Однократный backfill «ключевых слов» для легаси-данных.

    Если пользователь ещё никогда не сбрасывал ключевые слова и таблица пуста —
    обучаем фразы из существующей истории. После сброса (keywords_reset_at)
    автоматический backfill не выполняется.
    """
    user = db.session.get(User, user_id)
    if user and user.keywords_reset_at is not None:
        return
    has = RecurringPhrase.query.filter_by(user_id=user_id).first()
    if has is None:
        _sync_phrases(user_id)


def _monthly_history(user_id, accessible: set | None = None) -> list:
    """Доходы/расходы по месяцам (последние 6, включая текущий)."""
    if accessible is None:
        accessible = accessible_account_ids(user_id)
    rows = (
        db.session.query(Transaction.type, Transaction.amount, Transaction.date)
        .filter(
            or_(
                Transaction.account_id.in_(accessible),
                Transaction.to_account_id.in_(accessible),
            )
        )
        .all()
    )

    now = datetime.now(timezone.utc)
    y, m = now.year, now.month
    months = []
    for _ in range(6):
        months.append((y, m))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    months.reverse()

    agg = defaultdict(lambda: [0.0, 0.0])  # [income, expense]
    for tx_type, amount, tx_date in rows:
        bucket = (tx_date.year, tx_date.month)
        if bucket in months:
            value = float(amount)
            if tx_type == "income":
                agg[bucket][0] += value
            elif tx_type == "expense":
                agg[bucket][1] += value

    return [
        {
            "month": f"{year}-{month:02d}",
            "income": round(agg[(year, month)][0], 2),
            "expense": round(agg[(year, month)][1], 2),
        }
        for year, month in months
    ]


def _sum(query):
    result = query.with_entities(func.sum(Transaction.amount)).scalar()
    return result or 0
