import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-me")

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'keep_coin.db'}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT — храним токены в httpOnly cookies (безопасно для PWA/Service Worker)
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SAMESITE = os.environ.get("JWT_COOKIE_SAMESITE", "Lax")
    JWT_COOKIE_SECURE = os.environ.get("JWT_COOKIE_SECURE", "false").lower() == "true"
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    JSON_AS_ASCII = False
    RESTX_JSON = {"ensure_ascii": False}

    # Telegram Mini App: токен бота (используется и бэкендом для проверки
    # init_data, и ботом для работы с API). username нужен для генерации
    # deep link, WEBAPP_URL — адрес Mini App, открываемого из бота.
    TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
    TELEGRAM_BOT_USERNAME = os.environ.get("TELEGRAM_BOT_USERNAME")
    WEBAPP_URL = os.environ.get("WEBAPP_URL")
    # Время жизни токена привязки аккаунта к Telegram (секунды).
    TELEGRAM_LINK_TOKEN_TTL = int(os.environ.get("TELEGRAM_LINK_TOKEN_TTL", "900"))
    # Максимальный возраст init_data (секунды). 0 — без проверки возраста.
    TELEGRAM_INIT_DATA_MAX_AGE = int(os.environ.get("TELEGRAM_INIT_DATA_MAX_AGE", "86400"))

    # WebPush (VAPID): приватный/публичный ключи и subject. Если не заданы
    # через переменные окружения — генерируются один раз и кэшируются в файл
    # рядом с приложением (vapid_keys.json), чтобы подписки оставались валидными.
    VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY")
    VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY")
    VAPID_SUBJECT = os.environ.get("VAPID_SUBJECT", "mailto:admin@keep-coin.app")

    # Фоновый планировщик напоминаний: как часто проверять просроченные
    # напоминания (секунды) и включён ли он вообще.
    REMINDER_SCHEDULER_ENABLED = os.environ.get("REMINDER_SCHEDULER_ENABLED", "true").lower() == "true"
    REMINDER_SCHEDULER_INTERVAL = int(os.environ.get("REMINDER_SCHEDULER_INTERVAL", "30"))


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


def get_config() -> Config:
    env = os.environ.get("FLASK_ENV", "development")
    return {
        "development": DevelopmentConfig,
        "production": ProductionConfig,
        "testing": TestingConfig,
    }.get(env, DevelopmentConfig)()