from __future__ import annotations

import uuid
from decimal import Decimal

from app.extensions import db
from app.models.user import TimestampMixin


class SavingsGoal(TimestampMixin, db.Model):
    """Цель накоплений: сумма, которую планируем отложить.

    `account_id` — счёт, где копятся деньги (опционально). Если задан общий
    счёт — прогресс цели виден и другим участникам. Никто, кроме владельца,
    редактировать цель не может.
    """

    __tablename__ = "savings_goals"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False, index=True)
    account_id = db.Column(db.Uuid, db.ForeignKey("accounts.id"), nullable=True, index=True)
    name = db.Column(db.String(80), nullable=False)
    target_amount = db.Column(db.Numeric(14, 2), nullable=False)
    saved_amount = db.Column(db.Numeric(14, 2), default=Decimal("0"), nullable=False)
    deadline = db.Column(db.Date, nullable=True)
    # Желаемый ежемесячный взнос. Если не задан, но есть срок — считается
    # автоматически как (цель − накоплено) / месяцев до срока.
    monthly_contribution = db.Column(db.Numeric(14, 2), nullable=True)
    currency = db.Column(db.String(3), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    user = db.relationship("User", backref=db.backref("goals", lazy="dynamic"))
    account = db.relationship("Account", backref=db.backref("goals", lazy="dynamic"))

    def __repr__(self) -> str:
        return f"<SavingsGoal {self.name!r}:{self.target_amount}>"