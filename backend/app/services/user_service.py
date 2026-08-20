from werkzeug.security import check_password_hash, generate_password_hash

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
        from app.extensions import db

        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def authenticate(email: str, password: str) -> User | None:
        user = User.query.filter_by(
            email=email.strip().lower(), is_active=True
        ).first()
        if user and check_password_hash(user.password_hash, password):
            return user
        return None