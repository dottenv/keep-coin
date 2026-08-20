import logging

from marshmallow import ValidationError
from werkzeug.exceptions import HTTPException

log = logging.getLogger(__name__)


class ApiError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def register_error_handlers(app) -> None:
    @app.errorhandler(ValidationError)
    def _validation_error(error: ValidationError):
        return {"error": "validation_error", "messages": error.messages}, 400

    @app.errorhandler(ApiError)
    def _api_error(error: ApiError):
        return {"error": error.message}, error.status_code

    @app.errorhandler(HTTPException)
    def _http_error(error: HTTPException):
        messages = getattr(error, "description", None)
        return {"error": messages or error.name}, error.code

    @app.errorhandler(Exception)
    def _unhandled(error: Exception):
        log.exception("Unhandled error")
        return {"error": "internal_error"}, 500