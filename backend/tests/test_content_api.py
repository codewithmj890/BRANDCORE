"""
M5-05 â€” Content API integration tests.

Tests:
- POST   /api/workspaces/{workspace_id}/content
- GET    /api/workspaces/{workspace_id}/content
- GET    /api/workspaces/{workspace_id}/content/{content_item_id}
- GET    /api/workspaces/{workspace_id}/content/{content_item_id}/versions
- GET    /api/workspaces/{workspace_id}/content/{content_item_id}/versions/{version_number}

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


class TestContentCreate:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_create_content_returns_201(self):
        resp = self.client.post("/api/workspaces/ws-1/content", json={
            "title": "Summer Campaign",
            "body_text": "Lumora Glow Cream reduces dark spots by up to 30 percent in 8 weeks.",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert "content_item_id" in data
        assert "content_version_id" in data
        assert "sha256_hash" in data
        assert "created_at" in data
        assert data["content_version_id"].startswith("cv-")
        assert data["content_item_id"].startswith("ci-")

    def test_create_content_missing_title_400(self):
        resp = self.client.post("/api/workspaces/ws-1/content", json={
            "title": "",
            "body_text": "Some body text",
        })
        assert resp.status_code == 400

    def test_create_content_missing_body_400(self):
        resp = self.client.post("/api/workspaces/ws-1/content", json={
            "title": "Test",
            "body_text": "",
        })
        assert resp.status_code == 400


class TestContentList:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)
        # Create a content item first
        self.client.post("/api/workspaces/ws-1/content", json={
            "title": "Campaign A", "body_text": "Body A"
        })

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_list_content_returns_200(self):
        resp = self.client.get("/api/workspaces/ws-1/content")
        assert resp.status_code == 200
        data = resp.json()
        assert "content_items" in data
        assert len(data["content_items"]) >= 1


class TestContentGet:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)
        create_resp = self.client.post("/api/workspaces/ws-1/content", json={
            "title": "Campaign A", "body_text": "Body A"
        })
        self.item_id = create_resp.json()["content_item_id"]

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_get_content_returns_200(self):
        resp = self.client.get(f"/api/workspaces/ws-1/content/{self.item_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == self.item_id
        assert data["title"] == "Campaign A"


class TestContentVersions:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)
        create_resp = self.client.post("/api/workspaces/ws-1/content", json={
            "title": "Campaign A", "body_text": "Body A v1"
        })
        self.item_id = create_resp.json()["content_item_id"]
        self.version_id = create_resp.json()["content_version_id"]

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_list_versions_returns_200(self):
        resp = self.client.get(f"/api/workspaces/ws-1/content/{self.item_id}/versions")
        assert resp.status_code == 200
        data = resp.json()
        assert "versions" in data
        assert len(data["versions"]) == 1
        assert data["versions"][0]["version_number"] == 1
        assert data["versions"][0]["id"] == self.version_id

    def test_get_version_by_number_returns_200(self):
        resp = self.client.get(f"/api/workspaces/ws-1/content/{self.item_id}/versions/1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["version_number"] == 1
        assert data["body_text"] == "Body A v1"
        assert "sha256_hash" in data

    def test_get_version_not_found(self):
        resp = self.client.get(f"/api/workspaces/ws-1/content/{self.item_id}/versions/999")
        assert resp.status_code == 404

    def test_get_versions_cross_workspace(self):
        # ws-2 doesn't exist -> 404
        resp = self.client.get("/api/workspaces/ws-2/content/ci-test/versions")
        assert resp.status_code == 404
