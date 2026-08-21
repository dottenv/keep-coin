from __future__ import annotations

import uuid

from app.extensions import db
from app.models.user import TimestampMixin

FAMILY_ROLES = ("owner", "editor", "viewer")


class FamilyMember(TimestampMixin, db.Model):
    """Участник «семьи»: доступ ко всем счетам владельца (пригласившего).

    Семейный доступ заменяет шаринг по отдельным счетам. Приняв приглашение,
    участник видит ВСЕ счета владельца (и будущие — они добавляются автоматом
    в `AccountService.create`). Строка описывает отношение одного пользователя
    к данным другого: `owner_id` делится, `member_id` получает доступ.
    """

    __tablename__ = "family_members"

    owner_id = db.Column(db.Uuid, db.ForeignKey("users.id"), primary_key=True)
    member_id = db.Column(db.Uuid, db.ForeignKey("users.id"), primary_key=True)
    role = db.Column(db.String(10), nullable=False, default="editor")
    invited_by = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False)

    owner = db.relationship("User", foreign_keys=[owner_id])
    member = db.relationship("User", foreign_keys=[member_id])
    inviter = db.relationship("User", foreign_keys=[invited_by])

    def __repr__(self) -> str:
        return f"<FamilyMember {self.owner_id}:{self.member_id} ({self.role})>"
