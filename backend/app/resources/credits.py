import uuid

from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from app.errors import ApiError
from app.extensions import db
from app.models import Account
from app.models.notification import Credit
from app.schemas.notification import (
    credit_create_schema,
    credit_out_schema,
    credit_update_schema,
)
from app.services.account_service import AccountService
from app.services.access_service import account_role, require_role

bp = Blueprint("credits", __name__)


def _attach_credit_view(credit: Credit):
    credit._account_name = None
    if credit.account_id is not None:
        acc = db.session.get(Account, credit.account_id)
        credit._account_name = acc.name if acc else None
    credit._remaining = float(max(0, credit.total_amount - (credit.paid_amount or 0)))
    credit._next_payment_date = _next_payment_date(credit)
    return credit


def _next_payment_date(credit: Credit):
    from datetime import date, timedelta

    ref = credit.first_payment_date or credit.start_date
    if ref is None:
        return None
    if credit.payment_day:
        # Ближайший день месяца >= сегодня.
        today = date.today()
        y, m = today.year, today.month
        try:
            candidate = date(y, m, credit.payment_day)
        except ValueError:
            candidate = date(y, m, 28)
        if candidate < today:
            if m == 12:
                candidate = date(y + 1, 1, credit.payment_day)
            else:
                candidate = date(y, m + 1, credit.payment_day)
        return candidate
    # Без дня платежа — просто следующий месяц от начала.
    if ref.month == 12:
        return date(ref.year + 1, 1, 1)
    return date(ref.year, ref.month + 1, 1)


@bp.get("")
@jwt_required()
def list_credits():
    credits = (
        Credit.query.filter_by(user_id=current_user.id)
        .order_by(Credit.created_at.asc())
        .all()
    )
    return jsonify(credits=[credit_out_schema.dump(_attach_credit_view(c)) for c in credits])


@bp.post("")
@jwt_required()
def create_credit():
    data = credit_create_schema.load(request.get_json(silent=True) or {})
    account_id = data.get("account_id")
    currency = data.get("currency")
    if account_id is not None:
        require_role(current_user.id, account_id, "owner", "editor")
        account = AccountService.get_accessible(current_user.id, account_id)
        currency = account.currency if currency is None else currency
    if currency is None:
        from app.models.account import DEFAULT_CURRENCY

        currency = DEFAULT_CURRENCY

    credit = Credit(
        user_id=current_user.id,
        account_id=account_id,
        name=data["name"].strip(),
        currency=currency,
        total_amount=data["total_amount"],
        interest_rate=data.get("interest_rate", 0),
        term_months=data.get("term_months"),
        payment_amount=data.get("payment_amount"),
        paid_amount=data.get("paid_amount", 0),
        first_payment_date=data.get("first_payment_date"),
        start_date=data.get("start_date"),
        payment_day=data.get("payment_day"),
        notes=data.get("notes"),
        is_active=bool(data.get("is_active", True)),
    )
    db.session.add(credit)
    db.session.commit()
    return jsonify(credit_out_schema.dump(_attach_credit_view(credit))), 201


@bp.patch("/<uuid:credit_id>")
@jwt_required()
def update_credit(credit_id):
    credit = db.session.get(Credit, uuid.UUID(str(credit_id)))
    if credit is None or credit.user_id != current_user.id:
        raise ApiError("credit_not_found", 404)
    data = credit_update_schema.load(request.get_json(silent=True) or {}, partial=True)
    for key, value in data.items():
        setattr(credit, key, value)
    db.session.commit()
    return jsonify(credit_out_schema.dump(_attach_credit_view(credit)))


@bp.delete("/<uuid:credit_id>")
@jwt_required()
def delete_credit(credit_id):
    credit = db.session.get(Credit, uuid.UUID(str(credit_id)))
    if credit is None or credit.user_id != current_user.id:
        raise ApiError("credit_not_found", 404)
    db.session.delete(credit)
    db.session.commit()
    return jsonify(ok=True)
