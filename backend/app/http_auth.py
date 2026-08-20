from __future__ import annotations

import uuid

from flask import g
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
)

from app.models import User


def attach_auth_hooks(app) -> None:
    @app.after_request
    def _set_auth_tokens(response):
        tokens = getattr(g, "_auth_tokens", None)
        if tokens:
            if tokens["access"]:
                set_access_cookies(response, tokens["access"])
            if tokens["refresh"]:
                set_refresh_cookies(response, tokens["refresh"])
            g._auth_tokens = None
        if getattr(g, "_logout", False):
            unset_jwt_cookies(response)
        return response

    from app.extensions import db, jwt

    @jwt.user_lookup_loader
    def _load_user(_jwt_header, jwt_payload):
        identity = jwt_payload.get("sub")
        if not identity:
            return None
        try:
            user_id = uuid.UUID(identity)
        except (ValueError, TypeError, AttributeError):
            # Старые/чужие токены с некорректным identity не должны ронять
            # эндпоинт 500-кой — трактуем как неавторизованного пользователя.
            return None
        return db.session.get(User, user_id)


def stage_auth_tokens(user_id: str) -> None:
    g._auth_tokens = {
        "access": create_access_token(identity=user_id),
        "refresh": create_refresh_token(identity=user_id),
    }


def stage_access_token(user_id: str) -> None:
    g._auth_tokens = {
        "access": create_access_token(identity=user_id),
        "refresh": None,
    }


def stage_logout() -> None:
    g._logout = True
    g._auth_tokens = None