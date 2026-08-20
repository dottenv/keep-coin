from collections import defaultdict
from datetime import date, datetime, timezone

from sqlalchemy import func, or_

from app.errors import ApiError
from app.extensions import db
from app.models import Account, RecurringPhrase, Transaction, User
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
        return _mark_recurring(user_id, rows[:limit])

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
        return _mark_recurring(user_id, [tx])[0]

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
    def summary(user_id) -> dict:
        """Агрегаты для страницы «Статистика» (по счетам с доступом)."""
        _ensure_phrases_synced(user_id)
        accessible = accessible_account_ids(user_id)
        base = Transaction.query.filter(
            or_(
                Transaction.account_id.in_(accessible),
                Transaction.to_account_id.in_(accessible),
            )
        )

        total_income = _sum(base.filter(Transaction.type == "income"))
        total_expense = _sum(base.filter(Transaction.type == "expense"))

        now = datetime.now(timezone.utc)
        month_start = date(now.year, now.month, 1)
        month = base.filter(
            Transaction.date >= month_start, Transaction.date < _next_month(month_start)
        )
        month_income = _sum(month.filter(Transaction.type == "income"))
        month_expense = _sum(month.filter(Transaction.type == "expense"))

        expense_by_category = (
            base.filter(Transaction.type == "expense")
            .with_entities(
                Transaction.category, func.sum(Transaction.amount).label("total")
            )
            .group_by(Transaction.category)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )

        expense_by_account = (
            base.filter(Transaction.type == "expense")
            .join(Account, Transaction.account_id == Account.id)
            .with_entities(
                Transaction.account_id,
                Account.name,
                func.sum(Transaction.amount).label("total"),
            )
            .group_by(Transaction.account_id, Account.name)
            .order_by(func.sum(Transaction.amount).desc())
            .all()
        )

        return {
            "total_income": float(total_income),
            "total_expense": float(total_expense),
            "month_income": float(month_income),
            "month_expense": float(month_expense),
            "expense_by_category": [
                {"category": code, "total": float(total)} for code, total in expense_by_category
            ],
            "expense_by_account": [
                {
                    "account_id": str(account_id),
                    "account_name": name,
                    "total": float(total),
                }
                for account_id, name, total in expense_by_account
            ],
            "recurring_count": len(_recurring_titles(user_id)),
            "monthly": _monthly_history(user_id),
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


def _monthly_history(user_id) -> list:
    """Доходы/расходы по месяцам (последние 6, включая текущий)."""
    rows = (
        db.session.query(Transaction.type, Transaction.amount, Transaction.date)
        .filter(Transaction.user_id == user_id)
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
