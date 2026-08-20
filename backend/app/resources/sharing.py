import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from app.schemas import (
    MemberInviteSchema,
    RoleUpdateSchema,
    invite_out_schema,
    member_out_schema,
)
from app.services.sharing_service import SharingService

bp = Blueprint("sharing", __name__)


@bp.get("/accounts/<uuid:account_id>/members")
@jwt_required()
def list_members(account_id):
    rows = SharingService.members(current_user.id, uuid.UUID(str(account_id)))
    return jsonify(members=[member_out_schema.dump(r) for r in rows])


@bp.post("/accounts/<uuid:account_id>/members")
@jwt_required()
def invite_member(account_id):
    data = MemberInviteSchema().load(request.get_json(silent=True) or {})
    invite = SharingService.invite(
        current_user.id,
        uuid.UUID(str(account_id)),
        email=data["email"],
        role=data["role"],
    )
    return jsonify(invite_out_schema.dump(_invite_detail(invite))), 201


@bp.patch("/accounts/<uuid:account_id>/members/<uuid:user_id>")
@jwt_required()
def change_role(account_id, user_id):
    data = RoleUpdateSchema().load(request.get_json(silent=True) or {})
    SharingService.update_role(
        current_user.id,
        uuid.UUID(str(account_id)),
        uuid.UUID(str(user_id)),
        role=data["role"],
    )
    return jsonify(ok=True)


@bp.delete("/accounts/<uuid:account_id>/members/<uuid:user_id>")
@jwt_required()
def remove_member(account_id, user_id):
    SharingService.remove(
        current_user.id,
        uuid.UUID(str(account_id)),
        uuid.UUID(str(user_id)),
    )
    return jsonify(ok=True)


@bp.get("/invites")
@jwt_required()
def pending_invites():
    rows = SharingService.pending_invites(current_user.id)
    return jsonify(invites=[invite_out_schema.dump(r) for r in rows])


@bp.post("/invites/<uuid:invite_id>/accept")
@jwt_required()
def accept_invite(invite_id):
    SharingService.accept(current_user.id, uuid.UUID(str(invite_id)))
    return jsonify(ok=True)


@bp.delete("/invites/<uuid:invite_id>")
@jwt_required()
def decline_invite(invite_id):
    """Отклонить приглашение получателем или отозвать владельцем."""
    SharingService.decline_or_revoke(current_user.id, uuid.UUID(str(invite_id)))
    return jsonify(ok=True)


def _invite_detail(invite) -> dict:
    return {
        "id": invite.id,
        "account_id": invite.account_id,
        "account_name": invite.account.name if invite.account else "",
        "inviter_name": invite.inviter.display_name if invite.inviter else "",
        "role": invite.role,
        "created_at": invite.created_at,
    }