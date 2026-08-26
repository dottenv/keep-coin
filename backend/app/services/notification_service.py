from __future__ import annotations

import json
import threading
from datetime import datetime, timedelta, timezone
from typing import Iterable

from app.extensions import db
from app.models.notification import (
    PushSubscription,
    Reminder,
)
from app.utils.vapid import get_vapid_keys

_scheduler_thread: threading.Thread | None = None
_scheduler_running = False


def _add_interval(dt: datetime, recurrence: str) -> datetime:
    if recurrence == "daily":
        return dt + timedelta(days=1)
    if recurrence == "weekly":
        return dt + timedelta(days=7)
    if recurrence in ("monthly", "quarterly", "yearly"):
        months = {"monthly": 1, "quarterly": 3, "yearly": 12}[recurrence]
        y, m = dt.year, dt.month
        m += months
        while m > 12:
            y += 1
            m -= 12
        # День месяца ограничиваем последним днём целевого месяца.
        day = min(dt.day, _days_in_month(y, m))
        return dt.replace(year=y, month=m, day=day)
    return dt + timedelta(days=1)


def _days_in_month(year: int, month: int) -> int:
    if month == 12:
        nxt = datetime(year + 1, 1, 1)
    else:
        nxt = datetime(year, month + 1, 1)
    return (nxt - datetime(year, month, 1)).days


def next_occurrence(base_utc: datetime, recurrence: str, after_utc: datetime | None) -> datetime | None:
    """Следующее срабатывание после after_utc (в UTC). Для 'none' — один раз."""
    if recurrence == "none":
        if after_utc is None or base_utc > after_utc:
            return base_utc
        return None
    cur = base_utc
    for _ in range(5000):
        if after_utc is None or cur > after_utc:
            return cur
        cur = _add_interval(cur, recurrence)
    return None


def get_subscriptions(user_id) -> list[PushSubscription]:
    return PushSubscription.query.filter_by(user_id=user_id).all()


def _push_one(sub: PushSubscription, payload: dict) -> bool:
    """Отправляет web-push. Возвращает False, если подписка устарела (её надо удалить)."""
    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        # Библиотека не установлена — тихо пропускаем отправку.
        return True

    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=get_vapid_keys()["private"],
            vapid_claims={"sub": _vapid_subject()},
        )
        return True
    except WebPushException as exc:
        response = getattr(exc, "response", None)
        if response is not None and response.status_code in (404, 410):
            return False
        return True
    except Exception:
        return True


def _vapid_subject() -> str:
    from flask import current_app

    return current_app.config.get("VAPID_SUBJECT", "mailto:admin@keep-coin.app")


def notify_user(user_id, title: str, body: str, url: str | None = None, tag: str | None = None) -> None:
    payload = {"title": title, "body": body}
    if url:
        payload["url"] = url
    if tag:
        payload["tag"] = tag
    for sub in get_subscriptions(user_id):
        if not _push_one(sub, payload):
            db.session.delete(sub)
    db.session.commit()


def notify_reminder(reminder: Reminder) -> None:
    url = None
    if reminder.related_type == "credit":
        url = "/credits"
    elif reminder.related_type == "budget":
        url = "/planner"
    elif reminder.related_type == "goal":
        url = "/planner"
    notify_user(
        reminder.user_id,
        reminder.title,
        reminder.body or "",
        url=url,
        tag=f"reminder:{reminder.id}",
    )


def send_test_push(user_id) -> int:
    """Отправляет тестовое уведомление. Возвращает число подписок."""
    subs = get_subscriptions(user_id)
    if not subs:
        return 0
    notify_user(user_id, "Keep Coin", "Это тестовое push-уведомление 🔔", url="/")
    return len(subs)


def tick() -> int:
    """Проверяет просроченные напоминания и отправляет push. Возвращает число отправленных."""
    now = datetime.now(timezone.utc)
    due = (
        Reminder.query.filter(Reminder.enabled.is_(True))
        .filter(Reminder.due_at <= now)
        .all()
    )
    sent = 0
    for reminder in due:
        occ = next_occurrence(reminder.due_at, reminder.recurrence, reminder.last_fired_at)
        if occ is None or occ > now:
            continue
        notify_reminder(reminder)
        reminder.last_fired_at = occ
        sent += 1
    if sent:
        db.session.commit()
    return sent


def start_scheduler(app, interval: int | None = None) -> None:
    """Запускает фоновый поток проверки напоминаний (idempotent)."""
    global _scheduler_thread, _scheduler_running
    if _scheduler_running:
        return
    if app.config.get("TESTING"):
        return
    if not app.config.get("REMINDER_SCHEDULER_ENABLED", True):
        return

    interval = interval or app.config.get("REMINDER_SCHEDULER_INTERVAL", 30)

    def _loop() -> None:
        global _scheduler_running
        _scheduler_running = True
        while _scheduler_running:
            try:
                with app.app_context():
                    tick()
            except Exception:
                pass
            threading.Event().wait(interval)

    _scheduler_thread = threading.Thread(target=_loop, daemon=True)
    _scheduler_thread.start()
