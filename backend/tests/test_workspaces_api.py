"""
M5-05 â€” Workspace API integration tests.

Tests GET /api/workspaces/{workspace_id} against a real SQLite database
through SqliteD1Wrapper, using FastAPI TestClient with auth dependency overrides.
"""
import asyncio
import os
import sqlite3

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.auth.clerk import ClerkUser
from app.auth.dependencies import get_current_clerk_user
from app.repositories.base import SqliteD1Wrapper


# ---------------------------------------------------------------------------
# Test database setup
# ---------------------------------------------------------------------------

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
    # Seed workspace + org mapping
    conn.execute(
        "INSERT INTO workspace (id, name, slug, demo_flag, status, created_at, updated_at) "
        "VALUES ('ws-1', 'Lumora Skincare', 'lumora-skincare', 1, 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO workspace_org_mapping (id, workspace_id, org_id, created_by, created_at) "
        "VALUES ('map-1', 'ws-1', 'org-1', 'user-1', '2026-01-01T00:00:00Z')"
    )
    # Seed second workspace for cross-workspace tests
    conn.execute(
        "INSERT INTO workspace (id, name, slug, demo_flag, status, created_at, updated_at) "
        "VALUES ('ws-2', 'Other Brand', 'other-brand', 1, 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO workspace_org_mapping (id, workspace_id, org_id, created_by, created_at) "
        "VALUES ('map-2', 'ws-2', 'org-2', 'user-2', '2026-01-01T00:00:00Z')"
    )
    conn.commit()
    return conn


def _make_client(db_conn):
    """Create a TestClient with auth overridden to return a mock Clerk user."""
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
            user_id="user-1",
            email="test@example.com",
            org_id="org-1",
            org_role="org:admin",
            org_permissions=[],
            claims={"sub": "user-1", "org_id": "org-1", "org_role": "org:admin"},
        )

    app.dependency_overrides[get_current_clerk_user] = mock_clerk_user
    return TestClient(app), wrapper


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestWorkspaceGet:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_get_workspace_returns_200(self):
        resp = self.client.get("/api/workspaces/ws-1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "ws-1"
        assert data["name"] == "Lumora Skincare"

    def test_get_workspace_not_found(self):
        resp = self.client.get("/api/workspaces/nonexistent")
        assert resp.status_code == 404

    def test_get_workspace_cross_org_403(self):
        # user-1 is in org-1, ws-2 is mapped to org-2
        resp = self.client.get("/api/workspaces/ws-2")
        assert resp.status_code == 403

    def test_get_workspace_requires_auth(self):
        # Remove the override to test unauthenticated access
        app.dependency_overrides.clear()
        client = TestClient(app)
        resp = client.get("/api/workspaces/ws-1")
        assert resp.status_code == 401


class TestWorkspaceAuthIntegration:
    def test_health_endpoint_still_public(self):
        conn = _setup_test_db()
        client = TestClient(app)
        resp = client.get("/api/health")
        assert resp.status_code == 200
        conn.close()
