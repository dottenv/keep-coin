import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from app.schemas import (
    budget_create_schema,
    budget_out_schema,
    budget_update_schema,
)
from app.services.planner_service import PlannerService

bp = Blueprint("budgets", __name__)


@bp.get("")
@jwt_required()
def list_budgets():
    budgets = PlannerService.list_budgets(current_user.id)
    return jsonify(budgets=[budget_out_schema.dump(b) for b in budgets])


@bp.post("")
@jwt_required()
def create_budget():
    data = budget_create_schema.load(request.get_json(silent=True) or {})
    budget = PlannerService.create_budget(current_user.id, data)
    return jsonify(budget_out_schema.dump(budget)), 201


@bp.patch("/<uuid:budget_id>")
@jwt_required()
def update_budget(budget_id):
    data = budget_update_schema.load(request.get_json(silent=True) or {}, partial=True)
    budget = PlannerService.update_budget(
        current_user.id, uuid.UUID(str(budget_id)), data
    )
    return jsonify(budget_out_schema.dump(budget))


@bp.delete("/<uuid:budget_id>")
@jwt_required()
def delete_budget(budget_id):
    PlannerService.delete_budget(current_user.id, uuid.UUID(str(budget_id)))
    return jsonify(ok=True)