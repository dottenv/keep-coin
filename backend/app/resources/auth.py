import uuid
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import current_user, get_jwt_identity, jwt_required

from app.extensions import db
from app.http_auth import stage_access_token, stage_auth_tokens, stage_logout
from app.models import User
from app.schemas import (
    LoginSchema,
    RegisterSchema,
    TelegramLinkSchema,
    TelegramLoginSchema,
    TelegramRegisterSchema,
    UpdateProfileSchema,
    user_out_schema,
)
from app.services.user_service import UserService
from app.utils import extract_telegram_data, verify_telegram_init_data

bp = Blueprint("auth", __name__)


def _verify_telegram(init_data: str) -> dict | None:
    """Проверяет init_data и возвращает данные пользователя Telegram."""
    bot_token = current_app.config.get("TELEGRAM_BOT_TOKEN")
    max_age = int(current_app.config.get("TELEGRAM_INIT_DATA_MAX_AGE", 0) or 0)
    return verify_telegram_init_data(init_data, bot_token, max_age)


def _normalize_payload() -> dict:
    from flask import request

    payload = request.get_json(silent=True) or {}
    if payload.get("email"):
        payload["email"] = payload["email"].strip().lower()
    return payload


@bp.post("/register")
def register():
    data = RegisterSchema().load(_normalize_payload())
    user = UserService.create(
        email=data["email"],
        password=data["password"],
        display_name=data["display_name"],
        locale=data.get("locale", "ru"),
    )
    stage_auth_tokens(str(user.id))
    return jsonify(user_out_schema.dump(user)), 201


@bp.post("/login")
def login():
    data = LoginSchema().load(_normalize_payload())
    user = UserService.authenticate(data["email"], data["password"])
    if not user:
        return jsonify(error="invalid_credentials"), 401
    stage_auth_tokens(str(user.id))
    return jsonify(user_out_schema.dump(user))


@bp.get("/me")
@jwt_required()
def me():
    if current_user is None:
        return jsonify(error="invalid_access_token"), 401
    return jsonify(user_out_schema.dump(current_user))


@bp.put("/me")
@jwt_required()
def update_profile():
    from flask import request

    if current_user is None:
        return jsonify(error="invalid_access_token"), 401
    data = UpdateProfileSchema().load(request.get_json(silent=True) or {})
    if "display_name" in data:
        current_user.display_name = data["display_name"]
    if "locale" in data:
        current_user.locale = data["locale"]
    db.session.commit()
    return jsonify(user_out_schema.dump(current_user))


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    try:
        user_id = uuid.UUID(identity)
    except (ValueError, TypeError, AttributeError):
        return jsonify(error="invalid_refresh_token"), 401
    user = db.session.get(User, user_id)
    if not user or not user.is_active:
        return jsonify(error="invalid_refresh_token"), 401
    stage_access_token(str(user.id))
    return jsonify(ok=True)


@bp.post("/logout")
@jwt_required()
def logout():
    stage_logout()
    return jsonify(ok=True)


@bp.post("/telegram/login")
def telegram_login():
    data = TelegramLoginSchema().load(_normalize_payload())
    tg = _verify_telegram(data["init_data"])
    if tg is None:
        return jsonify(error="invalid_init_data"), 401

    user = UserService.get_by_telegram_id(tg.get("id"))
    if user and user.is_active:
        stage_auth_tokens(str(user.id))
        return jsonify(user_out_schema.dump(user))

    return jsonify(status="new", telegram=extract_telegram_data(data["init_data"])), 200


@bp.post("/telegram/register")
def telegram_register():
    data = TelegramRegisterSchema().load(_normalize_payload())
    tg = _verify_telegram(data["init_data"])
    if tg is None:
        return jsonify(error="invalid_init_data"), 401

    if UserService.get_by_telegram_id(tg.get("id")):
        return jsonify(error="telegram_already_linked"), 409

    user = UserService.create_from_telegram(
        tg,
        email=data["email"],
        password=data["password"],
        display_name=data["display_name"],
        locale=data.get("locale", "ru"),
    )
    stage_auth_tokens(str(user.id))
    return jsonify(user_out_schema.dump(user)), 201


@bp.post("/telegram/link")
def telegram_link():
    data = TelegramLinkSchema().load(_normalize_payload())
    tg = _verify_telegram(data["init_data"])
    if tg is None:
        return jsonify(error="invalid_init_data"), 401

    user = UserService.get_by_link_token(data["link_token"])
    if not user or not user.is_active:
        return jsonify(error="invalid_link_token"), 400
    expires = user.telegram_link_token_expires
    if expires is not None and expires < datetime.now(timezone.utc).replace(tzinfo=None):
        return jsonify(error="link_token_expired"), 400

    existing = UserService.get_by_telegram_id(tg.get("id"))
    if existing and existing.id != user.id:
        return jsonify(error="telegram_already_linked"), 409

    UserService.link_telegram(user, tg)
    stage_auth_tokens(str(user.id))
    return jsonify(user_out_schema.dump(user)), 200


@bp.post("/telegram/link-token")
@jwt_required()
def telegram_link_token():
    if current_user is None:
        return jsonify(error="invalid_access_token"), 401

    ttl = int(current_app.config.get("TELEGRAM_LINK_TOKEN_TTL", 900))
    token = UserService.set_link_token(current_user, ttl)

    username = current_app.config.get("TELEGRAM_BOT_USERNAME")
    webapp_url = current_app.config.get("WEBAPP_URL")
    deep_link = f"https://t.me/{username}?start=link_{token}" if username else None

    return jsonify(link_token=token, bot_deep_link=deep_link, webapp_url=webapp_url)