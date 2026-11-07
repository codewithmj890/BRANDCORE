"""
M5-05 â€” Release API integration tests.

Tests:
- GET /api/workspaces/{workspace_id}/releases
- GET /api/workspaces/{workspace_id}/releases/{release_id}
- GET /api/workspaces/{workspace_id}/releases/{release_id}/stale-impact

Against real SQLite through SqliteD1Wrapper + TestClient.
"""
import hashlib
import json
import os
import sqlite3

from fastapi.testclient import TestClient

from app.main import app
from app.auth.clerk import ClerkUser
from app.auth.dependencies import get_current_clerk_user
from app.repositories.base import SqliteD1Wrapper


def _setup_test_db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON")
    mig_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "database", "migrations")
    )
    for name in sorted(os.listdir(mig_dir)):
        if name.endswith(".sql"):
            with open(os.path.join(mig_dir, name), encoding="utf-8") as f:
                conn.executescript(f.read())
    conn.execute(
        "INSERT INTO workspace (id, name, slug, demo_flag, status, created_at, updated_at) "
        "VALUES ('ws-1', 'Lumora Skincare', 'lumora-skincare', 1, 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO workspace_org_mapping (id, workspace_id, org_id, created_by, created_at) "
        "VALUES ('map-1', 'ws-1', 'org-1', 'user-1', '2026-01-01T00:00:00Z')"
    )
    # Content item + version
    conn.execute(
        "INSERT INTO content_item (id, workspace_id, title, status, created_by, created_at, updated_at) "
        "VALUES ('ci-1', 'ws-1', 'Test Content', 'active', 'creator', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO content_version (id, workspace_id, content_item_id, version_number, body_text, sha256_hash, submitted_by, created_at) "
        "VALUES ('cv-1', 'ws-1', 'ci-1', 1, 'Test body', 'sha256hash123', 'creator', '2026-01-01T00:00:00Z')"
    )
    # Policy
    conn.execute(
        "INSERT INTO policy (id, workspace_id, name, description, rules_json, version, status, previous_version_id, created_by, created_at) "
        "VALUES ('pol-1', 'ws-1', 'Brand Voice', 'Marketing claims policy', '[]', 1, 'active', NULL, 'brand_admin', '2026-01-01T00:00:00Z')"
    )
    # Audit event referenced by passport FK
    conn.execute(
        "INSERT INTO audit_event (id, workspace_id, actor_id, actor_role, action, entity_type, entity_id, details, correlation_id, created_at) "
        "VALUES ('audit-1', 'ws-1', 'reviewer-1', 'reviewer', 'create_release_passport', 'release_passport', 'rp-1', '{}', 'corr-1', '2026-01-01T00:00:00Z')"
    )
    # Release passport (valid)
    conn.execute(
        "INSERT INTO release_passport (id, workspace_id, content_item_id, content_version_id, content_sha256, policy_version_id, fact_evidence_versions, finding_ids_and_dispositions, approver_id, approver_role, decision_timestamp, audit_reference, status, created_at) "
        "VALUES ('rp-1', 'ws-1', 'ci-1', 'cv-1', 'sha256hash123', 'pol-1', '[]', '[]', 'reviewer-1', 'reviewer', '2026-01-01T00:00:00Z', 'audit-1', 'valid', '2026-01-01T00:00:00Z')"
    )
    # Status event
    conn.execute(
        "INSERT INTO release_status_event (id, workspace_id, passport_id, passport_workspace, status, reason, timestamp) "
        "VALUES ('evt-1', 'ws-1', 'rp-1', 'ws-1', 'approved', 'Human approved', '2026-01-01T00:00:00Z')"
    )
    conn.commit()
    return conn


