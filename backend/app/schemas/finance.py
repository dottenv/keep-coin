from marshmallow import Schema, fields, validate

from app.models.account import ACCOUNT_TYPES, DEFAULT_CURRENCY
from app.models.category import CATEGORY_KINDS, CATEGORY_COLORS, CATEGORY_ICONS
from app.models.transaction import ALL_CATEGORIES, TRANSACTION_TYPES

NAME_REQUIRED = "account_name_required"
NAME_LONG = "account_name_long"
TYPE_INVALID = "invalid_account_type"
BALANCE_INVALID = "invalid_balance"
CURRENCY_INVALID = "invalid_currency"

TITLE_REQUIRED = "title_required"
TITLE_LONG = "title_long"
INVALID_CATEGORY = "invalid_category"
AMOUNT_INVALID = "amount_invalid"
AMOUNT_REQUIRED = "amount_required"
DATE_REQUIRED = "date_required"
INVALID_DATE = "invalid_date"
ACCOUNT_REQUIRED = "account_required"
TO_ACCOUNT_REQUIRED = "to_account_required"


class AccountCreateSchema(Schema):
    name = fields.Str(
        required=True,
        error_messages={"required": NAME_REQUIRED},
        validate=validate.Length(min=1, max=80, error=NAME_LONG),
    )
    type = fields.Str(
        load_default="cash",
        validate=validate.OneOf(ACCOUNT_TYPES, error=TYPE_INVALID),
    )
    balance = fields.Decimal(
        load_default=0,
        places=2,
        error_messages={"invalid": BALANCE_INVALID},
    )
    currency = fields.Str(
        load_default=DEFAULT_CURRENCY,
        validate=validate.Regexp(r"^[A-Z]{3}$", error=CURRENCY_INVALID),
    )


class AccountUpdateSchema(Schema):
    name = fields.Str(
        validate=validate.Length(min=1, max=80, error=NAME_LONG),
        error_messages={"invalid": "account_name_invalid"},
    )
    type = fields.Str(
        validate=validate.OneOf(ACCOUNT_TYPES, error=TYPE_INVALID),
    )


class AccountOutSchema(Schema):
    id = fields.UUID()
    name = fields.Str()
    type = fields.Str()
    balance = fields.Float()
    currency = fields.Str()
    # Шаринг: роль текущего пользователя, флаг «общий для меня», имя владельца.
    # AccountService.list выставляет `_role/_is_shared/_owner_name` на объектах.
    role = fields.Function(lambda obj: getattr(obj, "_role", "owner"))
    is_shared = fields.Function(lambda obj: getattr(obj, "_is_shared", False))
    owner_name = fields.Function(lambda obj: getattr(obj, "_owner_name", None))
    created_at = fields.DateTime()


class TransactionCreateSchema(Schema):
    type = fields.Str(
        required=True,
        error_messages={"required": "transaction_type_required"},
        validate=validate.OneOf(TRANSACTION_TYPES, error="invalid_transaction_type"),
    )
    account_id = fields.UUID(
        required=True, error_messages={"required": ACCOUNT_REQUIRED}
    )
    to_account_id = fields.UUID(
        load_default=None, error_messages={"invalid": TO_ACCOUNT_REQUIRED}
    )
    title = fields.Str(
        load_default="",
        validate=validate.Length(max=120, error=TITLE_LONG),
    )
    category = fields.Str(
        load_default="other",
        validate=validate.Length(min=1, max=40, error=INVALID_CATEGORY),
    )
    category_id = fields.UUID(load_default=None, allow_none=True)
    amount = fields.Decimal(
        required=True,
        places=2,
        validate=validate.Range(min=0.01, error=AMOUNT_INVALID),
        error_messages={"required": AMOUNT_REQUIRED, "invalid": AMOUNT_INVALID},
    )
    date = fields.Date(
        required=True, error_messages={"required": DATE_REQUIRED, "invalid": INVALID_DATE}
    )


class TransactionUpdateSchema(Schema):
    """Частичное обновление операции (все поля опциональны)."""

    type = fields.Str(
        validate=validate.OneOf(TRANSACTION_TYPES, error="invalid_transaction_type"),
    )
    account_id = fields.UUID(error_messages={"invalid": ACCOUNT_REQUIRED})
    to_account_id = fields.UUID(allow_none=True)
    title = fields.Str(
        validate=validate.Length(max=120, error=TITLE_LONG),
    )
    category = fields.Str(
        validate=validate.Length(min=1, max=40, error=INVALID_CATEGORY),
    )
    category_id = fields.UUID(allow_none=True)
    amount = fields.Decimal(
        places=2,
        validate=validate.Range(min=0.01, error=AMOUNT_INVALID),
        error_messages={"invalid": AMOUNT_INVALID},
    )
    date = fields.Date(error_messages={"invalid": INVALID_DATE})


class TransactionOutSchema(Schema):
    id = fields.UUID()
    type = fields.Str()
    account_id = fields.UUID()
    to_account_id = fields.UUID(allow_none=True)
    title = fields.Str()
    category = fields.Str()
    category_id = fields.UUID(allow_none=True)
    amount = fields.Float()
    currency = fields.Str()
    date = fields.Date()
    recurring = fields.Bool()


class TransactionSuggestionSchema(Schema):
    title = fields.Str()
    category = fields.Str()
    amount = fields.Float()
    currency = fields.Str()
    count = fields.Int()
    last_date = fields.Date()


class CategoryCreateSchema(Schema):
    name = fields.Str(
        required=True,
        error_messages={"required": "category_name_required"},
        validate=validate.Length(min=1, max=40, error="category_name_long"),
    )
    kind = fields.Str(
        required=True,
        error_messages={"required": "category_kind_required"},
        validate=validate.OneOf(CATEGORY_KINDS, error="invalid_category_kind"),
    )
    color = fields.Str(
        load_default=None,
        allow_none=True,
        validate=validate.Regexp(r"^#[0-9a-fA-F]{6}$", error="invalid_category_color"),
    )
    icon = fields.Str(
        load_default="tag",
        validate=validate.OneOf(CATEGORY_ICONS, error="invalid_category_icon"),
    )


class CategoryOutSchema(Schema):
    id = fields.UUID()
    name = fields.Str()
    kind = fields.Str()
    color = fields.Str()
    icon = fields.Str()
    created_at = fields.DateTime()


account_out_schema = AccountOutSchema()
account_create_schema = AccountCreateSchema()
account_update_schema = AccountUpdateSchema()
transaction_out_schema = TransactionOutSchema()
transaction_create_schema = TransactionCreateSchema()
transaction_update_schema = TransactionUpdateSchema()
transaction_suggestion_schema = TransactionSuggestionSchema()
category_out_schema = CategoryOutSchema()
category_create_schema = CategoryCreateSchema()

CATEGORY_COLORS_LIST = list(CATEGORY_COLORS)
CATEGORY_ICONS_LIST = list(CATEGORY_ICONS)