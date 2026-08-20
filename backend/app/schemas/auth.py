from marshmallow import Schema, fields, validates, ValidationError
from marshmallow.validate import Email, Length, Regexp

from app.models import User

EMAIL_CODE = "not_valid_email"
PASSWORD_CODE = "password_too_short"
NAME_CODE = "display_name_short"
LOCALE_CODE = "invalid_locale"


class RegisterSchema(Schema):
    email = fields.Email(required=True, error_messages={"required": "email_required", "invalid": EMAIL_CODE})
    display_name = fields.Str(
        required=True,
        error_messages={"required": "display_name_required"},
        validate=Length(min=2, max=120, error=NAME_CODE),
    )
    password = fields.Str(
        required=True,
        error_messages={"required": "password_required"},
        validate=Length(min=8, max=128, error=PASSWORD_CODE),
    )
    locale = fields.Str(
        load_default="ru", validate=Regexp(r"^(ru|en)$", error=LOCALE_CODE)
    )

    @validates("email")
    def _email_unique(self, value: str) -> None:
        if User.query.filter_by(email=value.strip().lower()).first():
            raise ValidationError("email_taken", field_name="email")


class LoginSchema(Schema):
    email = fields.Email(
        required=True,
        error_messages={"required": "email_required", "invalid": EMAIL_CODE},
    )
    password = fields.Str(
        required=True,
        error_messages={"required": "password_required"},
        validate=Length(min=1, max=128),
    )


class UpdateProfileSchema(Schema):
    display_name = fields.Str(
        required=False,
        error_messages={"invalid": NAME_CODE},
        validate=Length(min=2, max=120, error=NAME_CODE),
    )
    locale = fields.Str(
        required=False, validate=Regexp(r"^(ru|en)$", error=LOCALE_CODE)
    )


class UserOutSchema(Schema):
    id = fields.UUID()
    email = fields.Str()
    display_name = fields.Str()
    locale = fields.Str()
    created_at = fields.DateTime()


user_out_schema = UserOutSchema()