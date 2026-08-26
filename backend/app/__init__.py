import os

from dotenv import load_dotenv

load_dotenv()

from flask import Flask

from app.config import get_config
from app.errors import register_error_handlers
from app.extensions import db, jwt, migrate
from app.http_auth import attach_auth_hooks


def ensure_schema(app: Flask) -> None:
    """Создаёт новые таблицы и добавляет недостающие колонки (для dev без миграций).

    Новые таблицы создаются через create_all; колонки в существующих таблицах
    добавляются idempotent-ным ALTER (SQLite не поддерживает IF NOT EXISTS).
    """
    with app.app_context():
        db.create_all()
        from sqlalchemy import text

        alters = [
            ("budgets", "start_date", "DATE"),
            ("budgets", "end_date", "DATE"),
            ("budgets", "recurrence", "VARCHAR(12)"),
            ("savings_goals", "start_date", "DATE"),
            ("savings_goals", "end_date", "DATE"),
            ("savings_goals", "recurrence", "VARCHAR(12)"),
            ("users", "timezone", "VARCHAR(64)"),
        ]
        for table, col, ctype in alters:
            try:
                with db.engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {ctype}"))
            except Exception:
                # Колонка уже существует — игнорируем.
                pass


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

    ensure_schema(app)

    from app.services.notification_service import start_scheduler

    start_scheduler(app)

    @app.shell_context_processor
    def shell_ctx():
        return {"db": db}

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)