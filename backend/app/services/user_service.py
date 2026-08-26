from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.models import User


class UserService:
    @staticmethod
    def create(email: str, password: str, display_name: str, locale: str) -> User:
        user = User(
            email=email.strip().lower(),
            password_hash=generate_password_hash(password),
            display_name=display_name.strip(),
            locale=locale,
        )
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def authenticate(email: str, password: str) -> User | None:
        user = User.query.filter_by(
            email=email.strip().lower(), is_active=True
        ).first()
        if user and user.password_hash and check_password_hash(user.password_hash, password):
            return user
        return None

    @staticmethod
    def get_by_telegram_id(telegram_id: str) -> User | None:
        if not telegram_id:
            return None
        return User.query.filter_by(telegram_id=str(telegram_id)).first()

    @staticmethod
    def get_by_link_token(link_token: str) -> User | None:
        if not link_token:
            return None
        return User.query.filter_by(telegram_link_token=link_token).first()

    @staticmethod
    def create_from_telegram(
        telegram_data: dict,
        email: str,
        password: str,
        display_name: str,
        locale: str,
    ) -> User:
        user = User(
            email=email.strip().lower(),
            password_hash=generate_password_hash(password),
            display_name=display_name.strip(),
            locale=locale,
        )
        UserService._apply_telegram_data(user, telegram_data)
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def link_telegram(user: User, telegram_data: dict) -> User:
        UserService._apply_telegram_data(user, telegram_data)
        user.telegram_link_token = None
        user.telegram_link_token_expires = None
        db.session.commit()
        return user

    @staticmethod
    def _apply_telegram_data(user: User, telegram_data: dict) -> None:
        user.telegram_id = str(telegram_data.get("id"))
        user.telegram_username = (telegram_data.get("username") or None)
        user.telegram_first_name = (telegram_data.get("first_name") or None)
        user.telegram_last_name = (telegram_data.get("last_name") or None)
        user.telegram_photo_url = (telegram_data.get("photo_url") or None)

    @staticmethod
    def set_link_token(user: User, ttl_seconds: int) -> str:
        token = token_urlsafe(32)
        user.telegram_link_token = token
        user.telegram_link_token_expires = (
            datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(seconds=ttl_seconds)
        )
        db.session.commit()
        return token

    @staticmethod
    def clear_link_token(user: User) -> None:
        user.telegram_link_token = None
        user.telegram_link_token_expires = None
        db.session.commit()