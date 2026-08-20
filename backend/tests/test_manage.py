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


def _register(client, email="a@example.com"):
    return client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123", "display_name": "Anna"},
    )


def _create_account(client, **overrides):
    payload = {"name": "Карта", "type": "card", "balance": 0, "currency": "RUB"}
    payload.update(overrides)
    return client.post("/api/accounts", json=payload)


def _create_tx(client, account_id, **overrides):
    payload = {
        "type": "expense",
        "account_id": account_id,
        "title": "Продукты",
        "category": "food",
        "amount": 100,
        "date": "2026-08-10",
    }
    payload.update(overrides)
    return client.post("/api/transactions", json=payload)


def test_account_edit_and_delete(client):
    _register(client)
    account = _create_account(client, name="Карта", type="card").get_json()

    updated = client.patch(f"/api/accounts/{account['id']}", json={"name": "Копилка"})
    assert updated.status_code == 200
    assert updated.get_json()["name"] == "Копилка"

    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "account_id": account["id"],
            "title": "Продукты",
            "category": "food",
            "amount": 500,
            "date": "2026-08-10",
        },
    )

    deleted = client.delete(f"/api/accounts/{account['id']}")
    assert deleted.status_code == 200
    assert client.get("/api/accounts").get_json()["accounts"] == []
    assert client.get("/api/transactions").get_json()["transactions"] == []


def test_transaction_update_recomputes_balances(client):
    _register(client)
    account = _create_account(client, balance=5_000).get_json()

    tx = _create_tx(
        client, account["id"], title="Продукты", category="food", amount=500
    ).get_json()
    assert client.get("/api/accounts").get_json()["accounts"][0]["balance"] == 4_500

    # Расход → доход; баланс должен стать 5 500.
    updated = client.patch(
        f"/api/transactions/{tx['id']}",
        json={"type": "income", "title": "Зарплата", "category": "salary", "amount": 500},
    )
    assert updated.status_code == 200
    assert updated.get_json()["type"] == "income"
    assert client.get("/api/accounts").get_json()["accounts"][0]["balance"] == 5_500

    # Меняем только название — баланс не трогается.
    renamed = client.patch(
        f"/api/transactions/{tx['id']}", json={"title": "Бонус"}
    )
    assert renamed.get_json()["title"] == "Бонус"
    assert client.get("/api/accounts").get_json()["accounts"][0]["balance"] == 5_500


def test_transaction_edit_moves_between_accounts(client):
    _register(client)
    from_acc = _create_account(client, name="Карта", balance=0).get_json()
    to_acc = _create_account(client, name="Копилка", type="saving", balance=0).get_json()

    transfer = client.post(
        "/api/transactions",
        json={
            "type": "transfer",
            "account_id": from_acc["id"],
            "to_account_id": to_acc["id"],
            "amount": 1_000,
            "date": "2026-08-10",
        },
    ).get_json()

    # Меняем суммы перевода 1 000 → 400.
    updated = client.patch(
        f"/api/transactions/{transfer['id']}", json={"amount": 400}
    )
    assert updated.status_code == 200

    balances = {
        a["id"]: a["balance"] for a in client.get("/api/accounts").get_json()["accounts"]
    }
    assert balances[from_acc["id"]] == -400
    assert balances[to_acc["id"]] == 400


def test_transaction_delete_restores_balance(client):
    _register(client)
    account = _create_account(client, balance=0).get_json()
    tx = _create_tx(client, account["id"], amount=1_000).get_json()
    assert client.get("/api/accounts").get_json()["accounts"][0]["balance"] == -1_000

    deleted = client.delete(f"/api/transactions/{tx['id']}")
    assert deleted.status_code == 200
    assert client.get("/api/accounts").get_json()["accounts"][0]["balance"] == 0


