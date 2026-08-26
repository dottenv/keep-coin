from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    BOT_TOKEN: str = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    WEBAPP_URL: str = os.environ.get("WEBAPP_URL", "").rstrip("/")
    BOT_USERNAME: str = os.environ.get("TELEGRAM_BOT_USERNAME", "")


config = Config()
