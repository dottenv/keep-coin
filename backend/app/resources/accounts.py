import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from app.schemas import (
    account_create_schema,
    account_out_schema,
    account_update_schema,
)
from app.services.account_service import AccountService

bp = Blueprint("accounts", __name__)


@bp.get("")
@jwt_required()
def list_accounts():
    accounts = AccountService.list(current_user.id)
    return jsonify(accounts=[account_out_schema.dump(a) for a in accounts])


@bp.post("")
@jwt_required()
def create_account():
    data = account_create_schema.load(request.get_json(silent=True) or {})
    account = AccountService.create(
        user_id=current_user.id,
        name=data["name"],
        account_type=data["type"],
        balance=data["balance"],
        currency=data["currency"],
    )
    return jsonify(account_out_schema.dump(account)), 201


@bp.patch("/<uuid:account_id>")
@jwt_required()
def update_account(account_id):
    data = account_update_schema.load(request.get_json(silent=True) or {}, partial=True)
    account = AccountService.update(
        current_user.id, uuid.UUID(str(account_id)), data
    )
    return jsonify(account_out_schema.dump(account))


@bp.delete("/<uuid:account_id>")
@jwt_required()
def delete_account(account_id):
    AccountService.delete(current_user.id, uuid.UUID(str(account_id)))
    return jsonify(ok=True)