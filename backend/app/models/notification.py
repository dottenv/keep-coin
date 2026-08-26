from __future__ import annotations

import uuid
from datetime import datetime

from app.extensions import db
from app.models.user import TimestampMixin

RECURRENCES = ("none", "daily", "weekly", "monthly", "quarterly", "yearly")
REMINDER_TYPES = ("generic", "budget", "goal", "credit")


class PushSubscription(TimestampMixin, db.Model):
    """Подписка браузера на WebPush (endpoint + ключи)."""

    __tablename__ = "push_subscriptions"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False, index=True)
    endpoint = db.Column(db.String(512), nullable=False, unique=True)
    p256dh = db.Column(db.String(256), nullable=False)
    auth = db.Column(db.String(128), nullable=False)

    user = db.relationship("User", backref=db.backref("push_subscriptions", lazy="dynamic"))


class Reminder(TimestampMixin, db.Model):
    """Напоминание пользователя. Время due_at хранится в UTC."""

    __tablename__ = "reminders"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.String(12), default="generic", nullable=False)
    title = db.Column(db.String(120), nullable=False)
    body = db.Column(db.String(400), nullable=False, default="")
    # Время срабатывания в UTC.
    due_at = db.Column(db.DateTime, nullable=False)
    # IANA-таймзона для отображения и вычисления next occurrence.
    timezone = db.Column(db.String(64), default="UTC", nullable=False)
    recurrence = db.Column(db.String(12), default="none", nullable=False)
    enabled = db.Column(db.Boolean, default=True, nullable=False)
    # Связанный объект (план/кредит), чтобы можно было перейти из уведомления.
    related_type = db.Column(db.String(12), nullable=True)
    related_id = db.Column(db.Uuid, nullable=True)
    # Когда напоминание в последний раз было отправлено (для recurrence).
    last_fired_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", backref=db.backref("reminders", lazy="dynamic"))


class Credit(TimestampMixin, db.Model):
    """Кредит/рассрочка: долг с процентом и регулярными платежами."""

    __tablename__ = "credits"

    id = db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id"), nullable=False, index=True)
    account_id = db.Column(db.Uuid, db.ForeignKey("accounts.id"), nullable=True, index=True)
    name = db.Column(db.String(80), nullable=False)
    currency = db.Column(db.String(3), nullable=False)
    total_amount = db.Column(db.Numeric(14, 2), nullable=False)  # сумма долга
    interest_rate = db.Column(db.Numeric(6, 3), default=0, nullable=False)  # годовых %
    term_months = db.Column(db.Integer, nullable=True)  # срок в месяцах
    payment_amount = db.Column(db.Numeric(14, 2), nullable=True)  # ежемесячный платёж
    paid_amount = db.Column(db.Numeric(14, 2), default=0, nullable=False)
    # Дата первого платежа и начала учёта.
    first_payment_date = db.Column(db.Date, nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    # День месяца, когда списывается платёж (1-28), для напоминаний.
    payment_day = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    user = db.relationship("User", backref=db.backref("credits", lazy="dynamic"))
    account = db.relationship("Account", backref=db.backref("credits", lazy="dynamic"))
