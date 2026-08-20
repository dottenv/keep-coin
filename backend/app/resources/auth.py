import uuid

from flask import Blueprint, jsonify
from flask_jwt_extended import current_user, get_jwt_identity, jwt_required

from app.extensions import db
from app.http_auth import stage_access_token, stage_auth_tokens, stage_logout
from app.models import User
from app.schemas import (
    LoginSchema,
    RegisterSchema,
    UpdateProfileSchema,
    user_out_schema,
)
from app.services.user_service import UserService

bp = Blueprint("auth", __name__)


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