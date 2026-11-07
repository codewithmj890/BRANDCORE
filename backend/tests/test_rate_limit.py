import asyncio
import sqlite3

import pytest

from app.repositories.base import SqliteD1Wrapper
from app.services.rate_limit import (
    WorkspaceRateLimitExceeded,
    check_workspace_analysis_limit,
)


def _run(coro):
    return asyncio.run(coro)


def _db():
    conn = sqlite3.connect(":memory:")
    conn.executescript(
        """
        CREATE TABLE workspace_rate_limit (
            workspace_id TEXT PRIMARY KEY,
            window_start INTEGER NOT NULL,
            request_count INTEGER NOT NULL DEFAULT 0
        );
        """
    )
    return SqliteD1Wrapper(conn)


def test_workspace_analysis_limit_allows_configured_requests():
    db = _db()
    for _ in range(2):
        _run(check_workspace_analysis_limit(db, "ws-1", limit=2))

    with pytest.raises(WorkspaceRateLimitExceeded):
        _run(check_workspace_analysis_limit(db, "ws-1", limit=2))


def test_workspace_analysis_limit_isolated_by_workspace():
    db = _db()
    _run(check_workspace_analysis_limit(db, "ws-1", limit=1))
    _run(check_workspace_analysis_limit(db, "ws-2", limit=1))
