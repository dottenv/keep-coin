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


def test_create_and_list_accounts(client):
    _register(client)
    resp = _create_account(client)
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["name"] == "Карта"
    assert body["type"] == "card"
    assert body["balance"] == 0

    listing = client.get("/api/accounts")
    assert listing.status_code == 200
    assert [a["id"] for a in listing.get_json()["accounts"]] == [body["id"]]


def test_account_limit_four(client):
    _register(client)
    for i in range(4):
        resp = _create_account(client, name=f"c{i}")
        assert resp.status_code == 201
    fifth = _create_account(client, name="c5")
    assert fifth.status_code == 400
    assert fifth.get_json()["error"] == "account_limit_reached"


def test_account_validation(client):
    _register(client)
    bad = _create_account(client, name="", type="bitcoin")
    assert bad.status_code == 400
    messages = bad.get_json()["messages"]
    assert "account_name_long" in messages["name"]
    assert "invalid_account_type" in messages["type"]


def test_accounts_are_isolated(client):
    _register(client, email="a@example.com")
    _create_account(client, name="Mine")
    _register(client, email="b@example.com")
    listing = client.get("/api/accounts")
    assert listing.get_json()["accounts"] == []


def test_income_and_expense_update_balance(client):
    _register(client)
    account = _create_account(client, name="Карта", type="card").get_json()

    income = client.post(
        "/api/transactions",
        json={
            "type": "income",
            "account_id": account["id"],
            "title": "Зарплата",
            "category": "salary",
            "amount": 100_000,
            "date": "2026-08-10",
        },
    )
    assert income.status_code == 201
    assert income.get_json()["amount"] == 100_000.0

    expense = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "account_id": account["id"],
            "title": "Продукты",
            "category": "food",
            "amount": 2_500,
            "date": "2026-08-11",
        },
    )
    assert expense.status_code == 201

    updated = client.get("/api/accounts").get_json()["accounts"][0]
    assert updated["balance"] == 97_500.0


def test_transfer_moves_money(client):
    _register(client)
    from_acc = _create_account(client, name="Карта").get_json()
    to_acc = _create_account(client, name="Копилка", type="saving").get_json()

    transfer = client.post(
        "/api/transactions",
        json={
            "type": "transfer",
            "account_id": from_acc["id"],
            "to_account_id": to_acc["id"],
            "title": "Перевод",
            "category": "other",
            "amount": 5_000,
            "date": "2026-08-12",
        },
    )
    assert transfer.status_code == 201

    balances = {
        a["id"]: a["balance"] for a in client.get("/api/accounts").get_json()["accounts"]
    }
    assert balances[from_acc["id"]] == -5_000
    assert balances[to_acc["id"]] == 5_000


def test_transfer_validation(client):
    _register(client)
    account = _create_account(client).get_json()

    no_target = client.post(
        "/api/transactions",
        json={
            "type": "transfer",
            "account_id": account["id"],
            "title": "Перевод",
            "amount": 100,
            "date": "2026-08-12",
        },
    )
    assert no_target.status_code == 400
    assert no_target.get_json()["error"] == "transfer_requires_to_account"

    same = client.post(
        "/api/transactions",
        json={
            "type": "transfer",
            "account_id": account["id"],
            "to_account_id": account["id"],
            "title": "Перевод",
            "amount": 100,
            "date": "2026-08-12",
        },
    )
    assert same.status_code == 400
    assert same.get_json()["error"] == "transfer_same_account"


def test_transactions_list_detail_and_summary(client):
    _register(client)
    account = _create_account(client).get_json()
    payload = {
        "type": "expense",
        "account_id": account["id"],
        "title": "Такси",
        "category": "transport",
        "amount": 600,
        "date": "2026-08-10",
    }
    tx = client.post("/api/transactions", json=payload).get_json()

    listing = client.get("/api/transactions")
    assert listing.status_code == 200
    assert [t["id"] for t in listing.get_json()["transactions"]] == [tx["id"]]

    detail = client.get(f"/api/transactions/{tx['id']}")
    assert detail.status_code == 200
    assert detail.get_json()["title"] == "Такси"
    assert detail.get_json()["currency"] == "RUB"

    summary = client.get("/api/transactions/summary").get_json()
    assert summary["total_expense"] == 600
    assert summary["total_income"] == 0
    assert summary["expense_by_category"] == [{"category": "transport", "total": 600}]

    missing = client.get("/api/transactions/00000000-0000-0000-0000-000000000000")
    assert missing.status_code == 404
    assert missing.get_json()["error"] == "transaction_not_found"


def test_tx_validation(client):
    _register(client)
    account = _create_account(client).get_json()
    bad = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "account_id": account["id"],
            "title": "Продукты",
            "amount": 0,
            "date": "not-a-date",
        },
    )
    assert bad.status_code == 400
    messages = bad.get_json()["messages"]
    assert "amount_invalid" in messages["amount"]
    assert "invalid_date" in messages["date"]

    wrong_account = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "account_id": "00000000-0000-0000-0000-000000000000",
            "title": "Продукты",
            "amount": 100,
            "date": "2026-08-10",
        },
    )
    assert wrong_account.status_code == 404


def test_transfer_without_title(client):
    _register(client)
    from_acc = _create_account(client, name="Карта").get_json()
    to_acc = _create_account(client, name="Копилка").get_json()

    resp = client.post(
        "/api/transactions",
        json={
            "type": "transfer",
            "account_id": from_acc["id"],
            "to_account_id": to_acc["id"],
            "amount": 1_000,
            "date": "2026-08-10",
        },
    )
    assert resp.status_code == 201
    assert resp.get_json()["title"] == ""

    income_without_title = client.post(
        "/api/transactions",
        json={
            "type": "income",
            "account_id": from_acc["id"],
            "amount": 1_000,
            "date": "2026-08-10",
        },
    )
    assert income_without_title.status_code == 400
    assert income_without_title.get_json()["error"] == "title_required"


def test_recurring_detection(client):
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
        assert client.post("/api/transactions", json={**payload, "date": month}).status_code == 201

    one_off = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "account_id": account["id"],
            "title": "Разовый кофе",
            "category": "food",
            "amount": 350,
            "date": "2026-08-11",
        },
    ).get_json()

    listing = client.get("/api/transactions").get_json()["transactions"]
    recurring_by_title = {t["title"]: t["recurring"] for t in listing}
    assert recurring_by_title["Подписка"] is True
    assert recurring_by_title["Разовый кофе"] is False
    assert one_off["recurring"] is False


def test_summary_has_monthly_and_recurring(client):
    _register(client)
    account = _create_account(client).get_json()
    client.post(
        "/api/transactions",
        json={
            "type": "income",
            "account_id": account["id"],
            "title": "Зарплата",
            "category": "salary",
            "amount": 50_000,
            "date": "2026-08-01",
        },
    )
    client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "account_id": account["id"],
            "title": "Продукты",
            "category": "food",
            "amount": 3_000,
            "date": "2026-08-02",
        },
    )
    summary = client.get("/api/transactions/summary").get_json()
    assert summary["monthly"][-1]["month"].startswith("2026-08")
    assert summary["monthly"][-1]["income"] == 50_000
    assert summary["monthly"][-1]["expense"] == 3_000
    assert len(summary["monthly"]) == 6
    assert summary["recurring_count"] == 0


def test_finance_requires_auth(client):
    assert client.get("/api/accounts").status_code in (401, 403)
    assert client.get("/api/transactions").status_code in (401, 403)