from datetime import datetime

from app.errors import ApiError
from app.extensions import db
from app.models import Account, AccountInvite, AccountMember, FamilyMember, User
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
                    "scope": inv.scope,
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

        # Семейное приглашение: доступ ко всем счетам владельца.
        if invite.scope == "family":
            SharingService._accept_family(invite, user)
            return invite

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
    def _accept_family(invite: AccountInvite, user: User) -> None:
        owner_id = invite.created_by
        member_id = user.id
        existing = FamilyMember.query.filter_by(
            owner_id=owner_id, member_id=member_id
        ).first()
        if existing is None:
            db.session.add(
                FamilyMember(
                    owner_id=owner_id,
                    member_id=member_id,
                    role=invite.role,
                    invited_by=invite.created_by,
                )
            )
            # Все текущие счета владельца сразу становятся общими.
            SharingService._share_owner_accounts(owner_id, member_id, invite.role)
        invite.status = "accepted"
        invite.accepted_by = member_id
        invite.accepted_at = datetime.utcnow()
        db.session.commit()

    @staticmethod
    def _share_owner_accounts(owner_id, member_id, role: str) -> None:
        """Добавляет участника во все счета владельца (семейный доступ)."""
        owned = Account.query.filter_by(user_id=owner_id).all()
        for acc in owned:
            if AccountMember.query.filter_by(
                account_id=acc.id, user_id=member_id
            ).first():
                continue
            db.session.add(
                AccountMember(
                    account_id=acc.id,
                    user_id=member_id,
                    role=role,
                    invited_by=owner_id,
                )
            )

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

    # ───────────────────────── Семейный доступ ─────────────────────────

    @staticmethod
    def family_invite(user_id, email: str, role: str) -> AccountInvite:
        """Пригласить пользователя в семью (доступ ко всем счетам)."""
        email = email.strip().lower()
        inviter = db.session.get(User, user_id)
        if email == inviter.email:
            raise ApiError("cannot_invite_self", 400)

        target = User.query.filter_by(email=email).first()
        if target and FamilyMember.query.filter_by(
            owner_id=user_id, member_id=target.id
        ).first():
            raise ApiError("already_member", 400)
        if AccountInvite.query.filter_by(
            created_by=user_id, email=email, status="pending", scope="family"
        ).first():
            raise ApiError("already_invited", 400)

        invite = AccountInvite(
            account_id=None,
            scope="family",
            email=email,
            role=role,
            status="pending",
            created_by=user_id,
        )
        db.session.add(invite)
        db.session.commit()
        return invite

    @staticmethod
    def family_members(user_id) -> list[dict]:
        """Участники семьи: кому вы открыли доступ + кто открыл вам."""
        rows: list[dict] = []

        shared_by_me = (
            FamilyMember.query.filter_by(owner_id=user_id)
            .order_by(FamilyMember.created_at.asc())
            .all()
        )
        for fm in shared_by_me:
            if fm.member is None:
                continue
            rows.append(
                {
                    "user_id": fm.member_id,
                    "display_name": fm.member.display_name,
                    "email": fm.member.email,
                    "role": fm.role,
                    "is_owner": False,
                    "relation": "owner",  # вы делитесь с ним
                }
            )

        shared_with_me = (
            FamilyMember.query.filter_by(member_id=user_id)
            .order_by(FamilyMember.created_at.asc())
            .all()
        )
        for fm in shared_with_me:
            if fm.owner is None:
                continue
            rows.append(
                {
                    "user_id": fm.owner_id,
                    "display_name": fm.owner.display_name,
                    "email": fm.owner.email,
                    "role": fm.role,
                    "is_owner": False,
                    "relation": "member",  # вам открыли доступ
                }
            )
        return rows

    @staticmethod
    def family_update_role(user_id, member_user_id, role: str) -> None:
        """Сменить роль участника, которому вы открыли доступ."""
        fm = FamilyMember.query.filter_by(
            owner_id=user_id, member_id=member_user_id
        ).first()
        if fm is None:
            raise ApiError("member_not_found", 404)
        fm.role = role
        # Синхронизируем роль во всех счетах владельца.
        SharingService._sync_member_role(user_id, member_user_id, role)
        db.session.commit()

    @staticmethod
    def _sync_member_role(owner_id, member_id, role: str) -> None:
        AccountMember.query.filter_by(
            user_id=member_id, invited_by=owner_id
        ).update({AccountMember.role: role}, synchronize_session=False)

    @staticmethod
    def family_remove(user_id, member_user_id) -> None:
        """Удалить участника из семьи (обоюдно).

        user_id может быть владельцем (убирает участника) или самим участником
        (покидает чужую семью). Убираем и строки доступа к счетам.
        """
        fm = FamilyMember.query.filter(
            (FamilyMember.owner_id == user_id) & (FamilyMember.member_id == member_user_id)
        ).first()
        if fm is None:
            # Возможно, user_id — участник, выходит из семьи owner=member_user_id.
            fm = FamilyMember.query.filter(
                (FamilyMember.owner_id == member_user_id)
                & (FamilyMember.member_id == user_id)
            ).first()
        if fm is None:
            raise ApiError("member_not_found", 404)

        owner_id = fm.owner_id
        member_id = fm.member_id
        db.session.delete(fm)
        # Снимаем доступ ко всем счетам владельца.
        owned_ids = [r[0] for r in db.session.query(Account.id).filter_by(user_id=owner_id).all()]
        if owned_ids:
            AccountMember.query.filter(
                AccountMember.account_id.in_(owned_ids),
                AccountMember.user_id == member_id,
            ).delete(synchronize_session=False)
        db.session.commit()
