from __future__ import annotations

import json
import os
from pathlib import Path

from app.config import BASE_DIR

_KEYS_FILE = BASE_DIR / "vapid_keys.json"

_cache: dict[str, str] | None = None


def _generate() -> dict[str, str]:
    """Генерирует VAPID-пару (prime256v1) через cryptography."""
    try:
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.hazmat.primitives import hashes, serialization
    except ImportError as exc:  # pragma: no cover - зависимость должна быть установлена
        raise RuntimeError(
            "Для WebPush нужна библиотека `cryptography`. Установите: pip install cryptography"
        ) from exc

    key = ec.generate_private_key(ec.SECP256R1())
    private_pem = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    public_numbers = key.public_key().public_numbers()
    import base64

    def _b64url_uint(value: int) -> str:
        length = (value.bit_length() + 7) // 8
        raw = value.to_bytes(length, "big")
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")

    public_b64 = _b64url_uint(public_numbers.x) + "." + _b64url_uint(public_numbers.y)
    return {"private": private_pem, "public": public_b64}


def get_vapid_keys() -> dict[str, str]:
    """Возвращает {private, public}, генерируя и кэшируя при отсутствии."""
    global _cache
    if _cache is not None:
        return _cache

    private = os.environ.get("VAPID_PRIVATE_KEY")
    public = os.environ.get("VAPID_PUBLIC_KEY")
    if private and public:
        _cache = {"private": private, "public": public}
        return _cache

    if _KEYS_FILE.exists():
        _cache = json.loads(_KEYS_FILE.read_text(encoding="utf-8"))
        return _cache

    keys = _generate()
    try:
        _KEYS_FILE.write_text(json.dumps(keys), encoding="utf-8")
    except OSError:
        pass
    _cache = keys
    return _cache
