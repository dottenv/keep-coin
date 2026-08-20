from __future__ import annotations

import uuid
from datetime import datetime

from app.extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )


class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    email = db.Column(db.String(255), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    display_name = db.Column(db.String(120), nullable=False)
    locale = db.Column(db.String(5), default="ru", nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    # Момент последнего сброса «ключевых слов» для повторяющихся платежей:
    # после сброса детект стартует заново и не учитывает историю до этого момента.
    keywords_reset_at = db.Column(db.DateTime, nullable=True)

    def __repr__(self) -> str:
        return f"<User {self.email!r}>"