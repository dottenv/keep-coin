from __future__ import annotations

import uuid

from app.extensions import db
from app.models.user import TimestampMixin


def normalize_keyword(text: str) -> str:
    """Нормализация названия операции в ключевое слово для автокатегорий."""
    return (text or "").strip().casefold()


class CategoryKeyword(TimestampMixin, db.Model):
    """Запомненное сопоставление «ключевое слово → категория».

    Обучается на операциях пользователя: когда он сохраняет операцию с
    названием и категорией, пара (нормализованное название → category_id)
    запоминается. При наборе новой операции подсказываем категорию по совпадению.
    """

    __tablename__ = "category_keywords"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False, index=True)
    keyword = db.Column(db.String(120), nullable=False)
    category_id = db.Column(
        db.Uuid, db.ForeignKey("categories.id"), nullable=False, index=True
    )
    __table_args__ = (
        db.UniqueConstraint("user_id", "keyword", name="uq_category_keyword"),
    )

    category = db.relationship("Category")

    def __repr__(self) -> str:
        return f"<CategoryKeyword {self.keyword!r} → {self.category_id}>"
