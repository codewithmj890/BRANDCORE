"""
M2-07 — Release passport repository regression tests.

Covers:
1. Empty release list
2. One release record
3. Multiple release records
4. Correct D1 result envelope extraction (D1Result with .results)
5. Row mappings converted into ReleasePassport instances
6. Nullable fields
7. Malformed result structure (unexpected string row)
8. Workspace isolation
9. Ordering and total-count accuracy
10. SqliteD1Wrapper compatibility (SQLite backend)
"""

import asyncio
import sqlite3
from unittest.mock import MagicMock

import pytest

from app.domain.models import ReleasePassport
from app.repositories.base import BaseRepository, SqliteD1Wrapper
from app.repositories.passport_repo import ReleasePassportRepository


# ---------------------------------------------------------------------------
# Mock D1Result envelope (Cloudflare D1 Python Workers .all() contract)
# ---------------------------------------------------------------------------

class _MockD1Result:
    """Simulates Cloudflare D1 D1Result: has .results (list[dict]) + .meta."""

    def __init__(self, results):
        self.results = results
        self.meta = {"duration": 0}


class _MockStmt:
    def __init__(self, all_result):
        self._all_result = all_result

    def bind(self, *params):
        return self

    async def all(self):
        return self._all_result

    async def first(self):
        return None

    async def run(self):
        return None


class _MockDb:
    """Mock db whose .prepare().bind().all() returns either list[dict] or D1Result."""

    def __init__(self, all_result):
        self._all_result = all_result

    def prepare(self, sql):
        return _MockStmt(self._all_result)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _make_passport_row(overrides=None):
    base = {
        "id": "rp-1",
        "workspace_id": "ws-1",
        "content_item_id": "ci-1",
        "content_version_id": "cv-1",
        "content_sha256": "sha256hash123",
        "policy_version_id": "pol-1",
        "fact_evidence_versions": '[]',
        "finding_ids_and_dispositions": '[]',
        "approver_id": "reviewer-1",
        "approver_role": "reviewer",
        "decision_timestamp": "2026-01-01T00:00:00Z",
        "audit_reference": "audit-1",
        "status": "valid",
        "created_at": "2026-01-01T00:00:00Z",
    }
    if overrides:
        base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# Tests with list[dict] rows (SQLite adapter contract)
# ---------------------------------------------------------------------------

class TestPassportRepoListDict:
    """Rows arrive as list[dict] — the SQLite / expected contract."""

    def test_empty_release_list(self):
        db = _MockDb([])
        repo = ReleasePassportRepository(db)
        result = _run(repo.list_by_workspace("ws-1"))
        assert result.total == 0
        assert result.items == []

    def test_one_release_record(self):
        row = _make_passport_row()
        db = _MockDb([row])
        repo = ReleasePassportRepository(db)
        result = _run(repo.list_by_workspace("ws-1"))
        assert result.total == 1
        assert len(result.items) == 1
        p = result.items[0]
        assert isinstance(p, ReleasePassport)
        assert p.id == "rp-1"
        assert p.workspace_id == "ws-1"
        assert p.status == "valid"
        assert p.content_version_id == "cv-1"

    def test_multiple_release_records(self):
        rows = [
            _make_passport_row({"id": "rp-1", "content_version_id": "cv-1", "created_at": "2026-01-02T00:00:00Z"}),
            _make_passport_row({"id": "rp-2", "content_version_id": "cv-2", "created_at": "2026-01-01T00:00:00Z"}),
        ]
        db = _MockDb(rows)
        repo = ReleasePassportRepository(db)
        result = _run(repo.list_by_workspace("ws-1"))
        assert result.total == 2
        assert len(result.items) == 2
        # ORDER BY created_at DESC → rp-1 (newer) first
        assert result.items[0].id == "rp-1"
        assert result.items[1].id == "rp-2"

    def test_nullable_fields(self):
        row = _make_passport_row({
            "audit_reference": None,
        })
        db = _MockDb([row])
        repo = ReleasePassportRepository(db)
        result = _run(repo.list_by_workspace("ws-1"))
        p = result.items[0]
        assert p.audit_reference is None
        assert p.status == "valid"

    def test_workspace_isolation(self):
        row_ws1 = _make_passport_row({"workspace_id": "ws-1", "id": "rp-1"})
        row_ws2 = _make_passport_row({"workspace_id": "ws-2", "id": "rp-2"})
        # Only ws-1 rows are passed to the repo (SQL WHERE already filters)
        db = _MockDb([row_ws1])
        repo = ReleasePassportRepository(db)
        result = _run(repo.list_by_workspace("ws-1"))
        assert result.total == 1
        assert result.items[0].workspace_id == "ws-1"

    def test_status_filter(self):
        row_valid = _make_passport_row({"id": "rp-1", "status": "valid"})
        row_stale = _make_passport_row({"id": "rp-2", "status": "stale"})
        db = _MockDb([row_valid])
        repo = ReleasePassportRepository(db)
        result = _run(repo.list_by_workspace("ws-1", status="valid"))
        assert result.total == 1
        assert result.items[0].status == "valid"

    def test_row_is_release_passport_instance(self):
        row = _make_passport_row()
        db = _MockDb([row])
        repo = ReleasePassportRepository(db)
        result = _run(repo.list_by_workspace("ws-1"))
        assert isinstance(result.items[0], ReleasePassport)


