import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from app.schemas import (
    transaction_create_schema,
    transaction_out_schema,
    transaction_suggestion_schema,
    transaction_update_schema,
)
from app.services.transaction_service import TransactionService

bp = Blueprint("transactions", __name__)


def _dump(tx) -> dict:
    return transaction_out_schema.dump(tx)


@bp.get("")
@jwt_required()
def list_transactions():
    try:
        limit = int(request.args.get("limit", 100))
    except ValueError:
        limit = 100
    limit = max(1, min(limit, 500))

    recurring_arg = request.args.get("recurring")
    txs = TransactionService.list(
        current_user.id,
        limit=limit,
        search=request.args.get("q") or None,
        tx_type=request.args.get("type") or None,
        category=request.args.get("category") or None,
        account_id=request.args.get("account_id") or None,
        recurring=(
            recurring_arg.lower() == "true"
            if recurring_arg in ("true", "false")
            else None
        ),
    )
    return jsonify(transactions=[_dump(tx) for tx in txs])


@bp.get("/suggestions")
@jwt_required()
def suggestions():
    items = TransactionService.suggestions(
        current_user.id,
        tx_type=request.args.get("type") or None,
        q=request.args.get("q") or None,
    )
    return jsonify(suggestions=[transaction_suggestion_schema.dump(i) for i in items])


@bp.get("/summary")
@jwt_required()
def summary():
    return jsonify(TransactionService.summary(current_user.id))


@bp.post("")
@jwt_required()
def create_transaction():
    data = transaction_create_schema.load(request.get_json(silent=True) or {})
    tx = TransactionService.create(current_user.id, data)
    return jsonify(_dump(tx)), 201


@bp.get("/<uuid:transaction_id>")
@jwt_required()
def get_transaction(transaction_id):
    tx = TransactionService.get_for_user(current_user.id, uuid.UUID(str(transaction_id)))
    return jsonify(_dump(tx))


@bp.patch("/<uuid:transaction_id>")
@jwt_required()
def update_transaction(transaction_id):
    data = transaction_update_schema.load(request.get_json(silent=True) or {}, partial=True)
    tx = TransactionService.update(
        current_user.id, uuid.UUID(str(transaction_id)), data
    )
    return jsonify(_dump(tx))


@bp.delete("/<uuid:transaction_id>")
@jwt_required()
def delete_transaction(transaction_id):
    TransactionService.delete(current_user.id, uuid.UUID(str(transaction_id)))
    return jsonify(ok=True)