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


def _register(client, email="a@example.com", password="password123", name="Anna", locale="ru"):
    return client.post(
        "/api/auth/register",
        json={
            "email": email,
            "password": password,
            "display_name": name,
            "locale": locale,
        },
    )


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.get_json()["status"] == "ok"


def test_register_sets_cookies_and_me_works(client):
    resp = _register(client)
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["email"] == "a@example.com"
    assert body["display_name"] == "Anna"
    assert "access_token_cookie" in resp.headers.getlist("Set-Cookie")[0]
    assert "refresh_token_cookie" in resp.headers.getlist("Set-Cookie")[1]

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.get_json()["id"] == body["id"]


def test_register_rejects_duplicate_email(client):
    assert _register(client).status_code == 201
    resp = _register(client, name="Copy")
    assert resp.status_code == 400
    messages = resp.get_json()["messages"]
    assert "email_taken" in messages["email"]


def test_register_validation(client):
    resp = _register(client, email="bad-email", name="A")
    assert resp.status_code == 400
    assert "not_valid_email" in resp.get_json()["messages"]["email"]
    assert "display_name_short" in resp.get_json()["messages"]["display_name"]


def test_login_flow(client):
    _register(client)
    bad = client.post(
        "/api/auth/login", json={"email": "a@example.com", "password": "wrong"}
    )
    assert bad.status_code == 401
    assert bad.get_json()["error"] == "invalid_credentials"

    ok = client.post(
        "/api/auth/login", json={"email": "a@example.com", "password": "password123"}
    )
    assert ok.status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_refresh_and_logout(client):
    _register(client)
    refresh = client.post("/api/auth/refresh")
    assert refresh.status_code == 200
    assert client.get("/api/auth/me").status_code == 200

    logout = client.post("/api/auth/logout")
    assert logout.status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_update_profile(client):
    _register(client)
    resp = client.put("/api/auth/me", json={"display_name": "Анна П.", "locale": "en"})
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["display_name"] == "Анна П."
    assert body["locale"] == "en"

    bad = client.put("/api/auth/me", json={"display_name": "A"})
    assert bad.status_code == 400
    assert "display_name_short" in bad.get_json()["messages"]["display_name"]

    bad_locale = client.put("/api/auth/me", json={"locale": "fr"})
    assert bad_locale.status_code == 400

    me = client.get("/api/auth/me").get_json()
    assert me["display_name"] == "Анна П."
    assert me["locale"] == "en"


def test_update_profile_requires_auth(client):
    resp = client.put("/api/auth/me", json={"display_name": "Anonymous"})
    assert resp.status_code in (401, 403)