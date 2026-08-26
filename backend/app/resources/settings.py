from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from app.extensions import db
from app.services.settings_service import SettingsService

bp = Blueprint("settings", __name__)


@bp.get("/keywords")
@jwt_required()
def get_keywords():
    return jsonify(keywords=SettingsService.keywords(current_user.id))


@bp.delete("/keywords")
@jwt_required()
def reset_keywords():
    SettingsService.reset_keywords(current_user.id)
    return jsonify(ok=True)


@bp.delete("/data")
@jwt_required()
def wipe_all():
    """«Начать с нуля»: удаляет все операции, счета, категории и ключевые слова."""
    SettingsService.wipe_all(current_user.id)
    return jsonify(ok=True)


@bp.get("/timezone")
@jwt_required()
def get_timezone():
    return jsonify(timezone=current_user.timezone)


@bp.put("/timezone")
@jwt_required()
def set_timezone():
    data = request.get_json(silent=True) or {}
    tz = (data.get("timezone") or "").strip()
    if not tz:
        return jsonify(error="timezone_required"), 400
    current_user.timezone = tz
    db.session.commit()
    return jsonify(timezone=current_user.timezone)