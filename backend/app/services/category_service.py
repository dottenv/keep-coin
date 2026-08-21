from __future__ import annotations

from app.errors import ApiError
from app.extensions import db
from app.models import Category
from app.models.category import CATEGORY_COLORS, CATEGORY_ICONS


class CategoryService:
    @staticmethod
    def list(user_id) -> list[Category]:
        return (
            Category.query.filter_by(user_id=user_id)
            .order_by(Category.created_at.asc())
            .all()
        )

    @staticmethod
    def get_for_user(user_id, category_id) -> Category:
        category = db.session.get(Category, category_id)
        if category is None or category.user_id != user_id:
            raise ApiError("category_not_found", 404)
        return category

    @staticmethod
    def create(user_id, name: str, kind: str, color: str | None, icon: str) -> Category:
        if not color:
            count = Category.query.filter_by(user_id=user_id).count()
            color = CATEGORY_COLORS[count % len(CATEGORY_COLORS)]
        if not icon or icon not in CATEGORY_ICONS:
            icon = "tag"

        category = Category(
            user_id=user_id,
            name=name.strip(),
            kind=kind,
            color=color,
            icon=icon,
        )
        db.session.add(category)
        db.session.commit()
        return category

    @staticmethod
    def update(user_id, category_id, data: dict) -> Category:
        category = CategoryService.get_for_user(user_id, category_id)
        if data.get("name"):
            category.name = data["name"].strip()
        if data.get("kind"):
            category.kind = data["kind"]
        if data.get("color"):
            category.color = data["color"]
        if data.get("icon") and data["icon"] in CATEGORY_ICONS:
            category.icon = data["icon"]
        db.session.commit()
        return category

    @staticmethod
    def delete(user_id, category_id) -> None:
        category = CategoryService.get_for_user(user_id, category_id)
        db.session.delete(category)
        db.session.commit()