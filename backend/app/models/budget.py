from __future__ import annotations

import uuid
from decimal import Decimal

from app.extensions import db
from app.models.user import TimestampMixin

BUDGET_PERIODS = ("month", "week", "year")


class Budget(TimestampMixin, db.Model):
    """Бюджет: лимит расходов на период.

    `account_id = NULL` — личный бюджет «по всем счетам» пользователя.
    `account_id` задан — бюджет конкретного (в т.ч. общего) счёта,
    виден всем участникам счёта.
    """

    __tablename__ = "budgets"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False, index=True)
    account_id = db.Column(db.Uuid, db.ForeignKey("accounts.id"), nullable=True, index=True)
    name = db.Column(db.String(80), nullable=False)
    amount = db.Column(db.Numeric(14, 2), nullable=False)  # лимит на период
    period = db.Column(db.String(10), default="month", nullable=False)
    category = db.Column(db.String(40), nullable=True)  # NULL = по всем категориям
    currency = db.Column(db.String(3), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    user = db.relationship("User", backref=db.backref("budgets", lazy="dynamic"))
    account = db.relationship("Account", backref=db.backref("budgets", lazy="dynamic"))

    def __repr__(self) -> str:
        return f"<Budget {self.name!r}:{self.amount}>"