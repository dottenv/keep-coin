from marshmallow import Schema, fields, validate

from app.models.account import DEFAULT_CURRENCY
from app.models.budget import BUDGET_KINDS, BUDGET_PERIODS
from app.models.notification import RECURRENCES

BUDGET_NAME_REQUIRED = "budget_name_required"
BUDGET_NAME_LONG = "budget_name_long"
BUDGET_AMOUNT_REQUIRED = "budget_amount_required"
BUDGET_AMOUNT_INVALID = "budget_amount_invalid"
INVALID_BUDGET_PERIOD = "invalid_budget_period"
INVALID_BUDGET_CATEGORY = "invalid_budget_category"
INVALID_BUDGET_CURRENCY = "invalid_budget_currency"
INVALID_BUDGET_KIND = "invalid_budget_kind"
GOAL_NAME_REQUIRED = "goal_name_required"
GOAL_NAME_LONG = "goal_name_long"
GOAL_TARGET_REQUIRED = "goal_target_required"
GOAL_TARGET_INVALID = "goal_target_invalid"
GOAL_SAVED_INVALID = "goal_saved_invalid"
GOAL_CONTRIBUTION_INVALID = "goal_contribution_invalid"
INVALID_GOAL_CURRENCY = "invalid_goal_currency"


class BudgetCreateSchema(Schema):
    name = fields.Str(
        required=True,
        error_messages={"required": BUDGET_NAME_REQUIRED},
        validate=validate.Length(min=1, max=80, error=BUDGET_NAME_LONG),
    )
    amount = fields.Decimal(
        required=True,
        places=2,
        validate=validate.Range(min=0.01, error=BUDGET_AMOUNT_INVALID),
        error_messages={
            "required": BUDGET_AMOUNT_REQUIRED,
            "invalid": BUDGET_AMOUNT_INVALID,
        },
    )
    account_id = fields.UUID(load_default=None, allow_none=True)
    period = fields.Str(
        load_default="month",
        validate=validate.OneOf(BUDGET_PERIODS, error=INVALID_BUDGET_PERIOD),
    )
    kind = fields.Str(
        load_default="expense",
        validate=validate.OneOf(BUDGET_KINDS, error=INVALID_BUDGET_KIND),
    )
    category = fields.Str(
        load_default=None,
        allow_none=True,
        validate=validate.Length(min=1, max=40, error=INVALID_BUDGET_CATEGORY),
    )
    currency = fields.Str(
        load_default=None,
        allow_none=True,
        validate=validate.Regexp(r"^[A-Z]{3}$", error=INVALID_BUDGET_CURRENCY),
    )
    is_active = fields.Bool(load_default=True)
    start_date = fields.Date(load_default=None, allow_none=True)
    end_date = fields.Date(load_default=None, allow_none=True)
    recurrence = fields.Str(
        load_default="none",
        validate=validate.OneOf(RECURRENCES, error="invalid_recurrence"),
    )


class BudgetUpdateSchema(Schema):
    """Частичное обновление бюджета (все поля опциональны)."""

    name = fields.Str(
        validate=validate.Length(min=1, max=80, error=BUDGET_NAME_LONG),
        error_messages={"invalid": BUDGET_NAME_LONG},
    )
    amount = fields.Decimal(
        places=2,
        validate=validate.Range(min=0.01, error=BUDGET_AMOUNT_INVALID),
        error_messages={"invalid": BUDGET_AMOUNT_INVALID},
    )
    account_id = fields.UUID(allow_none=True)
    period = fields.Str(
        validate=validate.OneOf(BUDGET_PERIODS, error=INVALID_BUDGET_PERIOD),
    )
    kind = fields.Str(
        validate=validate.OneOf(BUDGET_KINDS, error=INVALID_BUDGET_KIND),
    )
    category = fields.Str(allow_none=True)
    currency = fields.Str(
        load_default=None,
        allow_none=True,
        validate=validate.Regexp(r"^[A-Z]{3}$", error=INVALID_BUDGET_CURRENCY),
    )
    is_active = fields.Bool()
    start_date = fields.Date(allow_none=True)
    end_date = fields.Date(allow_none=True)
    recurrence = fields.Str(
        validate=validate.OneOf(RECURRENCES, error="invalid_recurrence"),
    )


class BudgetOutSchema(Schema):
    id = fields.UUID()
    name = fields.Str()
    amount = fields.Float()
    period = fields.Str()
    kind = fields.Str()
    category = fields.Str(allow_none=True)
    currency = fields.Str()
    is_active = fields.Bool()
    account_id = fields.UUID(allow_none=True)
    account_name = fields.Function(lambda obj: getattr(obj, "_account_name", None))
    shared = fields.Function(lambda obj: getattr(obj, "_shared", False))
    role = fields.Function(lambda obj: getattr(obj, "_role", "owner"))
    spent = fields.Function(lambda obj: float(getattr(obj, "_spent", 0) or 0))
    remaining = fields.Function(lambda obj: float(getattr(obj, "_remaining", 0) or 0))
    pct = fields.Function(lambda obj: float(getattr(obj, "_pct", 0) or 0))
    start_date = fields.Date(allow_none=True)
    end_date = fields.Date(allow_none=True)
    recurrence = fields.Str()
    created_at = fields.DateTime()