def _make_client(db_conn):
    wrapper = SqliteD1Wrapper(db_conn)
    app.state.DB = wrapper
    app.state.BRANDCORE_ENV = "development"

    class _Env:
        def __init__(self, db):
            self.DB = db
            self.BRANDCORE_ENV = "development"
            self.CLERK_ISSUER_URL = "https://clerk.example.com"
    _env = _Env(wrapper)
    async def _inject_env(request, call_next):
        request.scope["env"] = getattr(app.state, "_bc_env", _env)
        return await call_next(request)
    # Install once per app instance guard
    if not getattr(app.state, "_bc_env_mw", False):
        from starlette.middleware.base import BaseHTTPMiddleware
        class _MW(BaseHTTPMiddleware):
            async def dispatch(self, request, call_next):
                request.scope["env"] = getattr(app.state, "_bc_env", _env)
                return await call_next(request)
        app.add_middleware(_MW)
        app.state._bc_env_mw = True
    app.state._bc_env = _env
    app.state._bc_env = _env

    def mock_clerk_user():
        return ClerkUser(
            user_id="user-1", email="test@example.com", org_id="org-1",
            org_role="org:admin", org_permissions=[],
            claims={"sub": "user-1", "org_id": "org-1", "org_role": "org:admin"},
        )

    app.dependency_overrides[get_current_clerk_user] = mock_clerk_user
    return TestClient(app), wrapper


class TestReleasesList:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_list_releases_returns_200(self):
        resp = self.client.get("/api/workspaces/ws-1/releases")
        assert resp.status_code == 200
        data = resp.json()
        assert "releases" in data
        assert len(data["releases"]) == 1

    def test_list_releases_shape(self):
        resp = self.client.get("/api/workspaces/ws-1/releases")
        data = resp.json()
        release = data["releases"][0]
        assert release["id"] == "rp-1"
        assert release["status"] == "valid"
        assert release["content_version_id"] == "cv-1"


class TestReleaseGet:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_get_release_returns_200(self):
        resp = self.client.get("/api/workspaces/ws-1/releases/rp-1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "rp-1"
        assert data["content_version_id"] == "cv-1"
        assert data["status"] == "valid"

    def test_get_release_not_found(self):
        resp = self.client.get("/api/workspaces/ws-1/releases/nonexistent")
        assert resp.status_code == 404


class TestStaleImpact:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_stale_impact_valid_release(self):
        resp = self.client.get("/api/workspaces/ws-1/releases/rp-1/stale-impact")
        assert resp.status_code == 200
        data = resp.json()
        assert data["release_id"] == "rp-1"
        assert data["status"] == "VALID"
        assert data["revalidation_required"] is False
        assert "status_events" in data

    def test_stale_impact_not_found(self):
        resp = self.client.get("/api/workspaces/ws-1/releases/nonexistent/stale-impact")
        assert resp.status_code == 404

    def test_stale_impact_workspace_not_found(self):
        resp = self.client.get("/api/workspaces/ws-nonexistent/releases/rp-1/stale-impact")
        assert resp.status_code == 404


class TestReleaseCreation:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.conn.execute(
            "INSERT INTO content_version "
            "(id, workspace_id, content_item_id, version_number, body_text, sha256_hash, submitted_by, created_at) "
            "VALUES ('cv-2', 'ws-1', 'ci-1', 2, 'Second body', 'unused', 'creator', '2026-01-02T00:00:00Z')"
        )
        self.conn.execute(
            "INSERT INTO review_decision "
            "(id, workspace_id, content_version_id, reviewer_id, reviewer_role, decision, "
            "rationale, notes, analysis_batch_id, created_at) "
            "VALUES ('rd-1', 'ws-1', 'cv-2', 'reviewer-1', 'org:admin', 'approved', "
            "'Looks good', NULL, NULL, '2026-01-01T00:00:00Z')"
        )
        self.conn.commit()
        self.client, self.wrapper = _make_client(self.conn)

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_create_release_computes_server_hash_and_records_event(self):
        response = self.client.post(
            "/api/workspaces/ws-1/releases",
            json={
                "content_version_id": "cv-2",
                "policy_version_id": "pol-1",
                "fact_evidence_versions": [{"fact_id": "fact-1", "version": 1}],
                "finding_ids_and_dispositions": [],
                "content_sha256": "attacker-controlled-value",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["content_sha256"] == hashlib.sha256(b"Second body").hexdigest()
        assert data["status"] == "valid"
        event = self.conn.execute(
            "SELECT status FROM release_status_event WHERE passport_id = ?",
            (data["id"],),
        ).fetchone()
        assert event["status"] == "approved"

    def test_create_release_requires_human_approval(self):
        self.conn.execute("DELETE FROM review_decision")
        self.conn.commit()
        response = self.client.post(
            "/api/workspaces/ws-1/releases",
            json={"content_version_id": "cv-2", "policy_version_id": "pol-1"},
        )
        assert response.status_code == 409