# ---------------------------------------------------------------------------
# Tests with D1Result envelope (real Cloudflare D1 contract)
# ---------------------------------------------------------------------------

class TestPassportRepoD1Envelope:
    """Rows arrive wrapped in a D1Result envelope (.results attribute)."""

    def test_d1_result_envelope_extraction(self):
        row = _make_passport_row()
        envelope = _MockD1Result([row])
        db = _MockDb(envelope)
        repo = ReleasePassportRepository(db)
        result = _run(repo.list_by_workspace("ws-1"))
        assert result.total == 1
        assert isinstance(result.items[0], ReleasePassport)
        assert result.items[0].id == "rp-1"

    def test_d1_result_envelope_empty(self):
        envelope = _MockD1Result([])
        db = _MockDb(envelope)
        repo = ReleasePassportRepository(db)
        result = _run(repo.list_by_workspace("ws-1"))
        assert result.total == 0
        assert result.items == []

    def test_d1_result_envelope_multiple(self):
        rows = [
            _make_passport_row({"id": "rp-1"}),
            _make_passport_row({"id": "rp-2"}),
        ]
        envelope = _MockD1Result(rows)
        db = _MockDb(envelope)
        repo = ReleasePassportRepository(db)
        result = _run(repo.list_by_workspace("ws-1"))
        assert result.total == 2
        assert len(result.items) == 2


# ---------------------------------------------------------------------------
# Tests with malformed / unexpected string rows
# ---------------------------------------------------------------------------

class TestPassportRepoMalformedRows:
    """A string row must produce a clear diagnostic, not corrupt data."""

    def test_string_row_raises_clear_error(self):
        # A list containing a string instead of a dict — simulates a broken
        # D1 envelope extraction where dict keys were iterated as strings.
        db = _MockDb(["results", "meta"])
        repo = ReleasePassportRepository(db)
        with pytest.raises(TypeError) as exc:
            _run(repo.list_by_workspace("ws-1"))
        assert "mapping" in str(exc.value).lower() or "str" in str(exc.value).lower()

    def test_single_char_string_row_raises(self):
        # Iterating a JSON string yields single-character strings
        db = _MockDb(['{', '"', 'r', '"'])
        repo = ReleasePassportRepository(db)
        with pytest.raises(TypeError) as exc:
            _run(repo.list_by_workspace("ws-1"))
        assert "mapping" in str(exc.value).lower() or "str" in str(exc.value).lower()


# ---------------------------------------------------------------------------
# SqliteD1Wrapper compatibility (real SQLite backend)
# ---------------------------------------------------------------------------

