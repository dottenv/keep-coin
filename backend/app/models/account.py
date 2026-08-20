from __future__ import annotations

import uuid
from decimal import Decimal

from app.extensions import db
from app.models.user import TimestampMixin

ACCOUNT_TYPES = ("cash", "card", "wallet", "saving")
MAX_ACCOUNTS_PER_USER = 4
DEFAULT_CURRENCY = "RUB"


class Account(TimestampMixin, db.Model):
    __tablename__ = "accounts"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(80), nullable=False)
    type = db.Column(db.String(20), default="cash", nullable=False)
    balance = db.Column(db.Numeric(14, 2), default=Decimal("0"), nullable=False)
    currency = db.Column(db.String(3), default=DEFAULT_CURRENCY, nullable=False)

    user = db.relationship("User", backref=db.backref("accounts", lazy="dynamic"))

    def __repr__(self) -> str:
        return f"<Account {self.name!r}>"