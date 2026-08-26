from __future__ import annotations

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

from config import config

router = Router()


def _menu_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Открыть Keep Coin",
                    web_app=WebAppInfo(url=config.WEBAPP_URL),
                )
            ]
        ]
    )


def _link_keyboard(token: str) -> InlineKeyboardMarkup:
    url = f"{config.WEBAPP_URL}?link_token={token}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Привязать Telegram",
                    web_app=WebAppInfo(url=url),
                )
            ]
        ]
    )


@router.message(Command("start"))
async def cmd_start(message: Message) -> None:
    parts = message.text.split(maxsplit=1)
    args = parts[1] if len(parts) > 1 else ""

    # /start link_<token> — привязка аккаунта по токену из веб-приложения.
    if args.startswith("link_"):
        token = args[len("link_"):]
        await message.answer(
            "Нажмите кнопку, чтобы привязать аккаунт Keep Coin к Telegram.",
            reply_markup=_link_keyboard(token),
        )
        return

    await message.answer(
        "Добро пожаловать в Keep Coin! Откройте приложение прямо здесь 👇",
        reply_markup=_menu_keyboard(),
    )
