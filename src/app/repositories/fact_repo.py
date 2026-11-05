"""
M2-05 — Approved fact repository.

All queries are workspace-scoped. Facts are versioned: a change creates a new
row; old versions are preserved (ON DELETE RESTRICT).
"""
import json
from app.domain.models import (ApprovedFact, ApprovedFactCreate, ListResult, now_utc)
from app.repositories.base import BaseRepository


class ApprovedFactRepository(BaseRepository):
    async def create(self, fact_id: str, workspace_id: str, data: ApprovedFactCreate) -> ApprovedFact:
        created = now_utc()
        await self._run(
            """
            INSERT INTO approved_fact
                (id, workspace_id, claim_text, numeric_value, unit, qualifier,
                 scope, version, status, previous_version_id, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (fact_id, workspace_id, data.claim_text, data.numeric_value, data.unit,
             data.qualifier, data.scope, 1, 'active', None, 'brand_admin', created),
        )
        return await self.get(fact_id, workspace_id)

    async def get(self, fact_id: str, workspace_id: str) -> ApprovedFact | None:
        row = await self._first(
            "SELECT * FROM approved_fact WHERE id = ? AND workspace_id = ?",
            (fact_id, workspace_id),
        )
        return ApprovedFact(**row) if row else None

    async def list_by_workspace(self, workspace_id: str, status: str | None = None) -> ListResult:
        if status is not None:
            rows = await self._all(
                "SELECT * FROM approved_fact WHERE workspace_id = ? AND status = ? "
                "ORDER BY claim_text",
                (workspace_id, status),
            )
        else:
            rows = await self._all(
                "SELECT * FROM approved_fact WHERE workspace_id = ? ORDER BY claim_text",
                (workspace_id,),
            )
        return ListResult(items=[ApprovedFact(**r) for r in rows], total=len(rows))

    async def list_versions(self, fact_id: str, workspace_id: str) -> ListResult:
        rows = await self._all(
            "SELECT * FROM approved_fact WHERE id = ? AND workspace_id = ? "
            "ORDER BY version DESC",
            (fact_id, workspace_id),
        )
        return ListResult(items=[ApprovedFact(**r) for r in rows], total=len(rows))

    async def update(self, fact_id: str, workspace_id: str, data: ApprovedFactCreate) -> ApprovedFact | None:
        # Find the active head of this fact's lineage (root id or a prior version).
        current = await self._first(
            """
            SELECT * FROM approved_fact
            WHERE workspace_id = ? AND status = 'active'
              AND (id = ? OR id LIKE ? || '-v%')
            ORDER BY version DESC
            LIMIT 1
            """,
            (workspace_id, fact_id, fact_id),
        )
        if current is None:
            return None
        # Versioning: create a new row, preserve/supersede the old head.
        new_id = f"{fact_id}-v{current['version'] + 1}"
        await self._run(
            """
            INSERT INTO approved_fact
                (id, workspace_id, claim_text, numeric_value, unit, qualifier,
                 scope, version, status, previous_version_id, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, 'brand_admin', ?)
            """,
            (new_id, workspace_id, data.claim_text, data.numeric_value, data.unit,
             data.qualifier, data.scope, current["version"] + 1, current["id"]),
        )
        # Retire the previous head version.
        await self._run(
            "UPDATE approved_fact SET status = 'superseded' WHERE id = ? AND workspace_id = ?",
            (current["id"], workspace_id),
        )
        return await self.get(new_id, workspace_id)

    async def link_evidence(self, fact_id: str, workspace_id: str,
                            evidence_id: str) -> None:
        await self._run(
            """
            INSERT INTO fact_evidence (fact_id, fact_workspace, evidence_id, ev_workspace, linked_at)
            SELECT ?, ?, ?, ?, ?
            WHERE NOT EXISTS (
                SELECT 1 FROM fact_evidence
                WHERE fact_id = ? AND evidence_id = ?
            )
            """,
            (fact_id, workspace_id, evidence_id, workspace_id, now_utc(),
             fact_id, evidence_id),
        )