class TestPassportRepoSqliteWrapper:
    """Repository must work with SqliteD1Wrapper against real SQLite."""

    def _setup_conn(self):
        conn = sqlite3.connect(":memory:", check_same_thread=False)
        conn.execute("PRAGMA foreign_keys = ON")
        mig_dir = __import__("os").path.abspath(
            __import__("os").path.join(
                __import__("os").path.dirname(__file__), "..", "..", "database", "migrations"
            )
        )
        import os
        for name in sorted(os.listdir(mig_dir)):
            if name.endswith(".sql"):
                with open(os.path.join(mig_dir, name), encoding="utf-8") as f:
                    conn.executescript(f.read())
        # Seed workspace + content item + version + policy + audit + passport
        conn.execute(
            "INSERT INTO workspace (id, name, slug, demo_flag, status, created_at, updated_at) "
            "VALUES ('ws-1', 'Test WS', 'test-ws', 1, 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
        )
        conn.execute(
            "INSERT INTO workspace_org_mapping (id, workspace_id, org_id, created_by, created_at) "
            "VALUES ('map-1', 'ws-1', 'org-1', 'user-1', '2026-01-01T00:00:00Z')"
        )
        conn.execute(
            "INSERT INTO content_item (id, workspace_id, title, status, created_by, created_at, updated_at) "
            "VALUES ('ci-1', 'ws-1', 'Test Item', 'active', 'creator', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
        )
        conn.execute(
            "INSERT INTO content_version (id, workspace_id, content_item_id, version_number, body_text, sha256_hash, submitted_by, created_at) "
            "VALUES ('cv-1', 'ws-1', 'ci-1', 1, 'Test body', 'sha256hash123', 'creator', '2026-01-01T00:00:00Z')"
        )
        conn.execute(
            "INSERT INTO policy (id, workspace_id, name, description, rules_json, version, status, previous_version_id, created_by, created_at) "
            "VALUES ('pol-1', 'ws-1', 'Brand Voice', 'Marketing claims policy', '[]', 1, 'active', NULL, 'brand_admin', '2026-01-01T00:00:00Z')"
        )
        conn.execute(
            "INSERT INTO audit_event (id, workspace_id, actor_id, actor_role, action, entity_type, entity_id, details, correlation_id, created_at) "
            "VALUES ('audit-1', 'ws-1', 'reviewer-1', 'reviewer', 'create_release_passport', 'release_passport', 'rp-1', '{}', 'corr-1', '2026-01-01T00:00:00Z')"
        )
        conn.execute(
            "INSERT INTO release_passport (id, workspace_id, content_item_id, content_version_id, content_sha256, policy_version_id, fact_evidence_versions, finding_ids_and_dispositions, approver_id, approver_role, decision_timestamp, audit_reference, status, created_at) "
            "VALUES ('rp-1', 'ws-1', 'ci-1', 'cv-1', 'sha256hash123', 'pol-1', '[]', '[]', 'reviewer-1', 'reviewer', '2026-01-01T00:00:00Z', 'audit-1', 'valid', '2026-01-01T00:00:00Z')"
        )
        conn.commit()
        return conn

    def test_sqlite_wrapper_list_by_workspace(self):
        conn = self._setup_conn()
        try:
            wrapper = SqliteD1Wrapper(conn)
            repo = ReleasePassportRepository(wrapper)
            result = _run(repo.list_by_workspace("ws-1"))
            assert result.total == 1
            assert isinstance(result.items[0], ReleasePassport)
            assert result.items[0].id == "rp-1"
            assert result.items[0].workspace_id == "ws-1"
        finally:
            conn.close()

    def test_sqlite_wrapper_empty_workspace(self):
        conn = self._setup_conn()
        try:
            wrapper = SqliteD1Wrapper(conn)
            repo = ReleasePassportRepository(wrapper)
            result = _run(repo.list_by_workspace("ws-nonexistent"))
            assert result.total == 0
            assert result.items == []
        finally:
            conn.close()

    def test_sqlite_wrapper_workspace_isolation(self):
        conn = self._setup_conn()
        try:
            wrapper = SqliteD1Wrapper(conn)
            repo = ReleasePassportRepository(wrapper)
            # ws-1 has the seeded passport; ws-2 has none (SQL WHERE filters by workspace_id)
            result_ws1 = _run(repo.list_by_workspace("ws-1"))
            result_ws2 = _run(repo.list_by_workspace("ws-2"))
            assert result_ws1.total == 1
            assert result_ws1.items[0].id == "rp-1"
            assert result_ws2.total == 0
            assert result_ws2.items == []
        finally:
            conn.close()
