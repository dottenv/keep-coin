from marshmallow import Schema, fields, validate

from app.models.account_member import MEMBER_ROLES

EMAIL_REQUIRED = "email_required"
INVALID_EMAIL = "not_valid_email"
INVALID_ROLE = "invalid_role"


class MemberInviteSchema(Schema):
    email = fields.Email(
        required=True,
        error_messages={"required": EMAIL_REQUIRED, "invalid": INVALID_EMAIL},
    )
    role = fields.Str(
        load_default="editor",
        validate=validate.OneOf(MEMBER_ROLES, error=INVALID_ROLE),
    )


class RoleUpdateSchema(Schema):
    role = fields.Str(
        required=True,
        error_messages={"required": INVALID_ROLE},
        validate=validate.OneOf(MEMBER_ROLES, error=INVALID_ROLE),
    )


class MemberOutSchema(Schema):
    user_id = fields.UUID()
    display_name = fields.Str()
    email = fields.Str()
    role = fields.Str()
    is_owner = fields.Bool()


class InviteOutSchema(Schema):
    id = fields.UUID()
    account_id = fields.UUID()
    account_name = fields.Str()
    inviter_name = fields.Str()
    role = fields.Str()
    created_at = fields.DateTime()


member_out_schema = MemberOutSchema()
invite_out_schema = InviteOutSchema()
