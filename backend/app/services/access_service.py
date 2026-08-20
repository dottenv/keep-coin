from app.errors import ApiError
from app.extensions import db
from app.models import Account, AccountMember


def account_role(user_id, account_id) -> str | None:
    """Роль пользователя в счёте: owner | editor | viewer | None (нет доступа)."""
    if account_id is None:
        return None
    account = db.session.get(Account, account_id)
    if account is None:
        return None
    if account.user_id == user_id:
        return "owner"
    member = AccountMember.query.filter_by(
        account_id=account_id, user_id=user_id
    ).first()
    return member.role if member else None


def accessible_account_ids(user_id) -> set:
    """id счетов, которые пользователь может видеть (свои + общие)."""
    owned = {
        row[0]
        for row in db.session.query(Account.id).filter_by(user_id=user_id).all()
    }
    member = {
        row[0]
        for row in db.session.query(AccountMember.account_id)
        .filter_by(user_id=user_id)
        .all()
    }
    return owned | member


def require_role(user_id, account_id, *roles: str) -> str:
    """Требует у пользователя одну из ролей в счёте.

    Нет доступа вовсе → 404 (не раскрываем существование счёта),
    роль слабее требуемой → 403.
    """
    role = account_role(user_id, account_id)
    if role is None:
        raise ApiError("account_not_found", 404)
    if role not in roles:
        raise ApiError("permission_denied", 403)
    return role


def can_edit(user_id, account_id) -> bool:
    return account_role(user_id, account_id) in ("owner", "editor")
