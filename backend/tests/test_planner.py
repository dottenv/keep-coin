import os

os.environ["FLASK_ENV"] = "testing"

import pytest

from app import create_app
from app.extensions import db


@pytest.fixture()
def app():
    application = create_app()
    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def _register(client, email="a@example.com", name="Anna"):
    return client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123", "display_name": name},
    )


def _account(client, name="Карта", balance=0, **kw):
    payload = {"name": name, "type": "card", "balance": balance, "currency": "RUB"}
    payload.update(kw)
    resp = client.post("/api/accounts", json=payload)
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


def _tx(client, account_id, tx_type, amount, date, **kw):
    payload = {
        "type": tx_type,
        "account_id": account_id,
        "title": "Тест",
        "category": "other",
        "amount": amount,
        "date": date,
    }
    payload.update(kw)
    resp = client.post("/api/transactions", json=payload)
    assert resp.status_code == 201, resp.get_json()
    return resp.get_json()


def test_budget_crud(client):
    _register(client)
    account = _account(client)

    created = client.post(
        "/api/budgets",
        json={
            "name": "Продукты",
            "amount": 15000,
            "account_id": account["id"],
            "category": "food",
        },
    )
    assert created.status_code == 201, created.get_json()
    body = created.get_json()
    assert body["name"] == "Продукты"
    assert body["currency"] == "RUB"
    assert body["account_id"] == account["id"]
    assert body["spent"] == 0
    assert body["remaining"] == 15000
    assert body["role"] == "owner"
    assert body["shared"] is False

    listing = client.get("/api/budgets").get_json()["budgets"]
    assert [b["id"] for b in listing] == [body["id"]]

    updated = client.patch(
        f"/api/budgets/{body['id']}",
        json={"amount": 20000, "name": "Еда"},
    )
    assert updated.status_code == 200
    assert updated.get_json()["amount"] == 20000.0
    assert updated.get_json()["name"] == "Еда"

    deletion = client.delete(f"/api/budgets/{body['id']}")
    assert deletion.status_code == 200
    assert client.get("/api/budgets").get_json()["budgets"] == []