class GoalCreateSchema(Schema):
    name = fields.Str(
        required=True,
        error_messages={"required": GOAL_NAME_REQUIRED},
        validate=validate.Length(min=1, max=80, error=GOAL_NAME_LONG),
    )
    target_amount = fields.Decimal(
        required=True,
        places=2,
        validate=validate.Range(min=0.01, error=GOAL_TARGET_INVALID),
        error_messages={
            "required": GOAL_TARGET_REQUIRED,
            "invalid": GOAL_TARGET_INVALID,
        },
    )
    saved_amount = fields.Decimal(
        load_default=0,
        places=2,
        validate=validate.Range(min=0, error=GOAL_SAVED_INVALID),
        error_messages={"invalid": GOAL_SAVED_INVALID},
    )
    account_id = fields.UUID(load_default=None, allow_none=True)
    deadline = fields.Date(load_default=None, allow_none=True)
    monthly_contribution = fields.Decimal(
        load_default=None,
        allow_none=True,
        places=2,
        validate=validate.Range(min=0.01, error=GOAL_CONTRIBUTION_INVALID),
        error_messages={"invalid": GOAL_CONTRIBUTION_INVALID},
    )
    currency = fields.Str(
        load_default=DEFAULT_CURRENCY,
        validate=validate.Regexp(r"^[A-Z]{3}$", error=INVALID_GOAL_CURRENCY),
    )
    is_active = fields.Bool(load_default=True)
    start_date = fields.Date(load_default=None, allow_none=True)
    end_date = fields.Date(load_default=None, allow_none=True)
    recurrence = fields.Str(
        load_default="none",
        validate=validate.OneOf(RECURRENCES, error="invalid_recurrence"),
    )


class GoalUpdateSchema(Schema):
    """Частичное обновление цели (все поля опциональны)."""

    name = fields.Str(
        validate=validate.Length(min=1, max=80, error=GOAL_NAME_LONG),
        error_messages={"invalid": GOAL_NAME_LONG},
    )
    target_amount = fields.Decimal(
        places=2,
        validate=validate.Range(min=0.01, error=GOAL_TARGET_INVALID),
        error_messages={"invalid": GOAL_TARGET_INVALID},
    )
    saved_amount = fields.Decimal(
        places=2,
        validate=validate.Range(min=0, error=GOAL_SAVED_INVALID),
        error_messages={"invalid": GOAL_SAVED_INVALID},
    )
    account_id = fields.UUID(allow_none=True)
    deadline = fields.Date(allow_none=True)
    monthly_contribution = fields.Decimal(
        allow_none=True,
        places=2,
        validate=validate.Range(min=0.01, error=GOAL_CONTRIBUTION_INVALID),
        error_messages={"invalid": GOAL_CONTRIBUTION_INVALID},
    )
    currency = fields.Str(
        load_default=None,
        allow_none=True,
        validate=validate.Regexp(r"^[A-Z]{3}$", error=INVALID_GOAL_CURRENCY),
    )
    is_active = fields.Bool()
    start_date = fields.Date(allow_none=True)
    end_date = fields.Date(allow_none=True)
    recurrence = fields.Str(
        validate=validate.OneOf(RECURRENCES, error="invalid_recurrence"),
    )


class GoalOutSchema(Schema):
    id = fields.UUID()
    name = fields.Str()
    target_amount = fields.Float()
    saved_amount = fields.Float()
    deadline = fields.Date(allow_none=True)
    monthly_contribution = fields.Float(allow_none=True)
    currency = fields.Str()
    is_active = fields.Bool()
    account_id = fields.UUID(allow_none=True)
    account_name = fields.Function(lambda obj: getattr(obj, "_account_name", None))
    shared = fields.Function(lambda obj: getattr(obj, "_shared", False))
    pct = fields.Function(lambda obj: float(getattr(obj, "_pct", 0) or 0))
    needed_per_month = fields.Function(
        lambda obj: float(getattr(obj, "_needed_per_month", 0) or 0)
    )
    start_date = fields.Date(allow_none=True)
    end_date = fields.Date(allow_none=True)
    recurrence = fields.Str()
    created_at = fields.DateTime()


budget_create_schema = BudgetCreateSchema()
budget_update_schema = BudgetUpdateSchema()
budget_out_schema = BudgetOutSchema()
goal_create_schema = GoalCreateSchema()
goal_update_schema = GoalUpdateSchema()
goal_out_schema = GoalOutSchema()