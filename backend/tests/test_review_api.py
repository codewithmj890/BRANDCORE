"""
M5-05 â€” Content Review API integration tests.

Tests:
- POST /api/workspaces/{workspace_id}/content/{content_version_id}/review
- GET  /api/workspaces/{workspace_id}/content/{content_version_id}/review

Against real SQLite through SqliteD1Wrapper + TestClient.
"""
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
    # Content item + version for review tests
    conn.execute(
        "INSERT INTO content_item (id, workspace_id, title, status, created_by, created_at, updated_at) "
        "VALUES ('ci-1', 'ws-1', 'Test Content', 'active', 'creator', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO content_version (id, workspace_id, content_item_id, version_number, body_text, sha256_hash, submitted_by, created_at) "
        "VALUES ('cv-1', 'ws-1', 'ci-1', 1, 'Test body', 'abc123', 'creator', '2026-01-01T00:00:00Z')"
    )
    conn.commit()
    return conn


def _make_client(db_conn, org_role="admin", user_id="user-1", org_id="org-1"):
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
            user_id=user_id, email="test@example.com", org_id=org_id,
            org_role=org_role, org_permissions=[],
            claims={"sub": user_id, "org_id": org_id, "org_role": org_role},
        )

    app.dependency_overrides[get_current_clerk_user] = mock_clerk_user
    return TestClient(app), wrapper


class TestReviewSubmit:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_submit_review_approved_returns_201(self):
        resp = self.client.post("/api/workspaces/ws-1/content/cv-1/review", json={
            "decision": "APPROVED",
            "reviewer_role": "reviewer",
            "notes": "Looks good",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["decision"] == "APPROVED"
        assert data["content_version_id"] == "cv-1"
        assert "review_decision_id" in data
        assert "created_at" in data

    def test_submit_review_rejected_returns_201(self):
        resp = self.client.post("/api/workspaces/ws-1/content/cv-1/review", json={
            "decision": "REJECTED",
            "reviewer_role": "reviewer",
            "notes": "Needs work",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["decision"] == "REJECTED"

    def test_submit_review_changes_requested_returns_201(self):
        resp = self.client.post("/api/workspaces/ws-1/content/cv-1/review", json={
            "decision": "CHANGES_REQUESTED",
            "reviewer_role": "reviewer",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["decision"] == "CHANGES_REQUESTED"

    def test_submit_review_invalid_decision_400(self):
        resp = self.client.post("/api/workspaces/ws-1/content/cv-1/review", json={
            "decision": "INVALID",
        })
        assert resp.status_code == 400

    def test_submit_review_version_not_found_404(self):
        resp = self.client.post("/api/workspaces/ws-1/content/cv-nonexistent/review", json={
            "decision": "APPROVED",
        })
        assert resp.status_code == 404

    def test_submit_review_duplicate_409(self):
        # First submission
        self.client.post("/api/workspaces/ws-1/content/cv-1/review", json={
            "decision": "APPROVED",
        })
        # Duplicate
        resp = self.client.post("/api/workspaces/ws-1/content/cv-1/review", json={
            "decision": "REJECTED",
        })
        assert resp.status_code == 409

    def test_submit_review_non_admin_403(self):
        # Override with org:member (not admin)
        self.conn.close()
        app.dependency_overrides.clear()
        conn2 = _setup_test_db()
        client2, _ = _make_client(conn2, org_role="member", user_id="user-2", org_id="org-1")
        # Need org mapping for org-1 on ws-1 (already exists from _setup_test_db)
        resp = client2.post("/api/workspaces/ws-1/content/cv-1/review", json={
            "decision": "APPROVED",
        })
        assert resp.status_code == 403
        conn2.close()


class TestReviewGet:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_get_review_empty(self):
        resp = self.client.get("/api/workspaces/ws-1/content/cv-1/review")
        assert resp.status_code == 200
        data = resp.json()
        assert "decisions" in data
        assert data["decisions"] == []

    def test_get_review_with_decision(self):
        self.client.post("/api/workspaces/ws-1/content/cv-1/review", json={
            "decision": "APPROVED",
            "reviewer_role": "reviewer",
            "notes": "Approved",
        })
        resp = self.client.get("/api/workspaces/ws-1/content/cv-1/review")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["decisions"]) == 1
        assert data["decisions"][0]["decision"] == "APPROVED"

