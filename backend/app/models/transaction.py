from __future__ import annotations

import uuid

from app.extensions import db
from app.models.user import TimestampMixin

TRANSACTION_TYPES = ("income", "expense", "transfer")

# Категории операций (хранятся как коды, переводятся на фронте через i18n)
INCOME_CATEGORIES = ("salary", "freelance", "gift", "other")
EXPENSE_CATEGORIES = ("food", "transport", "shopping", "entertainment", "home", "other")
ALL_CATEGORIES = tuple(dict.fromkeys(INCOME_CATEGORIES + EXPENSE_CATEGORIES))  # noqa: RUF022


class Transaction(TimestampMixin, db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.String(10), nullable=False)  # income | expense | transfer
    # income/expense: сам счёт; transfer: счёт-источник
    account_id = db.Column(
        db.Uuid, db.ForeignKey("accounts.id"), nullable=False, index=True
    )
    # transfer: счёт-получатель
    to_account_id = db.Column(db.Uuid, db.ForeignKey("accounts.id"), nullable=True)
    title = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(40), default="other", nullable=False)
    # Пользовательская категория (название/цвет/иконка). Код категории
    # сохраняется в `category` (имя для кастомных, код для встроенных).
    category_id = db.Column(db.Uuid, db.ForeignKey("categories.id"), nullable=True)
    category_obj = db.relationship("Category", foreign_keys=[category_id])
    amount = db.Column(db.Numeric(14, 2), nullable=False)  # всегда положительная
    currency = db.Column(db.String(3), nullable=False)
    date = db.Column(db.Date, nullable=False, index=True)

    account = db.relationship("Account", foreign_keys=[account_id])
    to_account = db.relationship("Account", foreign_keys=[to_account_id])

    def __repr__(self) -> str:
        return f"<Transaction {self.type}:{self.amount}>"