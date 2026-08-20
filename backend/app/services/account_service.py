from decimal import Decimal

from sqlalchemy import select

from app.errors import ApiError
from app.extensions import db
from app.models import (
    Account,
    AccountInvite,
    AccountMember,
    Budget,
    SavingsGoal,
    Transaction,
    User,
)
from app.models.account import MAX_ACCOUNTS_PER_USER
from app.services.access_service import account_role, require_role


class AccountService:
    @staticmethod
    def list(user_id) -> list[Account]:
        """Свои + общие счёта. На объекты вешаются `_role`, `_is_shared`, `_owner_name`."""
        member_ids = select(AccountMember.account_id).where(
            AccountMember.user_id == user_id
        )
        accounts = (
            Account.query.filter(
                (Account.user_id == user_id) | (Account.id.in_(member_ids))
            )
            .order_by(Account.created_at.asc())
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