def test_transaction_filters_and_search(client):
    _register(client)
    account = _create_account(client).get_json()
    _create_tx(client, account["id"], title="Такси", category="transport", amount=300)
    _create_tx(client, account["id"], title="Продукты", category="food", amount=500)
    _create_tx(
        client,
        account["id"],
        type="income",
        title="Зарплата",
        category="salary",
        amount=50_000,
    )

    by_title = client.get("/api/transactions?q=такс").get_json()["transactions"]
    assert [t["title"] for t in by_title] == ["Такси"]

    by_type = client.get("/api/transactions?type=income").get_json()["transactions"]
    assert [t["title"] for t in by_type] == ["Зарплата"]

    by_category = client.get("/api/transactions?category=food").get_json()["transactions"]
    assert [t["category"] for t in by_category] == ["food"]


def test_suggestions_endpoint(client):
    _register(client)
    account = _create_account(client).get_json()
    _create_tx(client, account["id"], title="Кофе", category="food", amount=200)
    _create_tx(client, account["id"], title="Кофе", category="food", amount=220)
    _create_tx(client, account["id"], title="Такси", category="transport", amount=400)

    suggestions = client.get("/api/transactions/suggestions").get_json()["suggestions"]
    by_title = {s["title"]: s for s in suggestions}
    assert by_title["Кофе"]["count"] == 2
    assert by_title["Такси"]["count"] == 1

    filtered = client.get("/api/transactions/suggestions?type=income").get_json()["suggestions"]
    assert filtered == []


def test_categories_crud(client):
    _register(client)
    created = client.post(
        "/api/categories",
        json={"name": "Подписки", "kind": "expense", "color": "#8b5cf6", "icon": "zap"},
    )
    assert created.status_code == 201
    body = created.get_json()
    assert body["name"] == "Подписки"
    assert body["color"] == "#8b5cf6"

    per_user = client.get("/api/categories").get_json()["categories"]
    assert [c["name"] for c in per_user] == ["Подписки"]

    # Автоцвет, если не задан.
    auto = client.post("/api/categories", json={"name": "Хобби", "kind": "expense"})
    assert auto.status_code == 201
    assert auto.get_json()["color"].startswith("#")

    deleted = client.delete(f"/api/categories/{body['id']}")
    assert deleted.status_code == 200
    remaining = client.get("/api/categories").get_json()["categories"]
    assert {c["id"] for c in remaining} == {auto.get_json()["id"]}


def test_category_in_transaction(client):
    _register(client)
    account = _create_account(client).get_json()
    category = client.post(
        "/api/categories", json={"name": "Подписки", "kind": "expense"}
    ).get_json()

    tx = _create_tx(
        client,
        account["id"],
        title="Netflix",
        category="other",
        category_id=category["id"],
    ).get_json()
    assert tx["category_id"] == category["id"]
    assert tx["category"] == "Подписки"


def test_keywords_reset(client):
    _register(client)
    account = _create_account(client).get_json()
    payload = {
        "type": "expense",
        "account_id": account["id"],
        "title": "Подписка",
        "category": "entertainment",
        "amount": 199,
    }
    for month in ("2026-06-10", "2026-07-10", "2026-08-10"):
        client.post("/api/transactions", json={**payload, "date": month})

    keywords = client.get("/api/settings/keywords").get_json()["keywords"]
    assert "подписка" in keywords

    reset = client.delete("/api/settings/keywords")
    assert reset.status_code == 200
    assert client.get("/api/settings/keywords").get_json()["keywords"] == []

    # Старые операции больше не помечаются как повторяющиеся.
    recurring = client.get("/api/transactions?recurring=true").get_json()["transactions"]
    assert recurring == []


def test_wipe_all_data(client):
    _register(client)
    account = _create_account(client, name="Карта").get_json()
    client.post(
        "/api/categories", json={"name": "Подписки", "kind": "expense"}
    )
    _create_tx(client, account["id"], title="Кофе", amount=200)

    wiped = client.delete("/api/settings/data")
    assert wiped.status_code == 200
    assert client.get("/api/accounts").get_json()["accounts"] == []
    assert client.get("/api/transactions").get_json()["transactions"] == []
    assert client.get("/api/categories").get_json()["categories"] == []

    # Аккаунт остаётся авторизованным и может начать заново.
    me = client.get("/api/auth/me")
    assert me.status_code == 200