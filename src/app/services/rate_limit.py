"""D1-backed fixed-window limits for expensive workspace operations."""
from time import time
from typing import Any


class WorkspaceRateLimitExceeded(Exception):
    """Raised when a workspace exceeds its configured operation limit."""


async def check_workspace_analysis_limit(
    db: Any,
    workspace_id: str,
    *,
    limit: int = 10,
    window_seconds: int = 60,
) -> None:
    """Consume one analysis request, raising when the window is exhausted."""
    window_start = int(time()) // window_seconds * window_seconds
    await db.prepare(
        """
        INSERT INTO workspace_rate_limit (workspace_id, window_start, request_count)
        VALUES (?, ?, 1)
        ON CONFLICT(workspace_id) DO UPDATE SET
            window_start = CASE
                WHEN workspace_rate_limit.window_start = excluded.window_start
                THEN workspace_rate_limit.window_start
                ELSE excluded.window_start
            END,
            request_count = CASE
                WHEN workspace_rate_limit.window_start = excluded.window_start
                THEN workspace_rate_limit.request_count + 1
                ELSE 1
            END
        """
    ).bind(workspace_id, window_start).run()

    row = await db.prepare(
        """
        SELECT request_count FROM workspace_rate_limit
        WHERE workspace_id = ? AND window_start = ?
        """
    ).bind(workspace_id, window_start).first()
    if row is None:
        raise RuntimeError("Workspace rate-limit state unavailable")
    if row["request_count"] > limit:
        raise WorkspaceRateLimitExceeded
