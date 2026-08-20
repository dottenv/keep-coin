import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from app.schemas import (
    goal_create_schema,
    goal_out_schema,
    goal_update_schema,
)
from app.services.planner_service import PlannerService

bp = Blueprint("goals", __name__)


@bp.get("")
@jwt_required()
def list_goals():
    goals = PlannerService.list_goals(current_user.id)
    return jsonify(goals=[goal_out_schema.dump(g) for g in goals])


@bp.post("")
@jwt_required()
def create_goal():
    data = goal_create_schema.load(request.get_json(silent=True) or {})
    goal = PlannerService.create_goal(current_user.id, data)
    return jsonify(goal_out_schema.dump(goal)), 201


@bp.patch("/<uuid:goal_id>")
@jwt_required()
def update_goal(goal_id):
    data = goal_update_schema.load(request.get_json(silent=True) or {}, partial=True)
    goal = PlannerService.update_goal(current_user.id, uuid.UUID(str(goal_id)), data)
    return jsonify(goal_out_schema.dump(goal))


@bp.delete("/<uuid:goal_id>")
@jwt_required()
def delete_goal(goal_id):
    PlannerService.delete_goal(current_user.id, uuid.UUID(str(goal_id)))
    return jsonify(ok=True)