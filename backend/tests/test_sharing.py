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


def _login(client, email):
    return client.post("/api/auth/login", json={"email": email, "password": "password123"})


def _create_account(client, **overrides):
    payload = {"name": "Общий счёт", "type": "card", "balance": 0, "currency": "RUB"}
    payload.update(overrides)
    return client.post("/api/accounts", json=payload)


def _invite(client, account_id, email, role="editor"):
    return client.post(
        f"/api/accounts/{account_id}/members",
        json={"email": email, "role": role},
    )


def _accept_first(client):
    body = client.get("/api/invites").get_json()
    assert body["invites"], "expected at least one pending invite"
    invite_id = body["invites"][0]["id"]
    resp = client.post(f"/api/invites/{invite_id}/accept")
    assert resp.status_code == 200
    return invite_id


def test_invite_accept_and_visibility(client):
    _register(client, "owner@example.com")
    account = _create_account(client, name="Family").get_json()

    resp = _invite(client, account["id"], "bob@example.com", "editor")
    assert resp.status_code == 201

    # Bob регистрируется и видит приглашение.
    _register(client, "bob@example.com")
    pending = client.get("/api/invites").get_json()["invites"]
    assert len(pending) == 1
    assert pending[0]["account_name"] == "Family"
    assert pending[0]["role"] == "editor"

    _accept_first(client)

    accounts = client.get("/api/accounts").get_json()["accounts"]
    assert len(accounts) == 1
    shared = accounts[0]
    assert shared["role"] == "editor"
    assert shared["is_shared"] is True
    assert shared["owner_name"] == "Anna"


def test_members_list_and_role_change(client):
    _register(client, "owner@example.com")
    account = _create_account(client, name="Family").get_json()
    _invite(client, account["id"], "bob@example.com", "editor")
    _register(client, "bob@example.com")
    _accept_first(client)

    _login(client, "owner@example.com")
    members = client.get(f"/api/accounts/{account['id']}/members").get_json()["members"]
    assert {m["email"]: m["role"] for m in members} == {
        "owner@example.com": "owner",
        "bob@example.com": "editor",
    }
    bob_id = next(m["user_id"] for m in members if m["email"] == "bob@example.com")

    change = client.patch(
        f"/api/accounts/{account['id']}/members/{bob_id}", json={"role": "viewer"}
    )
    assert change.status_code == 200

    members_after = client.get(f"/api/accounts/{account['id']}/members").get_json()["members"]
    bob_role = next(m["role"] for m in members_after if m["email"] == "bob@example.com")
    assert bob_role == "viewer"


def test_owner_only_management(client):
    _register(client, "owner@example.com")
    account = _create_account(client).get_json()
    _invite(client, account["id"], "bob@example.com", "editor")
    _register(client, "bob@example.com")
    _accept_first(client)

    as_member = _invite(client, account["id"], "carol@example.com", "viewer")
    assert as_member.status_code == 403
    assert as_member.get_json()["error"] == "permission_denied"


def test_viewer_cannot_write(client):
    _register(client, "owner@example.com")
    account = _create_account(client).get_json()
    _invite(client, account["id"], "bob@example.com", "viewer")
    _register(client, "bob@example.com")
    _accept_first(client)

    resp = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "account_id": account["id"],
            "title": "Попытка",
            "category": "food",
            "amount": 100,
            "date": "2026-08-10",
        },
    )
    assert resp.status_code == 403
    assert resp.get_json()["error"] == "permission_denied"


def test_editor_can_write_and_owner_sees(client):
    _register(client, "owner@example.com")
    account = _create_account(client, name="Family").get_json()
    _invite(client, account["id"], "bob@example.com", "editor")
    _register(client, "bob@example.com")
    _accept_first(client)

    resp = client.post(
        "/api/transactions",
        json={
            "type": "expense",
            "account_id": account["id"],
            "title": "Продукты",
            "category": "food",
            "amount": 1_000,
            "date": "2026-08-10",
        },
    )
    assert resp.status_code == 201

    # Владелец видит операцию, созданную участником, и обновлённый баланс.
    _login(client, "owner@example.com")
    listing = client.get("/api/transactions").get_json()["transactions"]
    assert len(listing) == 1
    assert listing[0]["title"] == "Продукты"
    owner_accounts = client.get("/api/accounts").get_json()["accounts"]
    assert owner_accounts[0]["balance"] == -1_000


