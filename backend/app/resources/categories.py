import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from app.schemas import category_create_schema, category_out_schema
from app.services.category_service import CategoryService

bp = Blueprint("categories", __name__)


def _dump(category) -> dict:
    return category_out_schema.dump(category)


@bp.get("")
@jwt_required()
def list_categories():
    categories = CategoryService.list(current_user.id)
    return jsonify(categories=[_dump(c) for c in categories])


@bp.post("")
@jwt_required()
def create_category():
    data = category_create_schema.load(request.get_json(silent=True) or {})
    category = CategoryService.create(
        user_id=current_user.id,
        name=data["name"],
        kind=data["kind"],
        color=data["color"],
        icon=data["icon"],
    )
    return jsonify(_dump(category)), 201


@bp.patch("/<uuid:category_id>")
@jwt_required()
def update_category(category_id):
    data = request.get_json(silent=True) or {}
    category = CategoryService.update(
        current_user.id, uuid.UUID(str(category_id)), data
    )
    return jsonify(_dump(category))


@bp.delete("/<uuid:category_id>")
@jwt_required()
def delete_category(category_id):
    CategoryService.delete(current_user.id, uuid.UUID(str(category_id)))
    return jsonify(ok=True)