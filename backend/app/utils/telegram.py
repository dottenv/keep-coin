from __future__ import annotations

import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl


def _secret_key(bot_token: str) -> bytes:
    """Секретный ключ для проверки init_data по спецификации Telegram.

    secret_key = HMAC_SHA256(<bot_token>, "WebAppData")
    """
    return hmac.new(bot_token.encode("utf-8"), b"WebAppData", hashlib.sha256).digest()


def verify_telegram_init_data(init_data: str, bot_token: str, max_age: int = 0) -> dict | None:
    """Проверяет подпись init_data из Telegram Mini App.

    Возвращает словарь с данными пользователя (из поля `user`), либо None,
    если подпись невалидна или устарела.
    """
    if not bot_token:
        return None

    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    except (ValueError, TypeError):
        return None

    received_hash = parsed.pop("hash", None)
    if not received_hash:
        return None

    data_check_string = "\n".join(f"{k}={parsed[k]}" for k in sorted(parsed))
    computed_hash = hmac.new(
        _secret_key(bot_token),
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        return None

    if max_age and max_age > 0:
        try:
            auth_date = int(parsed.get("auth_date", "0"))
        except (ValueError, TypeError):
            return None
        if time.time() - auth_date > max_age:
            return None

    raw_user = parsed.get("user")
    if raw_user:
        try:
            return json.loads(raw_user)
        except (ValueError, TypeError):
            return None
    return {}


def extract_telegram_data(init_data: str) -> dict | None:
    """Извлекает данные пользователя из init_data без проверки подписи.

    Используется только после успешной verify_telegram_init_data.
    """
    try:
        parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    except (ValueError, TypeError):
        return None
    raw_user = parsed.get("user")
    if not raw_user:
        return {}
    try:
        return json.loads(raw_user)
    except (ValueError, TypeError):
        return None