def test_remove_member_revokes_access(client):
    _register(client, "owner@example.com")
    account = _create_account(client).get_json()
    _invite(client, account["id"], "bob@example.com", "editor")
    _register(client, "bob@example.com")
    _accept_first(client)

    _login(client, "owner@example.com")
    members = client.get(f"/api/accounts/{account['id']}/members").get_json()["members"]
    bob_id = next(m["user_id"] for m in members if m["email"] == "bob@example.com")
    removed = client.delete(f"/api/accounts/{account['id']}/members/{bob_id}")
    assert removed.status_code == 200

    _login(client, "bob@example.com")
    assert client.get("/api/accounts").get_json()["accounts"] == []
    missing = client.get(f"/api/accounts/{account['id']}/members")
    assert missing.status_code in (404, 403)


def test_invite_validation(client):
    _register(client, "owner@example.com")
    account = _create_account(client).get_json()

    # Нельзя пригласить себя.
    self_invite = _invite(client, account["id"], "owner@example.com")
    assert self_invite.status_code == 400
    assert self_invite.get_json()["error"] == "cannot_invite_self"

    # Повторное приглашение того же email в ожидании — нельзя.
    assert _invite(client, account["id"], "bob@example.com").status_code == 201
    dup = _invite(client, account["id"], "bob@example.com")
    assert dup.status_code == 400
    assert dup.get_json()["error"] == "already_invited"

    # Некорректный email / роль.
    bad = client.post(
        f"/api/accounts/{account['id']}/members",
        json={"email": "not-an-email", "role": "admin"},
    )
    assert bad.status_code == 400
    messages = bad.get_json()["messages"]
    assert "not_valid_email" in messages["email"]
    assert "invalid_role" in messages["role"]

    # Уже акцептовавший приглашение участник не может быть приглашён снова.
    _invite(client, account["id"], "carol@example.com", "viewer")
    _register(client, "carol@example.com")
    _accept_first(client)
    _login(client, "owner@example.com")
    again = _invite(client, account["id"], "carol@example.com")
    assert again.status_code == 400
    assert again.get_json()["error"] == "already_member"


def test_isolation_third_user(client):
    _register(client, "owner@example.com")
    account = _create_account(client).get_json()
    _register(client, "bob@example.com")
    accounts = client.get("/api/accounts").get_json()["accounts"]
    assert accounts == []
    missing = client.get(f"/api/accounts/{account['id']}/members")
    assert missing.status_code in (404, 403)


def test_transfer_requires_access_on_both(client):
    _register(client, "owner@example.com")
    shared = _create_account(client, name="Shared").get_json()
    _invite(client, shared["id"], "bob@example.com", "viewer")
    _register(client, "bob@example.com")
    _accept_first(client)
    own = _create_account(client, name="Mine").get_json()

    transfer = client.post(
        "/api/transactions",
        json={
            "type": "transfer",
            "account_id": own["id"],
            "to_account_id": shared["id"],
            "title": "Перевод",
            "amount": 500,
            "date": "2026-08-10",
        },
    )
    assert transfer.status_code == 403
    assert transfer.get_json()["error"] == "permission_denied"


def test_wipe_removes_membership(client):
    _register(client, "owner@example.com")
    account = _create_account(client).get_json()
    _invite(client, account["id"], "bob@example.com", "editor")
    _register(client, "bob@example.com")
    _accept_first(client)
    assert len(client.get("/api/accounts").get_json()["accounts"]) == 1

    wipe = client.delete("/api/settings/data")
    assert wipe.status_code == 200
    assert client.get("/api/accounts").get_json()["accounts"] == []
    # Чужие счета не тронуты: у владельца счёт на месте без этого участника.
    _login(client, "owner@example.com")
    owner_accounts = client.get("/api/accounts").get_json()["accounts"]
    assert len(owner_accounts) == 1