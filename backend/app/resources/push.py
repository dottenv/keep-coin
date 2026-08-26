import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from app.models.notification import PushSubscription
from app.schemas.notification import (
    push_subscription_create_schema,
    push_subscription_out_schema,
)
from app.services.notification_service import send_test_push
from app.utils.vapid import get_vapid_keys

bp = Blueprint("push", __name__)


@bp.get("/vapid-public-key")
def vapid_public_key():
    return jsonify(publicKey=get_vapid_keys()["public"])


@bp.post("/subscribe")
@jwt_required()
def subscribe():
    data = push_subscription_create_schema.load(request.get_json(silent=True) or {})
    endpoint = data["endpoint"]
    existing = PushSubscription.query.filter_by(
        user_id=current_user.id, endpoint=endpoint
    ).first()
    if existing:
        existing.p256dh = data["p256dh"]
        existing.auth = data["auth"]
        sub = existing
    else:
        sub = PushSubscription(
            user_id=current_user.id,
            endpoint=endpoint,
            p256dh=data["p256dh"],
            auth=data["auth"],
        )
        from app.extensions import db

        db.session.add(sub)
    from app.extensions import db

    db.session.commit()
    return jsonify(push_subscription_out_schema.dump(sub)), 201


@bp.delete("/unsubscribe")
@jwt_required()
def unsubscribe():
    data = request.get_json(silent=True) or {}
    endpoint = data.get("endpoint")
    query = PushSubscription.query.filter_by(user_id=current_user.id)
    if endpoint:
        query = query.filter_by(endpoint=endpoint)
    query.delete(synchronize_session=False)
    from app.extensions import db

    db.session.commit()
    return jsonify(ok=True)


@bp.post("/test")
@jwt_required()
def test_push():
    count = send_test_push(current_user.id)
    return jsonify(sent=count)
