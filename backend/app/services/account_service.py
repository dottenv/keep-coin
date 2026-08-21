from decimal import Decimal
import uuid

from sqlalchemy import select

from app.errors import ApiError
from app.extensions import db
from app.models import (
    Account,
    AccountInvite,
    AccountMember,
    AccountOrder,
    Budget,
    FamilyMember,
    SavingsGoal,
    Transaction,
    User,
)
from app.models.account import MAX_ACCOUNTS_PER_USER
from app.services.access_service import account_role, require_role


class AccountService:
    @staticmethod
    def list(user_id) -> list[Account]:
        """Свои + общие счёта, отсортированные по персональному порядку юзера.
        На объекты вешаются `_role`, `_is_shared`, `_owner_name`."""
        from sqlalchemy import func

        member_ids = select(AccountMember.account_id).where(
            AccountMember.user_id == user_id
        )
        accounts = (
            Account.query.outerjoin(
                AccountOrder,
                (AccountOrder.account_id == Account.id) & (AccountOrder.user_id == user_id),
            )
            .filter(
                (Account.user_id == user_id) | (Account.id.in_(member_ids))
            )
            .order_by(func.coalesce(AccountOrder.position, 1_000_000), Account.created_at.asc())
            .all()
        )

        shared_ids = [a.id for a in accounts if a.user_id != user_id]
        owners = {}
        if shared_ids:
            owner_rows = User.query.filter(
                User.id.in_({a.user_id for a in accounts})
            ).all()
            owners = {u.id: u.display_name for u in owner_rows}
        member_roles = {
            m.account_id: m.role
            for m in AccountMember.query.filter(
                AccountMember.user_id == user_id,
                AccountMember.account_id.in_(shared_ids),
            ).all()
        }

        for acc in accounts:
            if acc.user_id == user_id:
                acc._role = "owner"
                acc._is_shared = False
                acc._owner_name = None
            else:
                acc._role = member_roles.get(acc.id, "viewer")
                acc._is_shared = True
                acc._owner_name = owners.get(acc.user_id)
        return accounts

    @staticmethod
    def reorder(user_id, account_ids: list[str]) -> None:
        """Сохраняет персональный порядок счетов для пользователя.

        Принимает полный упорядоченный список id счетов, видимых пользователю.
        Игнорируются счета, к которым у пользователя нет доступа.
        """
        accessible: set[uuid.UUID] = set()
        for raw in account_ids:
            try:
                aid = uuid.UUID(str(raw))
            except (ValueError, AttributeError):
                continue
            if account_role(user_id, aid) is not None:
                accessible.add(aid)

        for index, raw in enumerate(account_ids):
            try:
                aid = uuid.UUID(str(raw))
            except (ValueError, AttributeError):
                continue
            if aid not in accessible:
                continue
            row = db.session.get(AccountOrder, (user_id, aid))
            if row is None:
                db.session.add(AccountOrder(user_id=user_id, account_id=aid, position=index))
            else:
                row.position = index
        db.session.commit()

    @staticmethod
    def get_accessible(user_id, account_id) -> Account:
        """Счёт, к которому пользователь имеет доступ (владелец или участник)."""
        account = db.session.get(Account, account_id)
        if account is None:
            raise ApiError("account_not_found", 404)
        role = account_role(user_id, account_id)
        if role is None:
            raise ApiError("account_not_found", 404)
        return account

    @staticmethod
    def create(
        user_id,
        name: str,
        account_type: str,
        balance: Decimal,
        currency: str,
    ) -> Account:
        count = Account.query.filter_by(user_id=user_id).count()
        if count >= MAX_ACCOUNTS_PER_USER:
            raise ApiError("account_limit_reached", 400)

        account = Account(
            user_id=user_id,
            name=name.strip(),
            type=account_type,
            balance=balance,
            currency=currency,
        )
        db.session.add(account)
        db.session.flush()  # нужен id для авто-шаринга семье

        # Семейный доступ: новый счёт сразу открывается всем участникам семьи.
        family = FamilyMember.query.filter_by(owner_id=user_id).all()
        for fm in family:
            db.session.add(
                AccountMember(
                    account_id=account.id,
                    user_id=fm.member_id,
                    role=fm.role,
                    invited_by=user_id,
                )
            )
        db.session.commit()
        return account

    @staticmethod
    def update(user_id, account_id, data: dict) -> Account:
        account = AccountService.get_accessible(user_id, account_id)
        if account_role(user_id, account_id) != "owner":
            raise ApiError("permission_denied", 403)
        if "name" in data and data["name"] is not None:
            account.name = data["name"].strip()
        if "type" in data and data["type"] is not None:
            account.type = data["type"]
        db.session.commit()
        return account

    @staticmethod
    def delete(user_id, account_id) -> None:
        account = AccountService.get_accessible(user_id, account_id)
        require_role(user_id, account_id, "owner")
        # Удаляем связанные операции (как источник, так и получателя перевода),
        # чтобы не терять баланс смежных счетов в неопределённом состоянии.
        Transaction.query.filter(
            (Transaction.account_id == account.id)
            | (Transaction.to_account_id == account.id)
        ).delete(synchronize_session=False)
        AccountMember.query.filter_by(account_id=account.id).delete(
            synchronize_session=False
        )
        AccountInvite.query.filter_by(account_id=account.id).delete(
            synchronize_session=False
        )
        Budget.query.filter_by(account_id=account.id).delete(synchronize_session=False)
        SavingsGoal.query.filter_by(account_id=account.id).delete(synchronize_session=False)
        db.session.delete(account)
        db.session.commit()
