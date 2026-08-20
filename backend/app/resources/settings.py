from flask import Blueprint, jsonify
from flask_jwt_extended import current_user, jwt_required

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