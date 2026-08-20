from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta

from app.extensions import db
from app.models.user import TimestampMixin

INVITE_STATUSES = ("pending", "accepted", "revoked")
INVITE_TTL_DAYS = 7


def _default_token() -> str:
    return secrets.token_urlsafe(24)


def _default_expires_at():
    return datetime.utcnow() + timedelta(days=INVITE_TTL_DAYS)


class AccountInvite(TimestampMixin, db.Model):
    """Приглашение поделиться счётом по email.

    Ожидает действия получателя (`pending`), затем становится `accepted`
    (создаётся строка `AccountMember`) или `revoked` (отклонено/отозвано).
    Если у получателя ещё нет аккаунта — приглашение ждёт его регистрации
    (email совпадает при `GET /api/invites`).
    """

    __tablename__ = "account_invites"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    account_id = db.Column(
        db.Uuid, db.ForeignKey("accounts.id"), nullable=False, index=True
    )
    email = db.Column(db.String(255), nullable=False, index=True)
    role = db.Column(db.String(10), nullable=False, default="editor")
    token = db.Column(db.String(64), unique=True, nullable=False, default=_default_token)
    status = db.Column(db.String(10), nullable=False, default="pending")
    created_by = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False, default=_default_expires_at)
    accepted_by = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=True)
    accepted_at = db.Column(db.DateTime, nullable=True)

    account = db.relationship("Account", foreign_keys=[account_id])
    inviter = db.relationship("User", foreign_keys=[created_by])

    def __repr__(self) -> str:
        return f"<AccountInvite {self.email} → {self.account_id} ({self.status})>"
