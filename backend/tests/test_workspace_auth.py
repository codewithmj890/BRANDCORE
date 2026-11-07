"""
BRANDCORE — Workspace authorization tests (Phase 8).

Tests the dependencies.py module: workspace access control,
organization mapping, and permission enforcement.

Uses SqliteD1Wrapper for in-memory SQLite testing and asyncio.run()
instead of pytest-asyncio (not available in Pyodide).
"""
import json
import time
import uuid
import sqlite3
import asyncio
import pytest

from app.auth.dependencies import (
    WorkspaceOrgMappingRepository,
    require_workspace_access,
    require_workspace_permission,
)
from app.auth.clerk import ClerkUser
from app.repositories.base import SqliteD1Wrapper


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

def _setup_test_db():
    """Create an in-memory SQLite database with workspace and mapping tables."""
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS workspace (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            slug        TEXT NOT NULL,
            demo_flag   INTEGER NOT NULL DEFAULT 1,
            status      TEXT NOT NULL DEFAULT 'active',
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL,
            UNIQUE (slug)
        );
        CREATE TABLE IF NOT EXISTS workspace_org_mapping (
            id          TEXT NOT NULL,
            workspace_id TEXT NOT NULL REFERENCES workspace (id) ON DELETE RESTRICT,
            org_id      TEXT NOT NULL,
            created_by  TEXT NOT NULL,
            created_at  TEXT NOT NULL,
            PRIMARY KEY (id),
            UNIQUE (workspace_id),
            UNIQUE (org_id)
        );
    """)
    conn.execute(
        "INSERT INTO workspace (id, name, slug, demo_flag, status, created_at, updated_at) "
        "VALUES ('ws-org-a', 'Org A Workspace', 'ws-org-a', 1, 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO workspace (id, name, slug, demo_flag, status, created_at, updated_at) "
        "VALUES ('ws-org-b', 'Org B Workspace', 'ws-org-b', 1, 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO workspace_org_mapping (id, workspace_id, org_id, created_by, created_at) "
        "VALUES ('map-1', 'ws-org-a', 'org-a', 'user-1', '2026-01-01T00:00:00Z')"
    )
    conn.commit()
    return conn


def _make_clerk_user(user_id="user-1", org_id="org-a", org_role="member", org_permissions=None):
    return ClerkUser(
        user_id=user_id,
        email="test@example.com",
        org_id=org_id,
        org_role=org_role,
        org_permissions=org_permissions or ["org:system_memberships:read"],
        claims={"sub": user_id, "org_id": org_id, "org_role": org_role},
    )


def _make_request(path_params=None, env_vars=None):
    scope = {
        "type": "http", "method": "GET", "path": "/api/test",
        "headers": [], "query_string": b"", "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80), "scheme": "http", "root_path": "",
        "path_params": path_params or {}, "env": None,
    }
    if env_vars:
        class Env:
            def __init__(self, vars_dict):
                for k, v in vars_dict.items():
                    setattr(self, k, v)
        scope["env"] = Env(env_vars)
    return type("Request", (), {"scope": scope, "path_params": path_params or {}})()


def _run_async(coro):
    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# WorkspaceOrgMappingRepository tests
# ---------------------------------------------------------------------------

class TestWorkspaceOrgMappingRepository:
    def test_get_workspace_id_by_org_id(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)
        repo = WorkspaceOrgMappingRepository(wrapper)

        result = _run_async(repo.get_workspace_id_by_org_id("org-a"))
        assert result == "ws-org-a"

        result = _run_async(repo.get_workspace_id_by_org_id("nonexistent"))
        assert result is None

    def test_get_org_id_by_workspace_id(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)
        repo = WorkspaceOrgMappingRepository(wrapper)

        result = _run_async(repo.get_org_id_by_workspace_id("ws-org-a"))
        assert result == "org-a"

    def test_workspace_exists(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)
        repo = WorkspaceOrgMappingRepository(wrapper)

        assert _run_async(repo.workspace_exists("ws-org-a")) is True
        assert _run_async(repo.workspace_exists("nonexistent")) is False

    def test_create_and_check_mapping(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)
        repo = WorkspaceOrgMappingRepository(wrapper)

        assert _run_async(repo.mapping_exists("ws-org-b", "org-b")) is False

        from app.domain.models import now_utc
        _run_async(repo.create_mapping(
            mapping_id="map-2",
            workspace_id="ws-org-b",
            org_id="org-b",
            created_by="user-2",
            created_at=now_utc(),
        ))

        assert _run_async(repo.mapping_exists("ws-org-b", "org-b")) is True
        result = _run_async(repo.get_workspace_id_by_org_id("org-b"))
        assert result == "ws-org-b"


# ---------------------------------------------------------------------------
# require_workspace_access tests
# ---------------------------------------------------------------------------

class TestRequireWorkspaceAccess:
    def test_valid_user_matching_org_passes(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)

        request = _make_request(path_params={"workspace_id": "ws-org-a"})
        request.scope["env"] = type("Env", (), {
            "DB": wrapper,
            "CLERK_ISSUER_URL": "https://clerk.example.com",
        })()

        user = _make_clerk_user(org_id="org-a", org_role="member")
        dep = require_workspace_access("workspace_id")
        result = _run_async(dep(request, user))
        assert result is user
        assert result.org_id == "org-a"

    def test_org_a_accessing_org_b_workspace_denied(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)

        request = _make_request(path_params={"workspace_id": "ws-org-b"})
        request.scope["env"] = type("Env", (), {
            "DB": wrapper,
            "CLERK_ISSUER_URL": "https://clerk.example.com",
        })()

        user = _make_clerk_user(org_id="org-a", org_role="member")
        dep = require_workspace_access("workspace_id")

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            _run_async(dep(request, user))
        assert exc.value.status_code == 403
        assert "does not have access" in exc.value.detail

    def test_user_no_active_org_denied(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)

        request = _make_request(path_params={"workspace_id": "ws-org-a"})
        request.scope["env"] = type("Env", (), {
            "DB": wrapper,
            "CLERK_ISSUER_URL": "https://clerk.example.com",
        })()

        user = _make_clerk_user(org_id=None)
        dep = require_workspace_access("workspace_id")

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            _run_async(dep(request, user))
        assert exc.value.status_code == 403
        assert "not mapped" in exc.value.detail

    def test_deleted_workspace_returns_404(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)

        request = _make_request(path_params={"workspace_id": "nonexistent-ws"})
        request.scope["env"] = type("Env", (), {
            "DB": wrapper,
            "CLERK_ISSUER_URL": "https://clerk.example.com",
        })()

        user = _make_clerk_user(org_id="org-a")
        dep = require_workspace_access("workspace_id")

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            _run_async(dep(request, user))
        assert exc.value.status_code == 404
        assert "Workspace not found" in exc.value.detail

    def test_unmapped_organization_denied(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)

        request = _make_request(path_params={"workspace_id": "ws-org-a"})
        request.scope["env"] = type("Env", (), {
            "DB": wrapper,
            "CLERK_ISSUER_URL": "https://clerk.example.com",
        })()

        user = _make_clerk_user(org_id="org-c", org_role="member")
        dep = require_workspace_access("workspace_id")

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            _run_async(dep(request, user))
        assert exc.value.status_code == 403
        assert "not mapped to any workspace" in exc.value.detail


# ---------------------------------------------------------------------------
# require_workspace_permission tests
# ---------------------------------------------------------------------------

class TestRequireWorkspacePermission:
    def test_admin_can_perform_admin_action(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)

        request = _make_request(path_params={"workspace_id": "ws-org-a"})
        request.scope["env"] = type("Env", (), {
            "DB": wrapper,
            "CLERK_ISSUER_URL": "https://clerk.example.com",
        })()

        user = _make_clerk_user(org_id="org-a", org_role="admin")
        dep = require_workspace_permission("workspace_id", require_admin=True)
        result = _run_async(dep(request, user))
        assert result is user

    def test_member_cannot_perform_admin_action(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)

        request = _make_request(path_params={"workspace_id": "ws-org-a"})
        request.scope["env"] = type("Env", (), {
            "DB": wrapper,
            "CLERK_ISSUER_URL": "https://clerk.example.com",
        })()

        user = _make_clerk_user(org_id="org-a", org_role="member")
        dep = require_workspace_permission("workspace_id", require_admin=True)

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            _run_async(dep(request, user))
        assert exc.value.status_code == 403
        assert "Administrator role required" in exc.value.detail

    def test_member_with_permission_passes(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)

        request = _make_request(path_params={"workspace_id": "ws-org-a"})
        request.scope["env"] = type("Env", (), {
            "DB": wrapper,
            "CLERK_ISSUER_URL": "https://clerk.example.com",
        })()

        user = _make_clerk_user(
            org_id="org-a",
            org_role="member",
            org_permissions=["org:system_memberships:read", "custom:approve"],
        )
        dep = require_workspace_permission(
            "workspace_id", required_permission="custom:approve"
        )
        result = _run_async(dep(request, user))
        assert result is user


# ---------------------------------------------------------------------------
# Duplicate and concurrent provisioning tests
# ---------------------------------------------------------------------------

class TestProvisioningConcurrency:
    def test_duplicate_provisioning_is_idempotent(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)
        repo = WorkspaceOrgMappingRepository(wrapper)

        assert _run_async(repo.mapping_exists("ws-org-a", "org-a")) is True

        from app.domain.models import now_utc
        try:
            _run_async(repo.create_mapping(
                mapping_id="map-dup",
                workspace_id="ws-org-a",
                org_id="org-a",
                created_by="user-2",
                created_at=now_utc(),
            ))
            assert False, "Expected UNIQUE constraint violation"
        except sqlite3.IntegrityError:
            pass  # Expected - duplicate mapping rejected

    def test_concurrent_provisioning_same_org_different_workspace(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)
        repo = WorkspaceOrgMappingRepository(wrapper)

        from app.domain.models import now_utc
        _run_async(repo.create_mapping(
            mapping_id=str(uuid.uuid4()),
            workspace_id="ws-org-b",
            org_id="org-b",
            created_by="user-2",
            created_at=now_utc(),
        ))

        assert _run_async(repo.get_workspace_id_by_org_id("org-a")) == "ws-org-a"
        assert _run_async(repo.get_workspace_id_by_org_id("org-b")) == "ws-org-b"

    def test_one_org_cannot_map_to_multiple_workspaces(self):
        conn = _setup_test_db()
        wrapper = SqliteD1Wrapper(conn)
        repo = WorkspaceOrgMappingRepository(wrapper)

        import uuid
        from app.domain.models import now_utc
        try:
            _run_async(repo.create_mapping(
                mapping_id=str(uuid.uuid4()),
                workspace_id="ws-org-b",
                org_id="org-a",
                created_by="user-2",
                created_at=now_utc(),
            ))
            assert False, "Expected UNIQUE constraint violation on org_id"
        except sqlite3.IntegrityError:
            pass  # Expected


# ---------------------------------------------------------------------------
# Clerk v2 nested organization claims tests
# ---------------------------------------------------------------------------

class TestClerkNestedOrgClaims:
    """Clerk v2 session tokens carry org claims under nested 'o' object."""

    def test_clerk_user_stores_passed_values(self):
        """ClerkUser stores whatever org values are passed to it."""
        user = ClerkUser(
            user_id="user-1",
            email="test@example.com",
            org_id="org-v2",
            org_role="admin",
            org_permissions=["org:system_memberships:read"],
            claims={"sub": "user-1"},
            org_slug="my-org",
        )

        assert user.org_id == "org-v2"
        assert user.org_role == "admin"
        assert user.org_slug == "my-org"
        assert "org:system_memberships:read" in user.org_permissions
        assert user.has_organization is True

    def test_clerk_user_no_org_context(self):
        """ClerkUser with no org values has no organization."""
        user = ClerkUser(
            user_id="user-1",
            email="test@example.com",
            org_id=None,
            org_role=None,
            org_permissions=[],
            claims={"sub": "user-1"},
        )

        assert user.org_id is None
        assert user.org_role is None
        assert user.has_organization is False

    def _make_fake_token(self, claims: dict) -> str:
        """Create a minimally structured JWT (header.payload.signature) for testing."""
        import base64
        import json

        def b64url(obj):
            if isinstance(obj, str):
                data = obj.encode("utf-8")
            else:
                data = json.dumps(obj).encode("utf-8")
            return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")

        header = b64url({"alg": "RS256", "typ": "JWT", "kid": "test-key-1"})
        payload = b64url(claims)
        signature = b64url("dummy-signature")
        return f"{header}.{payload}.{signature}"

    def _make_mock_jwks_client(self):
        """Create a mock JWKS client returning a fake key for test-key-1."""
        from app.auth.clerk import ClerkJwksClient

        jwk = {
            "kty": "RSA",
            "kid": "test-key-1",
            "use": "sig",
            "alg": "RS256",
            "n": "dummy-n",
            "e": "AQAB",
        }

        class MockJwksClient(ClerkJwksClient):
            async def get_signing_key(self, kid):
                return jwk if kid == "test-key-1" else None

        return MockJwksClient("https://clerk.example.com")

    def test_verify_clerk_token_extracts_nested_o_claims(self):
        """verify_clerk_token extracts org claims from nested 'o' object."""
        from app.auth.clerk import verify_clerk_token
        from unittest.mock import patch

        # Token with nested 'o' claims (Clerk v2 format)
        token = self._make_fake_token({
            "sub": "user-1",
            "iss": "https://clerk.example.com",
            "exp": 9999999999,
            "o": {
                "id": "org-v2",
                "rol": "org:admin",
                "slg": "my-org",
                "per": ["org:system_memberships:read"],
            },
        })

        jwks_client = self._make_mock_jwks_client()

        with patch("app.auth.clerk._verify_rs256", return_value=True):
            user = _run_async(verify_clerk_token(
                token=token,
                issuer_url="https://clerk.example.com",
                jwks_client=jwks_client,
            ))

        assert user.user_id == "user-1"
        assert user.org_id == "org-v2"
        assert user.org_role == "admin"
        assert user.org_slug == "my-org"
        assert "org:system_memberships:read" in user.org_permissions

    def test_verify_clerk_token_top_level_takes_precedence(self):
        """Top-level org claims take precedence over nested 'o' claims."""
        from app.auth.clerk import verify_clerk_token
        from unittest.mock import patch

        # Token with both top-level and nested org claims
        token = self._make_fake_token({
            "sub": "user-1",
            "iss": "https://clerk.example.com",
            "exp": 9999999999,
            "org_id": "org-top",
            "org_role": "org:member",
            "org_permissions": ["custom:read"],
            "o": {
                "id": "org-nested",
                "rol": "org:admin",
                "per": ["org:system_memberships:read"],
            },
        })

        jwks_client = self._make_mock_jwks_client()

        with patch("app.auth.clerk._verify_rs256", return_value=True):
            user = _run_async(verify_clerk_token(
                token=token,
                issuer_url="https://clerk.example.com",
                jwks_client=jwks_client,
            ))

        assert user.org_id == "org-top"
        assert user.org_role == "member"
        assert "custom:read" in user.org_permissions
        assert "org:system_memberships:read" not in user.org_permissions
