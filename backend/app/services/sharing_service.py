from datetime import datetime

from app.errors import ApiError
from app.extensions import db
from app.models import AccountInvite, AccountMember, User
from app.services.account_service import AccountService
from app.services.access_service import account_role


class SharingService:
    """Участники общих счетов и приглашения по email."""

    @staticmethod
    def members(user_id, account_id) -> list[dict]:
        """Список участников (владелец + остальные) для счёта с доступом."""
        account = AccountService.get_accessible(user_id, account_id)
        rows = [
            {
                "user_id": account.user_id,
                "display_name": account.user.display_name,
                "email": account.user.email,
                "role": "owner",
                "is_owner": True,
            }
        ]
        members = (
            AccountMember.query.filter_by(account_id=account.id)
            .order_by(AccountMember.created_at.asc())
            .all()
        )
        for m in members:
            if m.user is None:
                continue
            rows.append(
                {
                    "user_id": m.user_id,
                    "display_name": m.user.display_name,
                    "email": m.user.email,
                    "role": m.role,
                    "is_owner": False,
                }
            )
        return rows

    @staticmethod
    def invite(user_id, account_id, email: str, role: str) -> AccountInvite:
        account = AccountService.get_accessible(user_id, account_id)
        if account_role(user_id, account_id) != "owner":
            raise ApiError("permission_denied", 403)

        email = email.strip().lower()
        inviter = db.session.get(User, user_id)
        if email == inviter.email:
            raise ApiError("cannot_invite_self", 400)

        target = User.query.filter_by(email=email).first()
        if target and AccountMember.query.filter_by(
            account_id=account.id, user_id=target.id
        ).first():
            raise ApiError("already_member", 400)
        if AccountInvite.query.filter_by(
            account_id=account.id, email=email, status="pending"
        ).first():
            raise ApiError("already_invited", 400)

        invite = AccountInvite(
            account_id=account.id,
            email=email,
            role=role,
            status="pending",
            created_by=user_id,
        )
        db.session.add(invite)
        db.session.commit()
        return invite

    @staticmethod
    def pending_invites(user_id) -> list[dict]:
        """Ожидающие приглашения для пользователя (по его email)."""
        user = db.session.get(User, user_id)
        now = datetime.utcnow()
        invites = (
            AccountInvite.query.filter_by(email=user.email, status="pending")
            .order_by(AccountInvite.created_at.desc())
            .all()
        )
        result = []
        for inv in invites:
            if inv.expires_at and inv.expires_at <= now:
                continue
            result.append(
                {
                    "id": inv.id,
                    "account_id": inv.account_id,
                    "account_name": inv.account.name if inv.account else "",
                    "inviter_name": (
                        inv.inviter.display_name if inv.inviter else ""
                    ),
                    "role": inv.role,
                    "created_at": inv.created_at,
                }
            )
        return result

    @staticmethod
    def accept(user_id, invite_id) -> AccountInvite:
        user = db.session.get(User, user_id)
        invite = db.session.get(AccountInvite, invite_id)
        if (
            invite is None
            or invite.email != user.email
            or invite.status != "pending"
            or (invite.expires_at and invite.expires_at <= datetime.utcnow())
        ):
            raise ApiError("invite_not_found", 404)

        existing = AccountMember.query.filter_by(
            account_id=invite.account_id, user_id=user.id
        ).first()
        if existing is None:
            member = AccountMember(
                account_id=invite.account_id,
                user_id=user.id,
                role=invite.role,
                invited_by=invite.created_by,
            )
            db.session.add(member)
        invite.status = "accepted"
        invite.accepted_by = user.id
        invite.accepted_at = datetime.utcnow()
        db.session.commit()
        return invite

    @staticmethod
    def decline(user_id, invite_id) -> None:
        """Отклонить приглашение получателем."""
        user = db.session.get(User, user_id)
        invite = db.session.get(AccountInvite, invite_id)
        if (
            invite is None
            or invite.email != user.email
            or invite.status != "pending"
        ):
            raise ApiError("invite_not_found", 404)
        invite.status = "revoked"
        db.session.commit()

    @staticmethod
    def revoke(user_id, invite_id) -> None:
        """Отзыв приглашения владельцем (через DELETE /invites/:id)."""
        invite = db.session.get(AccountInvite, invite_id)
        if invite is None or invite.status != "pending":
            raise ApiError("invite_not_found", 404)
        if invite.created_by != user_id:
            raise ApiError("invite_not_found", 404)
        invite.status = "revoked"
        db.session.commit()

    @staticmethod
    def update_role(user_id, account_id, member_user_id, role: str) -> None:
        account = AccountService.get_accessible(user_id, account_id)
        if account_role(user_id, account_id) != "owner":
            raise ApiError("permission_denied", 403)
        if member_user_id == account.user_id:
            raise ApiError("cannot_change_owner", 400)
        member = AccountMember.query.filter_by(
            account_id=account.id, user_id=member_user_id
        ).first()
        if member is None:
            raise ApiError("member_not_found", 404)
        member.role = role
        db.session.commit()

    @staticmethod
    def remove(user_id, account_id, member_user_id) -> None:
        account = AccountService.get_accessible(user_id, account_id)
        if account_role(user_id, account_id) != "owner":
            raise ApiError("permission_denied", 403)
        if member_user_id == account.user_id:
            raise ApiError("cannot_remove_owner", 400)
        member = AccountMember.query.filter_by(
            account_id=account.id, user_id=member_user_id
        ).first()
        if member is None:
            raise ApiError("member_not_found", 404)
        db.session.delete(member)
        db.session.commit()

    @staticmethod
    def decline_or_revoke(user_id, invite_id) -> None:
        """Получатель отклоняет приглашение или владелец отзывает его."""
        user = db.session.get(User, user_id)
        invite = db.session.get(AccountInvite, invite_id)
        if invite is None or invite.status != "pending":
            raise ApiError("invite_not_found", 404)
        if invite.email == user.email or invite.created_by == user.id:
            invite.status = "revoked"
            db.session.commit()
            return
        raise ApiError("invite_not_found", 404)
