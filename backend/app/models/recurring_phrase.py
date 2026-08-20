from __future__ import annotations

import uuid

from app.extensions import db
from app.models.user import TimestampMixin


class RecurringPhrase(TimestampMixin, db.Model):
    """Заученная «ключевая фраза» для повторяющихся платежей.

    Детектор запоминает фразы (нормализованные названия), которые встречаются
    в двух и более разных месяцах. Сброс ключевых слов очищает эту таблицу —
    детект начнётся заново.
    """

    __tablename__ = "recurring_phrases"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False, index=True)
    phrase = db.Column(db.String(120), nullable=False)
    __table_args__ = (db.UniqueConstraint("user_id", "phrase", name="uq_recurring_phrase"),)

    def __repr__(self) -> str:
        return f"<RecurringPhrase {self.phrase!r}>"