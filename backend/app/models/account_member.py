from __future__ import annotations

from app.extensions import db
from app.models.user import TimestampMixin

MEMBER_ROLES = ("owner", "editor", "viewer")


class AccountMember(TimestampMixin, db.Model):
    """Доступ пользователя к общему счёту.

    Владелец хранится в `Account.user_id` и отдельной строки здесь не имеет.
    Строки есть только у остальных участников.
    """

    __tablename__ = "account_members"

    account_id = db.Column(db.Uuid, db.ForeignKey("accounts.id"), primary_key=True)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), primary_key=True)
    role = db.Column(db.String(10), nullable=False, default="editor")
    invited_by = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False)

    account = db.relationship("Account", backref=db.backref("members", lazy="dynamic"))
    user = db.relationship("User", foreign_keys=[user_id])
    inviter = db.relationship("User", foreign_keys=[invited_by])

    def __repr__(self) -> str:
        return f"<AccountMember {self.account_id}:{self.user_id} ({self.role})>"
