from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func

from app.errors import ApiError
from app.extensions import db
from app.models import (
    Account,
    Budget,
    SavingsGoal,
    Transaction,
)
from app.models.account import DEFAULT_CURRENCY
from app.services.account_service import AccountService
from app.services.access_service import accessible_account_ids, account_role, require_role


def _next_month(start: date) -> date:
    if start.month == 12:
        return date(start.year + 1, 1, 1)
    return date(start.year, start.month + 1, 1)


def _prev_months(months: int, ref: date) -> list[tuple[int, int]]:
    """Список (year, month) за последние `months` полных месяцев до ref."""
    y, m = ref.year, ref.month
    result = []
    for _ in range(months):
        m -= 1
        if m == 0:
            y, m = y - 1, 12
        result.append((y, m))
    return result


def _month_start(ref: date) -> date:
    return date(ref.year, ref.month, 1)


def _period_range(period: str, ref: date | None = None) -> tuple[date, date]:
    """Границы периода бюджета: (start, end) — end не включительно."""
    ref = ref or date.today()
    if period == "year":
        return date(ref.year, 1, 1), date(ref.year + 1, 1, 1)
    if period == "week":
        start = ref - timedelta(days=ref.weekday())
        return start, start + timedelta(days=7)
    return _month_start(ref), _next_month(_month_start(ref))


def _primary_currency(accessible_ids) -> str:
    """Валюта для сводных цифр: валюта счёта с наибольшим балансом."""
    if not accessible_ids:
        return DEFAULT_CURRENCY
    rows = Account.query.filter(Account.id.in_(accessible_ids)).all()
    return max(rows, key=lambda a: abs(a.balance or 0)).currency


def _account_name(account_id):
    if account_id is None:
        return None
    acc = db.session.get(Account, account_id)
    return acc.name if acc else None


def _attach_budget_view(user_id, budget: Budget, accessible: set | None = None) -> Budget:
    """Считает расход/остаток/процент и вешает на объект поля для сериализации."""
    accessible = accessible_account_ids(user_id) if accessible is None else accessible
    spent = _spent_for_budget(user_id, budget, accessible)
    remaining = max(Decimal("0"), budget.amount - spent)
    budget._account_name = _account_name(budget.account_id)
    budget._role = account_role(user_id, budget.account_id) if budget.account_id else "owner"
    budget._shared = budget.account_id is not None and budget._role != "owner"
    budget._spent = float(spent)
    budget._remaining = float(remaining)
    budget._pct = round(float(spent / budget.amount * 100), 1) if budget.amount else 0.0
    return budget


def _spent_for_budget(user_id, budget: Budget, accessible: set) -> Decimal:
    """Сумма расходов за текущий период в рамках скоупа бюджета."""
    start, end = _period_range(budget.period)
    query = Transaction.query.filter(
        Transaction.type == "expense",
        Transaction.currency == budget.currency,
        Transaction.date >= start,
        Transaction.date < end,
    )
    if budget.account_id is not None:
        query = query.filter(Transaction.account_id == budget.account_id)
    else:
        query = query.filter(Transaction.account_id.in_(accessible))
    if budget.category:
        query = query.filter(Transaction.category == budget.category)
    result = query.with_entities(func.sum(Transaction.amount)).scalar()
    return result or Decimal("0")


def _goal_needed_per_month(goal: SavingsGoal) -> Decimal:
    if goal.monthly_contribution is not None:
        return goal.monthly_contribution
    if goal.deadline is not None:
        today = date.today()
        months = (goal.deadline.year - today.year) * 12 + (goal.deadline.month - today.month)
        if months <= 1:
            months = 1
        remaining = max(Decimal("0"), goal.target_amount - goal.saved_amount)
        # Точный расчёт по месяцам: от текущего месяца до месяца срока включительно.
        span = max(1, months + 1)
        return (remaining / span).quantize(Decimal("0.01"))
    return Decimal("0")


def _attach_goal_view(user_id, goal: SavingsGoal, accessible: set | None = None) -> SavingsGoal:
    accessible = accessible_account_ids(user_id) if accessible is None else accessible
    mine = {a.id for a in Account.query.filter_by(user_id=user_id).all()}
    goal._account_name = _account_name(goal.account_id)
    goal._shared = goal.account_id is not None and goal.account_id not in mine
    goal._pct = (
        round(float(goal.saved_amount / goal.target_amount * 100), 1)
        if goal.target_amount
        else 0.0
    )
    goal._needed_per_month = float(_goal_needed_per_month(goal))
    return goal


