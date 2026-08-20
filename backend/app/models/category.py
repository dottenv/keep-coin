from __future__ import annotations

import uuid

from app.extensions import db
from app.models.user import TimestampMixin

CATEGORY_KINDS = ("income", "expense")

# Палитра для автоподбора цвета категории
CATEGORY_COLORS = (
    "#10b981",
    "#f59e0b",
    "#3b82f6",
    "#ef4444",
    "#8b5cf6",
    "#14b8a6",
    "#f97316",
    "#6366f1",
    "#e11d48",
    "#22c55e",
)

CATEGORY_ICONS = (
    "shopping-bag",
    "cart",
    "car",
    "bus",
    "home",
    "gamepad",
    "heart",
    "star",
    "gift",
    "coffee",
    "tag",
    "zap",
)


class Category(TimestampMixin, db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(40), nullable=False)
    kind = db.Column(db.String(10), nullable=False)  # income | expense
    color = db.Column(db.String(7), nullable=False)
    icon = db.Column(db.String(40), nullable=False)

    def __repr__(self) -> str:
        return f"<Category {self.name!r}>"