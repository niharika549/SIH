"""Phase 1 Foundation backend tests — SkillAlign auth & RBAC.

Covers: /api/auth/roles, /api/auth/register, /api/auth/login,
/api/auth/me, /api/admin/access-check
"""
import os
import uuid

import pytest
import requests
from pymongo import MongoClient


def _load_base_url() -> str:
    for line in open("/app/frontend/.env"):
        if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
            return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL missing in frontend/.env")


BASE_URL = _load_base_url()
API = f"{BASE_URL}/api"

# Seeded credentials (see /app/memory/test_credentials.md)
ADMIN = {"email": "admin@skillalign.in", "password": "SkillAlign@Admin2026"}
TRAINEE = {"email": "trainee.test@skillalign.in", "password": "Trainee@Test2026"}
EMPLOYER_PENDING = {"email": "employer.test@skillalign.in", "password": "Employer@Test2026"}

RUN = uuid.uuid4().hex[:8]
TEST_TRAINEE_EMAIL = f"TEST_trainee.{RUN}@skillalign.in"
TEST_EMPLOYER_EMAIL = f"TEST_employer.{RUN}@skillalign.in"


@pytest.fixture(scope="session")
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    yield session
    # Cleanup: remove TEST_-prefixed users created during this run
    mongo = MongoClient("mongodb://localhost:27017")
    result = mongo["test_database"].users.delete_many({"email": {"$regex": f"^TEST_.*{RUN}"}})
    print(f"\nCleanup: removed {result.deleted_count} test users")


def _login(client, creds):
    resp = client.post(f"{API}/auth/login", json=creds)
    assert resp.status_code == 200, f"Login failed for {creds['email']}: {resp.text}"
    return resp.json()["access_token"]


# ---------- /api/auth/roles ----------
class TestRoles:
    def test_roles_returns_four_registerable_roles(self, api_client):
        resp = api_client.get(f"{API}/auth/roles")
        assert resp.status_code == 200
        values = [r["value"] for r in resp.json()]
        assert sorted(values) == ["EMPLOYER", "GOVERNMENT", "TRAINEE", "TRAINER"]
        assert "ADMIN" not in values


# ---------- /api/auth/register ----------
class TestRegister:
    def test_trainee_registers_active_with_token(self, api_client):
        resp = api_client.post(f"{API}/auth/register", json={
            "full_name": "TEST UI Trainee", "email": TEST_TRAINEE_EMAIL,
            "password": "Test@12345", "role": "TRAINEE"})
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["access_token"], "TRAINEE must receive access_token"
        assert data["user"]["account_status"] == "ACTIVE"
        assert data["user"]["role"] == "TRAINEE"
        assert data["user"]["email"] == TEST_TRAINEE_EMAIL.lower()  # backend lowercases emails
        assert data["message"] is None

    def test_employer_registers_pending_without_token(self, api_client):
        resp = api_client.post(f"{API}/auth/register", json={
            "full_name": "TEST UI Employer", "email": TEST_EMPLOYER_EMAIL,
            "password": "Test@12345", "role": "EMPLOYER"})
        assert resp.status_code == 201, resp.text
        data = resp.json()
        assert data["access_token"] is None, "PENDING employer must NOT get a token"
        assert data["user"]["account_status"] == "PENDING"
        assert data["message"] and "verification" in data["message"].lower()

    def test_admin_self_register_rejected(self, api_client):
        resp = api_client.post(f"{API}/auth/register", json={
            "full_name": "TEST Admin Attempt", "email": f"TEST_admin.{RUN}@skillalign.in",
            "password": "Test@12345", "role": "ADMIN"})
        assert resp.status_code == 403, resp.text

    def test_duplicate_email_rejected(self, api_client):
        resp = api_client.post(f"{API}/auth/register", json={
            "full_name": "TEST Duplicate", "email": TRAINEE["email"],
            "password": "Test@12345", "role": "TRAINEE"})
        assert resp.status_code == 409, resp.text

    def test_short_password_rejected(self, api_client):
        resp = api_client.post(f"{API}/auth/register", json={
            "full_name": "TEST Short", "email": f"TEST_short.{RUN}@skillalign.in",
            "password": "short", "role": "TRAINEE"})
        assert resp.status_code == 422, resp.text

    def test_invalid_email_rejected(self, api_client):
        resp = api_client.post(f"{API}/auth/register", json={
            "full_name": "TEST BadEmail", "email": "not-an-email",
            "password": "Test@12345", "role": "TRAINEE"})
        assert resp.status_code == 422, resp.text


# ---------- /api/auth/login ----------
class TestLogin:
    def test_valid_trainee_login_returns_token(self, api_client):
        resp = api_client.post(f"{API}/auth/login", json=TRAINEE)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["access_token"]
        assert data["user"]["email"] == TRAINEE["email"]
        assert data["user"]["account_status"] == "ACTIVE"

    def test_wrong_password_rejected(self, api_client):
        resp = api_client.post(f"{API}/auth/login", json={
            "email": TRAINEE["email"], "password": "WrongPass123"})
        assert resp.status_code == 401, resp.text

    def test_pending_employer_login_blocked(self, api_client):
        resp = api_client.post(f"{API}/auth/login", json=EMPLOYER_PENDING)
        assert resp.status_code == 403, resp.text
        assert "pending" in resp.json()["detail"].lower()


# ---------- /api/auth/me ----------
class TestMe:
    def test_me_returns_user_without_mongo_id(self, api_client):
        token = _login(api_client, TRAINEE)
        resp = api_client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert data["email"] == TRAINEE["email"]
        assert data["role"] == "TRAINEE"
        assert "_id" not in data, "Mongo _id leaked in response"
        assert "password_hash" not in data, "password_hash leaked in response"

    def test_me_invalid_token_rejected(self, api_client):
        resp = api_client.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401

    def test_me_no_token_rejected(self, api_client):
        resp = api_client.get(f"{API}/auth/me")
        assert resp.status_code == 401


# ---------- /api/admin/access-check ----------
class TestAdminAccessCheck:
    def test_admin_token_authorized(self, api_client):
        token = _login(api_client, ADMIN)
        resp = api_client.get(f"{API}/admin/access-check", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200, resp.text
        assert resp.json()["authorized"] is True
        assert resp.json()["role"] == "ADMIN"

    def test_trainee_token_forbidden(self, api_client):
        token = _login(api_client, TRAINEE)
        resp = api_client.get(f"{API}/admin/access-check", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 403, resp.text

    def test_no_token_unauthorized(self, api_client):
        resp = api_client.get(f"{API}/admin/access-check")
        assert resp.status_code == 401