def _avg_monthly_totals(user_id, accessible: set, currency: str, months=3) -> tuple[float, float]:
    """Средние доходы/расходы за последние полные месяцы (в заданной валюте)."""
    buckets = _prev_months(months, date.today())
    sums = {b: [Decimal("0"), Decimal("0")] for b in buckets}
    for (year, month) in buckets:
        start = date(year, month, 1)
        end = _next_month(start)
        base = Transaction.query.filter(
            Transaction.currency == currency,
            Transaction.date >= start,
            Transaction.date < end,
            Transaction.account_id.in_(accessible),
        )
        income = base.filter(Transaction.type == "income").with_entities(
            func.sum(Transaction.amount)
        ).scalar()
        expense = base.filter(Transaction.type == "expense").with_entities(
            func.sum(Transaction.amount)
        ).scalar()
        sums[(year, month)] = [income or 0, expense or 0]

    with_data = [v for v in sums.values() if v[0] or v[1]]
    if not with_data:
        return 0.0, 0.0
    n = len(with_data)
    avg_income = sum(v[0] for v in with_data) / n
    avg_expense = sum(v[1] for v in with_data) / n
    return float(avg_income), float(avg_expense)


class PlannerService:
    """Планировщик: бюджеты, цели накоплений и ежемесячный прогноз."""

    # ---------- Бюджеты ----------

    @staticmethod
    def list_budgets(user_id) -> list[Budget]:
        accessible = accessible_account_ids(user_id)
        query = Budget.query.filter(
            (Budget.user_id == user_id) | (Budget.account_id.in_(accessible))
        ).order_by(Budget.created_at.asc())
        budgets = query.all()
        for b in budgets:
            _attach_budget_view(user_id, b, accessible)
        return budgets

    @staticmethod
    def get_budget(user_id, budget_id) -> Budget:
        budget = db.session.get(Budget, budget_id)
        if budget is None:
            raise ApiError("budget_not_found", 404)
        accessible = accessible_account_ids(user_id)
        if budget.user_id != user_id and budget.account_id not in accessible:
            raise ApiError("budget_not_found", 404)
        return _attach_budget_view(user_id, budget, accessible)

    @staticmethod
    def create_budget(user_id, data: dict) -> Budget:
        account_id = data.get("account_id")
        currency = data.get("currency")
        if account_id is not None:
            require_role(user_id, account_id, "owner", "editor")
            account = AccountService.get_accessible(user_id, account_id)
            currency = account.currency if currency is None else currency
        if currency is None:
            currency = DEFAULT_CURRENCY

        budget = Budget(
            user_id=user_id,
            account_id=account_id,
            name=data["name"].strip(),
            amount=data["amount"],
            period=data.get("period", "month"),
            category=data.get("category") or None,
            currency=currency,
            is_active=bool(data.get("is_active", True)),
        )
        db.session.add(budget)
        db.session.commit()
        return _attach_budget_view(user_id, budget)

    @staticmethod
    def update_budget(user_id, budget_id, data: dict) -> Budget:
        budget = PlannerService.get_budget(user_id, budget_id)
        if budget.user_id != user_id and account_role(user_id, budget.account_id) != "owner":
            raise ApiError("permission_denied", 403)

        if data.get("name") is not None:
            budget.name = data["name"].strip()
        if data.get("amount") is not None:
            budget.amount = data["amount"]
        if "account_id" in data:
            budget.account_id = data["account_id"]
        if data.get("period") is not None:
            budget.period = data["period"]
        if "category" in data:
            budget.category = data.get("category") or None
        if data.get("currency") is not None:
            budget.currency = data["currency"]
        if data.get("is_active") is not None:
            budget.is_active = data["is_active"]
        db.session.commit()
        return _attach_budget_view(user_id, budget)

    @staticmethod
    def delete_budget(user_id, budget_id) -> None:
        budget = PlannerService.get_budget(user_id, budget_id)
        if budget.user_id != user_id and account_role(user_id, budget.account_id) != "owner":
            raise ApiError("permission_denied", 403)
        db.session.delete(budget)
        db.session.commit()

    # ---------- Цели накоплений ----------

    @staticmethod
    def list_goals(user_id) -> list[SavingsGoal]:
        accessible = accessible_account_ids(user_id)
        goals = SavingsGoal.query.filter(
            (SavingsGoal.user_id == user_id) | (SavingsGoal.account_id.in_(accessible))
        ).order_by(SavingsGoal.created_at.asc()).all()
        for g in goals:
            _attach_goal_view(user_id, g, accessible)
        return goals

    @staticmethod
    def get_goal(user_id, goal_id) -> SavingsGoal:
        goal = db.session.get(SavingsGoal, goal_id)
        if goal is None:
            raise ApiError("goal_not_found", 404)
        accessible = accessible_account_ids(user_id)
        if goal.user_id != user_id and goal.account_id not in accessible:
            raise ApiError("goal_not_found", 404)
        return _attach_goal_view(user_id, goal, accessible)

    @staticmethod
    def create_goal(user_id, data: dict) -> SavingsGoal:
        account_id = data.get("account_id")
        currency = data.get("currency")
        if account_id is not None:
            require_role(user_id, account_id, "owner", "editor")
            account = AccountService.get_accessible(user_id, account_id)
            currency = account.currency if currency is None else currency
        if currency is None:
            currency = DEFAULT_CURRENCY

        goal = SavingsGoal(
            user_id=user_id,
            account_id=account_id,
            name=data["name"].strip(),
            target_amount=data["target_amount"],
            saved_amount=data.get("saved_amount", Decimal("0")),
            deadline=data.get("deadline"),
            monthly_contribution=data.get("monthly_contribution"),
            currency=currency,
            is_active=bool(data.get("is_active", True)),
        )
        db.session.add(goal)
        db.session.commit()
        return _attach_goal_view(user_id, goal)

    @staticmethod
    def update_goal(user_id, goal_id, data: dict) -> SavingsGoal:
        goal = PlannerService.get_goal(user_id, goal_id)
        if goal.user_id != user_id and account_role(user_id, goal.account_id) != "owner":
            raise ApiError("permission_denied", 403)

        if data.get("name") is not None:
            goal.name = data["name"].strip()
        if data.get("target_amount") is not None:
            goal.target_amount = data["target_amount"]
        if data.get("saved_amount") is not None:
            goal.saved_amount = data["saved_amount"]
        if "account_id" in data:
            goal.account_id = data["account_id"]
        if "deadline" in data:
            goal.deadline = data.get("deadline")
        if "monthly_contribution" in data:
            goal.monthly_contribution = data.get("monthly_contribution")
        if data.get("currency") is not None:
            goal.currency = data["currency"]
        if data.get("is_active") is not None:
            goal.is_active = data["is_active"]
        db.session.commit()
        return _attach_goal_view(user_id, goal)

    @staticmethod
    def delete_goal(user_id, goal_id) -> None:
        goal = PlannerService.get_goal(user_id, goal_id)
        if goal.user_id != user_id and account_role(user_id, goal.account_id) != "owner":
            raise ApiError("permission_denied", 403)
        db.session.delete(goal)
        db.session.commit()

    # ---------- Сводка планировщика ----------

    @staticmethod
    def overview(user_id) -> dict:
        accessible = accessible_account_ids(user_id)
        if not accessible:
            return {
                "month": date.today().strftime("%Y-%m"),
                "currency": DEFAULT_CURRENCY,
                "month_income": 0.0,
                "month_expense": 0.0,
                "planned_income": 0.0,
                "planned_expenses": 0.0,
                "savings_target": 0.0,
                "need_to_earn": 0.0,
                "current_balance": 0.0,
                "projected_balance": 0.0,
                "daily_budget": 0.0,
                "days_left": 0,
                "budgets": [],
                "goals": [],
            }

        primary = _primary_currency(accessible)
        today = date.today()
        month_start = _month_start(today)
        month_end = _next_month(month_start)

        def _month_sum(tx_type: str) -> float:
            total = (
                Transaction.query.filter(
                    Transaction.currency == primary,
                    Transaction.type == tx_type,
                    Transaction.date >= month_start,
                    Transaction.date < month_end,
                    Transaction.account_id.in_(accessible),
                )
                .with_entities(func.sum(Transaction.amount))
                .scalar()
            )
            return float(total or 0)

        month_income = _month_sum("income")
        month_expense = _month_sum("expense")

        avg_income, avg_expense = _avg_monthly_totals(user_id, accessible, primary)

        budgets = PlannerService.list_budgets(user_id)
        active_budgets = [b for b in budgets if b.is_active and b.currency == primary]
        monthly_budgets = [b for b in active_budgets if b.period == "month"]

        planned_expenses = float(
            sum((b.amount for b in monthly_budgets), 0) or 0
        )
        if not planned_expenses:
            planned_expenses = avg_expense

        goals = PlannerService.list_goals(user_id)
        active_goals = [g for g in goals if g.is_active and g.currency == primary]
        savings_target = sum(g._needed_per_month for g in active_goals)

        need_to_earn = max(0.0, planned_expenses + savings_target - avg_income)

        current_balance = float(
            sum(
                a.balance or 0
                for a in Account.query.filter(
                    Account.id.in_(accessible), Account.currency == primary
                ).all()
            )
        )
        projected_balance = current_balance + avg_income - planned_expenses - savings_target

        remaining_total = sum(b._remaining for b in monthly_budgets)
        days_left = (month_end - today).days
        daily_budget = round(remaining_total / days_left, 2) if days_left > 0 else 0.0

        return {
            "month": today.strftime("%Y-%m"),
            "currency": primary,
            "month_income": month_income,
            "month_expense": month_expense,
            "planned_income": round(avg_income, 2),
            "planned_expenses": round(planned_expenses, 2),
            "savings_target": round(savings_target, 2),
            "need_to_earn": round(need_to_earn, 2),
            "current_balance": round(current_balance, 2),
            "projected_balance": round(projected_balance, 2),
            "daily_budget": daily_budget,
            "days_left": days_left,
            "budgets": budgets,
            "goals": goals,
        }