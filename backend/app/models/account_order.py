from __future__ import annotations

from app.extensions import db


class AccountOrder(db.Model):
    """Персональный порядок счетов для каждого пользователя.

    Владелец и участники общих счетов видят один и тот же набор счетов,
    но могут упорядочить его по-своему. Строка существует отдельно
    для каждой пары (пользователь, счёт).
    """

    __tablename__ = "account_order"

    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), primary_key=True)
    account_id = db.Column(db.Uuid, db.ForeignKey("accounts.id"), primary_key=True)
    position = db.Column(db.Integer, nullable=False, default=0)

    def __repr__(self) -> str:
        return f"<AccountOrder {self.user_id}:{self.account_id} = {self.position}>"