def test_budget_validation(client):
    _register(client)
    bad = client.post(
        "/api/budgets",
        json={"name": "", "amount": 0},
    )
    assert bad.status_code == 400
    messages = bad.get_json()["messages"]
    assert "budget_name_long" in messages["name"]
    assert "budget_amount_invalid" in messages["amount"]

    missing = client.delete("/api/budgets/00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 404
    assert missing.get_json()["error"] == "budget_not_found"


def test_budget_spent_tracks_expenses(client):
    _register(client)
    account = _account(client)
    budget = client.post(
        "/api/budgets",
        json={"name": "Кафе", "amount": 5000, "category": "food"},
    ).get_json()

    _tx(client, account["id"], "expense", 1200, "2026-08-05", category="food")
    _tx(client, account["id"], "expense", 800, "2026-08-10", category="food")
    # Другой категории не должно попадать в лимит
    _tx(client, account["id"], "expense", 999, "2026-08-11", category="transport")
    # Доходы не считаются расходом
    _tx(client, account["id"], "income", 50_000, "2026-08-01", category="salary")

    listing = client.get("/api/budgets").get_json()["budgets"]
    b = listing[0]
    assert b["spent"] == 2000
    assert b["remaining"] == 3000
    assert b["pct"] == 40.0

    # Лимит превышен — остаток не уходит в минус
    _tx(client, account["id"], "expense", 10_000, "2026-08-12", category="food")
    b = client.get("/api/budgets").get_json()["budgets"][0]
    assert b["spent"] == 12000
    assert b["remaining"] == 0
    assert b["pct"] == 240.0


def test_budget_scoped_by_account(client):
    _register(client)
    card = _account(client, name="Карта")
    wallet = _account(client, name="Кошелёк")

    budget = client.post(
        "/api/budgets",
        json={"name": "Личное", "amount": 3000, "account_id": card["id"]},
    ).get_json()

    _tx(client, card["id"], "expense", 1000, "2026-08-01")
    _tx(client, wallet["id"], "expense", 1000, "2026-08-02")

    b = client.get("/api/budgets").get_json()["budgets"][0]
    assert b["spent"] == 1000  # только по карте


def test_shared_budget_visible_to_members(client):
    _register(client, email="owner@example.com", name="Папа")
    owner = _account(client, name="Семейный")

    # Владелец приглашает сына (до его регистрации — сработает по email)
    invite = client.post(
        f"/api/accounts/{owner['id']}/members",
        json={"email": "kid@example.com", "role": "viewer"},
    )
    assert invite.status_code == 201, invite.get_json()
    invite_id = invite.get_json()["id"]

    # Владелец создаёт бюджет на общем счете и добавляет расход
    budget = client.post(
        "/api/budgets",
        json={"name": "Семейные траты", "amount": 40000, "account_id": owner["id"]},
    ).get_json()
    _tx(client, owner["id"], "expense", 3000, "2026-08-03", title="Продукты")

    # Регистрируемся как сын и принимаем приглашение
    _register(client, email="kid@example.com", name="Сын")
    accepted = client.post(f"/api/invites/{invite_id}/accept")
    assert accepted.status_code == 200, accepted.get_json()
    _account(client, name="Личный")

    # Сын видит общий бюджет и его расход
    son_budgets = client.get("/api/budgets").get_json()["budgets"]
    assert [b["name"] for b in son_budgets] == ["Семейные траты"]
    shared = son_budgets[0]
    assert shared["shared"] is True
    assert shared["role"] == "viewer"
    assert shared["spent"] == 3000

    # Сын не может менять/удалять бюджет
    edit = client.patch(
        f"/api/budgets/{budget['id']}", json={"amount": 999}
    )
    assert edit.status_code == 403
    delete = client.delete(f"/api/budgets/{budget['id']}")
    assert delete.status_code == 403

    assert len(son_budgets) == 1


def test_goal_crud_and_progress(client):
    _register(client)
    account = _account(client)

    created = client.post(
        "/api/goals",
        json={
            "name": "Отпуск",
            "target_amount": 60000,
            "saved_amount": 10000,
            "account_id": account["id"],
            "deadline": "2026-12-31",
        },
    )
    assert created.status_code == 201
    body = created.get_json()
    assert body["name"] == "Отпуск"
    assert body["saved_amount"] == 10000
    assert body["pct"] == 16.7
    assert body["needed_per_month"] > 0

    updated = client.patch(f"/api/goals/{body['id']}", json={"saved_amount": 20000})
    assert updated.status_code == 200
    assert updated.get_json()["saved_amount"] == 20000

    listing = client.get("/api/goals").get_json()["goals"]
    assert [g["id"] for g in listing] == [body["id"]]

    deletion = client.delete(f"/api/goals/{body['id']}")
    assert deletion.status_code == 200
    assert client.get("/api/goals").get_json()["goals"] == []


def test_planner_overview_numbers(client):
    _register(client)
    card = _account(client, name="Карта", balance=10000)
    client.post(
        "/api/budgets",
        json={"name": "Продукты", "amount": 15000, "category": "food"},
    )
    client.post(
        "/api/budgets",
        json={"name": "Транспорт", "amount": 5000, "category": "transport"},
    )
    client.post(
        "/api/budgets",
        json={"name": "Зарплата", "amount": 60000, "kind": "income"},
    )
    client.post(
        "/api/goals",
        json={"name": "Подушка", "target_amount": 100000, "monthly_contribution": 5000},
    )

    _tx(client, card["id"], "income", 50_000, "2026-07-30", category="salary")
    _tx(client, card["id"], "income", 50_000, "2026-06-30", category="salary")
    _tx(client, card["id"], "expense", 2000, "2026-08-10", category="food")

    overview = client.get("/api/planner").get_json()
    assert overview["currency"] == "RUB"
    assert overview["month_income"] == 0  # в текущем месяце доходов ещё не было
    assert overview["planned_expenses"] == 20000  # 15000 + 5000
    assert overview["planned_income"] == 60000  # явный план дохода
    assert overview["savings_target"] == 5000
    assert overview["need_to_earn"] == 0  # доход покрывает план и накопления
    assert overview["unassigned"] == 35000  # 60000 - 20000 - 5000
    assert overview["has_plan"] is True
    # Баланс счёта: открытие 10000 + 2 дохода по 50000 − расход 2000
    assert overview["current_balance"] == 108000
    assert overview["projected_balance"] == 108000 + 60000 - 20000 - 5000
    assert overview["days_left"] > 0
    assert len(overview["budgets"]) == 3
    assert len(overview["goals"]) == 1
    assert overview["budgets"][0]["spent"] == 2000
    assert overview["goals"][0]["pct"] == 0.0

    assert overview["daily_budget"] > 0


def test_planner_requires_auth(client):
    assert client.get("/api/planner").status_code in (401, 403)
    assert client.get("/api/budgets").status_code in (401, 403)
    assert client.get("/api/goals").status_code in (401, 403)