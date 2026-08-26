from flask import Blueprint, jsonify

from app.resources.accounts import bp as accounts_bp
from app.resources.auth import bp as auth_bp
from app.resources.budgets import bp as budgets_bp
from app.resources.categories import bp as categories_bp
from app.resources.credits import bp as credits_bp
from app.resources.family import bp as family_bp
from app.resources.goals import bp as goals_bp
from app.resources.planner import bp as planner_bp
from app.resources.push import bp as push_bp
from app.resources.reminders import bp as reminders_bp
from app.resources.settings import bp as settings_bp
from app.resources.sharing import bp as sharing_bp
from app.resources.transactions import bp as transactions_bp

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    return jsonify(status="ok")


def register_blueprints(app) -> None:
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(accounts_bp, url_prefix="/api/accounts")
    app.register_blueprint(budgets_bp, url_prefix="/api/budgets")
    app.register_blueprint(goals_bp, url_prefix="/api/goals")
    app.register_blueprint(planner_bp, url_prefix="/api/planner")
    app.register_blueprint(transactions_bp, url_prefix="/api/transactions")
    app.register_blueprint(categories_bp, url_prefix="/api/categories")
    app.register_blueprint(settings_bp, url_prefix="/api/settings")
    app.register_blueprint(family_bp, url_prefix="/api/family")
    app.register_blueprint(sharing_bp, url_prefix="/api")
    app.register_blueprint(push_bp, url_prefix="/api/push")
    app.register_blueprint(reminders_bp, url_prefix="/api/reminders")
    app.register_blueprint(credits_bp, url_prefix="/api/credits")