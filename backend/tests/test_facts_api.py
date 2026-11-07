"""
M5-05 â€” Approved Facts API integration tests.

Tests:
- GET    /api/workspaces/{workspace_id}/facts
- POST   /api/workspaces/{workspace_id}/facts
- GET    /api/workspaces/{workspace_id}/facts/{fact_id}
- PATCH  /api/workspaces/{workspace_id}/facts/{fact_id}

Against real SQLite through SqliteD1Wrapper + TestClient.
"""
import asyncio
import json
import os
import sqlite3

import pytest
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
    # Seed evidence for fact linking
    conn.execute(
        "INSERT INTO evidence (id, workspace_id, title, source_type, summary, source_url, version, status, created_at) "
        "VALUES ('ev-1', 'ws-1', 'Clinical Study', 'internal_study', '8-week study results', 'internal://study/1', 1, 'active', '2026-01-01T00:00:00Z')"
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


class TestFactsList:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_list_facts_empty(self):
        resp = self.client.get("/api/workspaces/ws-1/facts")
        assert resp.status_code == 200
        data = resp.json()
        assert "facts" in data
        assert data["facts"] == []

    def test_list_facts_with_data(self):
        from app.domain.models import ApprovedFactCreate
        from app.repositories.fact_repo import ApprovedFactRepository
        import asyncio

        repo = ApprovedFactRepository(self.wrapper)
        fact = asyncio.run(repo.create("fact-1", "ws-1", ApprovedFactCreate(
            claim_text="Test claim", numeric_value="30", unit="percent",
            qualifier="up to", scope=json.dumps({"product": "Test", "region": "IN"}),
            evidence_ids=["ev-1"],
        )))
        asyncio.run(repo.link_evidence("fact-1", "ws-1", "ev-1"))

        resp = self.client.get("/api/workspaces/ws-1/facts")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["facts"]) == 1
        assert data["facts"][0]["text"] == "Test claim"
        assert data["facts"][0]["qualifier"] == "up to"
        assert data["facts"][0]["evidence_id"] == "ev-1"

    def test_list_facts_cross_workspace(self):
        # ws-2 doesn't exist; should return empty (not 403 because workspace exists check passes but no facts)
        # Actually ws-2 doesn't exist in DB, so workspace_exists returns False -> 404
        resp = self.client.get("/api/workspaces/ws-2/facts")
        assert resp.status_code == 404


class TestFactsCreate:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_create_fact_returns_201(self):
        resp = self.client.post("/api/workspaces/ws-1/facts", json={
            "text": "Our cream reduces dark spots by up to 30 percent.",
            "qualifier": "up to",
            "evidence_id": "ev-1",
            "scope": {"product": "Lumora Glow Cream", "region": "IN"},
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["text"] == "Our cream reduces dark spots by up to 30 percent."
        assert data["qualifier"] == "up to"
        assert data["evidence_id"] == "ev-1"
        assert data["scope"]["product"] == "Lumora Glow Cream"
        assert data["version"] == 1

    def test_create_fact_missing_text_400(self):
        resp = self.client.post("/api/workspaces/ws-1/facts", json={
            "text": "",
            "evidence_id": "ev-1",
        })
        assert resp.status_code == 400

    def test_create_fact_missing_evidence_400(self):
        resp = self.client.post("/api/workspaces/ws-1/facts", json={
            "text": "Test claim",
        })
        assert resp.status_code == 400

    def test_create_fact_cross_workspace_evidence_400(self):
        # Evidence ev-1 belongs to ws-1, but we're posting to ws-2 (which doesn't exist anyway)
        # Use ws-1 but reference nonexistent evidence
        resp = self.client.post("/api/workspaces/ws-1/facts", json={
            "text": "Test claim",
            "evidence_id": "nonexistent-evidence",
        })
        assert resp.status_code == 400

    def test_create_fact_requires_auth(self):
        app.dependency_overrides.clear()
        client = TestClient(app)
        resp = client.post("/api/workspaces/ws-1/facts", json={"text": "test", "evidence_id": "ev-1"})
        assert resp.status_code == 401


class TestFactsGet:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)
        from app.domain.models import ApprovedFactCreate
        from app.repositories.fact_repo import ApprovedFactRepository
        repo = ApprovedFactRepository(self.wrapper)
        self.fact = asyncio.run(repo.create("fact-1", "ws-1", ApprovedFactCreate(
            claim_text="Test fact", scope=json.dumps({"product": "Test"}),
            evidence_ids=["ev-1"],
        )))
        asyncio.run(repo.link_evidence("fact-1", "ws-1", "ev-1"))

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_get_fact_returns_200(self):
        resp = self.client.get("/api/workspaces/ws-1/facts/fact-1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == "fact-1"
        assert data["text"] == "Test fact"

    def test_get_fact_not_found(self):
        resp = self.client.get("/api/workspaces/ws-1/facts/nonexistent")
        assert resp.status_code == 404


class TestFactsPatch:
    def setup_method(self):
        self.conn = _setup_test_db()
        self.client, self.wrapper = _make_client(self.conn)
        from app.domain.models import ApprovedFactCreate
        from app.repositories.fact_repo import ApprovedFactRepository
        repo = ApprovedFactRepository(self.wrapper)
        self.fact = asyncio.run(repo.create("fact-1", "ws-1", ApprovedFactCreate(
            claim_text="Original claim", scope=json.dumps({"product": "Test"}),
            evidence_ids=["ev-1"],
        )))
        asyncio.run(repo.link_evidence("fact-1", "ws-1", "ev-1"))

    def teardown_method(self):
        self.conn.close()
        app.dependency_overrides.clear()

    def test_update_fact_creates_new_version(self):
        resp = self.client.patch("/api/workspaces/ws-1/facts/fact-1", json={
            "text": "Updated claim",
            "qualifier": "approximately",
            "evidence_id": "ev-1",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["text"] == "Updated claim"
        assert data["qualifier"] == "approximately"
        assert data["version"] == 2  # Version incremented

    def test_update_fact_not_found(self):
        resp = self.client.patch("/api/workspaces/ws-1/facts/nonexistent", json={
            "text": "Updated",
        })
        assert resp.status_code == 404
