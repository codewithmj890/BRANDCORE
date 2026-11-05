"""
M2-06 — Content item and content version repositories.

Content versions are immutable: only INSERT is supported; no UPDATE path.
The latest version is derived from version_number (no mutable snapshot).

Version number derivation is retried on UNIQUE constraint conflict to handle
concurrent writes safely (SELECT MAX + 1 is not atomic by itself).
"""
import hashlib

from app.domain.models import (
    ContentItem,
    ContentItemCreate,
    ContentVersion,
    ContentVersionCreate,
    ListResult,
    now_utc,
)
from app.repositories.base import BaseRepository


class ContentItemRepository(BaseRepository):
    async def create(self, item_id: str, workspace_id: str, data: ContentItemCreate) -> ContentItem:
        created = now_utc()
        await self._run(
            """
            INSERT INTO content_item (id, workspace_id, title, status, created_by, created_at, updated_at)
            VALUES (?, ?, ?, 'active', 'creator', ?, ?)
            """,
            (item_id, workspace_id, data.title, created, created),
        )
        return await self.get(item_id, workspace_id)

    async def get(self, item_id: str, workspace_id: str) -> ContentItem | None:
        row = await self._first(
            "SELECT * FROM content_item WHERE id = ? AND workspace_id = ?",
            (item_id, workspace_id),
        )
        return ContentItem(**row) if row else None

    async def list_by_workspace(self, workspace_id: str, status: str | None = None) -> ListResult:
        if status is not None:
            rows = await self._all(
                "SELECT * FROM content_item WHERE workspace_id = ? AND status = ? ORDER BY title",
                (workspace_id, status),
            )
        else:
            rows = await self._all(
                "SELECT * FROM content_item WHERE workspace_id = ? ORDER BY title",
                (workspace_id,),
            )
        return ListResult(items=[ContentItem(**r) for r in rows], total=len(rows))


class ContentVersionRepository(BaseRepository):
    async def create(self, version_id: str, workspace_id: str, data: ContentVersionCreate) -> ContentVersion:
        # Verify the content item belongs to the workspace (composite FK already enforced at DB level).
        item = await self._first(
            "SELECT id FROM content_item WHERE id = ? AND workspace_id = ?",
            (data.content_item_id, workspace_id),
        )
        if item is None:
            return None  # caller maps to not-found / cross-workspace error

        body = data.body_text
        sha = hashlib.sha256(body.encode("utf-8")).hexdigest()
        created = now_utc()

        # Derive the next version number with retry on UNIQUE conflict.
        max_retries = 3
        for attempt in range(max_retries):
            max_ver = await self._first(
                "SELECT MAX(version_number) AS v FROM content_version WHERE content_item_id = ?",
                (data.content_item_id,),
            )
            next_number = (max_ver["v"] or 0) + 1

            try:
                await self._run(
                    """
                    INSERT INTO content_version
                        (id, workspace_id, content_item_id, version_number, body_text,
                         sha256_hash, submitted_by, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (version_id, workspace_id, data.content_item_id, next_number, body, sha, data.submitted_by, created),
                )
                break
            except Exception:
                if attempt == max_retries - 1:
                    raise
                # Concurrent write likely took this version number; retry.

        return await self.get(version_id, workspace_id)

    async def get(self, version_id: str, workspace_id: str) -> ContentVersion | None:
        row = await self._first(
            "SELECT * FROM content_version WHERE id = ? AND workspace_id = ?",
            (version_id, workspace_id),
        )
        return ContentVersion(**row) if row else None

    async def get_by_item_and_number(
        self, content_item_id: str, workspace_id: str, version_number: int
    ) -> ContentVersion | None:
        row = await self._first(
            """
            SELECT * FROM content_version
            WHERE content_item_id = ? AND workspace_id = ? AND version_number = ?
            """,
            (content_item_id, workspace_id, version_number),
        )
        return ContentVersion(**row) if row else None

    async def list_by_item(
        self, content_item_id: str, workspace_id: str, order: str = "asc"
    ) -> ListResult:
        direction = "ASC" if order != "desc" else "DESC"
        rows = await self._all(
            f"""
            SELECT * FROM content_version
            WHERE content_item_id = ? AND workspace_id = ?
            ORDER BY version_number {direction}
            """,
            (content_item_id, workspace_id),
        )
        return ListResult(items=[ContentVersion(**r) for r in rows], total=len(rows))

    async def get_latest(self, content_item_id: str, workspace_id: str) -> ContentVersion | None:
        row = await self._first(
            """
            SELECT * FROM content_version
            WHERE content_item_id = ? AND workspace_id = ?
            ORDER BY version_number DESC
            LIMIT 1
            """,
            (content_item_id, workspace_id),
        )
        return ContentVersion(**row) if row else None

    # No update method: content_version rows are immutable (DB trigger enforces).
