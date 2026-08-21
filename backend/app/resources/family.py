import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from app.schemas import (
    MemberInviteSchema,
    RoleUpdateSchema,
    family_member_out_schema,
)
from app.services.sharing_service import SharingService

bp = Blueprint("family", __name__)


@bp.get("")
@jwt_required()
def list_family():
    rows = SharingService.family_members(current_user.id)
    return jsonify(members=[family_member_out_schema.dump(r) for r in rows])


@bp.post("/invite")
@jwt_required()
def invite():
    data = MemberInviteSchema().load(request.get_json(silent=True) or {})
    invite = SharingService.family_invite(
        current_user.id, email=data["email"], role=data["role"]
    )
    return jsonify(
        id=invite.id,
        email=invite.email,
        role=invite.role,
        scope=invite.scope,
    ), 201


@bp.patch("/<uuid:user_id>/role")
@jwt_required()
def change_role(user_id):
    data = RoleUpdateSchema().load(request.get_json(silent=True) or {})
    SharingService.family_update_role(
        current_user.id, uuid.UUID(str(user_id)), role=data["role"]
    )
    return jsonify(ok=True)


@bp.delete("/<uuid:user_id>")
@jwt_required()
def remove(user_id):
    SharingService.family_remove(current_user.id, uuid.UUID(str(user_id)))
    return jsonify(ok=True)
