from datetime import datetime, timezone

from sqlalchemy import or_

from app.extensions import db
from app.models import (
    Account,
    AccountInvite,
    AccountMember,
    Budget,
    Category,
    RecurringPhrase,
    SavingsGoal,
    Transaction,
    User,
)


class SettingsService:
    """Настройки и «опасная зона»: сброс ключевых слов и полное удаление данных."""

    @staticmethod
    def keywords(user_id) -> list[str]:
        return [
            p.phrase
            for p in RecurringPhrase.query.filter_by(user_id=user_id)
            .order_by(RecurringPhrase.created_at.asc())
            .all()
        ]

    @staticmethod
    def reset_keywords(user_id) -> None:
        """Очищает запомненные фразы и «обнуляет» окно детекции.

        После сброса детект стартует с текущей даты: история до сброса
        не считается (keywords_reset_at), а таблица фраз пуста.
        """
        RecurringPhrase.query.filter_by(user_id=user_id).delete()
        user = db.session.get(User, user_id)
        user.keywords_reset_at = datetime.now(timezone.utc)
        db.session.commit()

    @staticmethod
    def wipe_all(user_id) -> None:
        """«Начать с нуля»: удаляет все операции, счета, категории и ключевые слова.

        Аккаунт пользователя (email/пароль) сохраняется. Общие счета:
        свои счета удаляются вместе с участниками/инвайтами, чужие — остаются,
        но пользователь снимается с них и чистит созданные им приглашения.
        """
        user = db.session.get(User, user_id)
        Transaction.query.filter_by(user_id=user_id).delete(synchronize_session=False)

        # Свои бюджеты и цели накоплений.
        Budget.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        SavingsGoal.query.filter_by(user_id=user_id).delete(synchronize_session=False)

        # Мои счета (и всё, что с ними связано).
        owned_ids = [
            row[0]
            for row in db.session.query(Account.id).filter_by(user_id=user_id).all()
        ]
        if owned_ids:
            AccountInvite.query.filter(
                AccountInvite.account_id.in_(owned_ids)
            ).delete(synchronize_session=False)
            AccountMember.query.filter(
                AccountMember.account_id.in_(owned_ids)
            ).delete(synchronize_session=False)
        Account.query.filter_by(user_id=user_id).delete(synchronize_session=False)

        # Чужие общие счета: снимаем своё членство и свои приглашения.
        AccountMember.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        if user is not None:
            AccountInvite.query.filter(
                or_(
                    AccountInvite.created_by == user_id,
                    AccountInvite.email == user.email,
                )
            ).delete(synchronize_session=False)

        Category.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        RecurringPhrase.query.filter_by(user_id=user_id).delete(synchronize_session=False)
        user.keywords_reset_at = datetime.now(timezone.utc)
        db.session.commit()