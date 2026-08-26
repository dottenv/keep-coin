import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from app.errors import ApiError
from app.extensions import db
from app.models.notification import Reminder
from app.schemas.notification import (
    reminder_create_schema,
    reminder_out_schema,
    reminder_update_schema,
)
from app.services.notification_service import notify_reminder

bp = Blueprint("reminders", __name__)


@bp.get("")
@jwt_required()
def list_reminders():
    reminders = (
        Reminder.query.filter_by(user_id=current_user.id)
        .order_by(Reminder.due_at.asc())
        .all()
    )
    return jsonify(reminders=[reminder_out_schema.dump(r) for r in reminders])


@bp.post("")
@jwt_required()
def create_reminder():
    data = reminder_create_schema.load(request.get_json(silent=True) or {})
    reminder = Reminder(user_id=current_user.id, **data)
    db.session.add(reminder)
    db.session.commit()
    return jsonify(reminder_out_schema.dump(reminder)), 201


@bp.patch("/<uuid:reminder_id>")
@jwt_required()
def update_reminder(reminder_id):
    reminder = db.session.get(Reminder, uuid.UUID(str(reminder_id)))
    if reminder is None or reminder.user_id != current_user.id:
        raise ApiError("reminder_not_found", 404)
    data = reminder_update_schema.load(request.get_json(silent=True) or {}, partial=True)
    for key, value in data.items():
        setattr(reminder, key, value)
    # При ручном изменении времени сбрасываем метку последней отправки.
    if "due_at" in data:
        reminder.last_fired_at = None
    db.session.commit()
    return jsonify(reminder_out_schema.dump(reminder))


@bp.delete("/<uuid:reminder_id>")
@jwt_required()
def delete_reminder(reminder_id):
    reminder = db.session.get(Reminder, uuid.UUID(str(reminder_id)))
    if reminder is None or reminder.user_id != current_user.id:
        raise ApiError("reminder_not_found", 404)
    db.session.delete(reminder)
    db.session.commit()
    return jsonify(ok=True)


@bp.post("/<uuid:reminder_id>/send")
@jwt_required()
def send_now(reminder_id):
    """Отправить напоминание прямо сейчас (для теста/демо)."""
    reminder = db.session.get(Reminder, uuid.UUID(str(reminder_id)))
    if reminder is None or reminder.user_id != current_user.id:
        raise ApiError("reminder_not_found", 404)
    notify_reminder(reminder)
    return jsonify(ok=True)
