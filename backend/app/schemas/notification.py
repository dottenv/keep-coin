from marshmallow import Schema, fields, validate

from app.models.notification import RECURRENCES, REMINDER_TYPES

# ---------- Push-подписки ----------

class PushSubscriptionCreateSchema(Schema):
    endpoint = fields.Str(required=True)
    p256dh = fields.Str(required=True)
    auth = fields.Str(required=True)


class PushSubscriptionOutSchema(Schema):
    id = fields.UUID()
    endpoint = fields.Str()
    created_at = fields.DateTime()


# ---------- Напоминания ----------

class ReminderCreateSchema(Schema):
    type = fields.Str(
        load_default="generic",
        validate=validate.OneOf(REMINDER_TYPES, error="invalid_reminder_type"),
    )
    title = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    body = fields.Str(load_default="", validate=validate.Length(max=400))
    # ISO-строка с датой/временем (в таймзоне пользователя).
    due_at = fields.DateTime(required=True)
    timezone = fields.Str(load_default="UTC")
    recurrence = fields.Str(
        load_default="none",
        validate=validate.OneOf(RECURRENCES, error="invalid_recurrence"),
    )
    enabled = fields.Bool(load_default=True)
    related_type = fields.Str(load_default=None, allow_none=True)
    related_id = fields.UUID(load_default=None, allow_none=True)


class ReminderUpdateSchema(Schema):
    type = fields.Str(validate=validate.OneOf(REMINDER_TYPES, error="invalid_reminder_type"))
    title = fields.Str(validate=validate.Length(min=1, max=120))
    body = fields.Str(validate=validate.Length(max=400))
    due_at = fields.DateTime()
    timezone = fields.Str()
    recurrence = fields.Str(
        validate=validate.OneOf(RECURRENCES, error="invalid_recurrence"),
    )
    enabled = fields.Bool()
    related_type = fields.Str(allow_none=True)
    related_id = fields.UUID(allow_none=True)


class ReminderOutSchema(Schema):
    id = fields.UUID()
    type = fields.Str()
    title = fields.Str()
    body = fields.Str()
    due_at = fields.DateTime()
    timezone = fields.Str()
    recurrence = fields.Str()
    enabled = fields.Bool()
    related_type = fields.Str(allow_none=True)
    related_id = fields.UUID(allow_none=True)
    last_fired_at = fields.DateTime(allow_none=True)
    created_at = fields.DateTime()


# ---------- Кредиты ----------

class CreditCreateSchema(Schema):
    name = fields.Str(required=True, validate=validate.Length(min=1, max=80))
    account_id = fields.UUID(load_default=None, allow_none=True)
    currency = fields.Str(
        load_default=None,
        allow_none=True,
        validate=validate.Regexp(r"^[A-Z]{3}$", error="invalid_credit_currency"),
    )
    total_amount = fields.Decimal(
        required=True, places=2, validate=validate.Range(min=0.01, error="invalid_credit_amount")
    )
    interest_rate = fields.Decimal(
        load_default=0, places=3, validate=validate.Range(min=0, error="invalid_credit_rate")
    )
    term_months = fields.Int(load_default=None, allow_none=True)
    payment_amount = fields.Decimal(
        load_default=None, allow_none=True, places=2,
        validate=validate.Range(min=0.01, error="invalid_credit_payment"),
    )
    paid_amount = fields.Decimal(
        load_default=0, places=2, validate=validate.Range(min=0, error="invalid_credit_paid")
    )
    first_payment_date = fields.Date(load_default=None, allow_none=True)
    start_date = fields.Date(load_default=None, allow_none=True)
    payment_day = fields.Int(
        load_default=None, allow_none=True,
        validate=validate.Range(min=1, max=28, error="invalid_payment_day"),
    )
    notes = fields.Str(load_default=None, allow_none=True)
    is_active = fields.Bool(load_default=True)


class CreditUpdateSchema(Schema):
    name = fields.Str(validate=validate.Length(min=1, max=80))
    account_id = fields.UUID(allow_none=True)
    currency = fields.Str(
        load_default=None, allow_none=True,
        validate=validate.Regexp(r"^[A-Z]{3}$", error="invalid_credit_currency"),
    )
    total_amount = fields.Decimal(
        places=2, validate=validate.Range(min=0.01, error="invalid_credit_amount")
    )
    interest_rate = fields.Decimal(
        places=3, validate=validate.Range(min=0, error="invalid_credit_rate")
    )
    term_months = fields.Int(allow_none=True)
    payment_amount = fields.Decimal(
        allow_none=True, places=2,
        validate=validate.Range(min=0.01, error="invalid_credit_payment"),
    )
    paid_amount = fields.Decimal(
        places=2, validate=validate.Range(min=0, error="invalid_credit_paid")
    )
    first_payment_date = fields.Date(allow_none=True)
    start_date = fields.Date(allow_none=True)
    payment_day = fields.Int(
        allow_none=True, validate=validate.Range(min=1, max=28, error="invalid_payment_day")
    )
    notes = fields.Str(allow_none=True)
    is_active = fields.Bool()


class CreditOutSchema(Schema):
    id = fields.UUID()
    name = fields.Str()
    currency = fields.Str()
    total_amount = fields.Float()
    interest_rate = fields.Float()
    term_months = fields.Int(allow_none=True)
    payment_amount = fields.Float(allow_none=True)
    paid_amount = fields.Float()
    first_payment_date = fields.Date(allow_none=True)
    start_date = fields.Date(allow_none=True)
    payment_day = fields.Int(allow_none=True)
    notes = fields.Str(allow_none=True)
    is_active = fields.Bool()
    account_id = fields.UUID(allow_none=True)
    account_name = fields.Function(lambda obj: getattr(obj, "_account_name", None))
    # Вычисляемые поля для UI.
    remaining = fields.Function(lambda obj: float(getattr(obj, "_remaining", 0) or 0))
    next_payment_date = fields.Function(
        lambda obj: getattr(obj, "_next_payment_date", None)
    )
    created_at = fields.DateTime()


push_subscription_create_schema = PushSubscriptionCreateSchema()
push_subscription_out_schema = PushSubscriptionOutSchema()
reminder_create_schema = ReminderCreateSchema()
reminder_update_schema = ReminderUpdateSchema()
reminder_out_schema = ReminderOutSchema()
credit_create_schema = CreditCreateSchema()
credit_update_schema = CreditUpdateSchema()
credit_out_schema = CreditOutSchema()
