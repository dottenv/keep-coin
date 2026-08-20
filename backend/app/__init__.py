import os

from dotenv import load_dotenv

load_dotenv()

from flask import Flask

from app.config import get_config
from app.errors import register_error_handlers
from app.extensions import db, jwt, migrate
from app.http_auth import attach_auth_hooks


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(get_config())

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    register_error_handlers(app)
    attach_auth_hooks(app)

    from app.resources import register_blueprints

    register_blueprints(app)

    import app.models as _models  # noqa: F401  (регистрация моделей в SQLAlchemy)

    @app.shell_context_processor
    def shell_ctx():
        return {"db": db}

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)