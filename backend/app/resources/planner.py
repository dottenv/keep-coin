from flask import Blueprint, jsonify
from flask_jwt_extended import current_user, jwt_required

from app.schemas import budget_out_schema, goal_out_schema
from app.services.planner_service import PlannerService

bp = Blueprint("planner", __name__)


@bp.get("")
@jwt_required()
def planner_overview():
    data = PlannerService.overview(current_user.id)
    data["budgets"] = [budget_out_schema.dump(b) for b in data["budgets"]]
    data["goals"] = [goal_out_schema.dump(g) for g in data["goals"]]
    return jsonify(data)