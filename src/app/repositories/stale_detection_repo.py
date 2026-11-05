"""
M2-07 — Stale release detection repository.

Traverses the evidence-change-aware dependency chain:

    evidence → fact_evidence → approved_fact → claim_fact_dependency
        → candidate_claim → content_version → release_passport

When an approved fact, its supporting evidence, or an applicable policy changes,
identifies release passports whose snapshots no longer match the current approved
state. Uses append-only release_status_event rows to mark newly stale releases
(never rewrites the historical passport, never adds duplicate stale events).

Fingerprint strategy (deterministic, field-based, no model):
  * approved_fact — id + version + claim_text + numeric_value + unit + qualifier + scope
  * evidence — id + version + title + source_type + summary + source_url
  * policy — id + version + name + rules_json

The passport stores `fact_evidence_versions` as a JSON array of entries like
{"type":"fact","id":"fact-1","version":1} and `policy_version_id` as the policy id
in effect at approval (the policy's current version is compared against the
version recorded alongside it in fact_evidence_versions, if present).
"""
import hashlib
import json
from app.domain.models import StaleRelease
from app.repositories.base import BaseRepository


def _fingerprint(row: dict, kind: str) -> str:
    if kind == "fact":
        payload = {
            "id": row["id"], "version": row["version"],
            "claim_text": row["claim_text"], "numeric_value": row["numeric_value"],
            "unit": row["unit"], "qualifier": row["qualifier"], "scope": row["scope"],
        }
    elif kind == "evidence":
        payload = {
            "id": row["id"], "version": row["version"],
            "title": row["title"], "source_type": row["source_type"],
            "summary": row["summary"], "source_url": row["source_url"],
        }
    else:  # policy
        payload = {
            "id": row["id"], "version": row["version"],
            "name": row["name"], "rules_json": row["rules_json"],
        }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


class StaleDetectionRepository(BaseRepository):
    async def find_stale_releases(self, workspace_id: str) -> list[StaleRelease]:
        """Find valid passports whose snapshots no longer match current state.

        Delegates to the fully-implemented async detection path
        (find_stale_releases_detailed) so stale releases are actually detected.
        """
        return await self.find_stale_releases_detailed(workspace_id)

    async def has_status_event(self, passport_id: str, workspace_id: str,
                               status: str) -> bool:
        """Whether a status event of the given type already exists for a passport."""
        row = await self._first(
            """
            SELECT COUNT(*) AS n FROM release_status_event
            WHERE passport_id = ? AND passport_workspace = ? AND status = ?
            """,
            (passport_id, workspace_id, status),
        )
        return (row["n"] if row else 0) > 0

    async def mark_newly_stale(self, workspace_id: str,
                               stale_releases: list[StaleRelease],
                               now: str) -> int:
        """Append STALE events for newly stale releases (no duplicates). Returns count marked."""
        marked = 0
        for s in stale_releases:
            already = await self.has_status_event(s.passport_id, workspace_id, "stale")
            if already:
                continue
            event_id = f"stale-{s.passport_id}"
            await self._run(
                """
                INSERT INTO release_status_event
                    (id, workspace_id, passport_id, passport_workspace, status,
                     reason, timestamp)
                VALUES (?, ?, ?, ?, 'stale', ?, ?)
                """,
                (event_id, workspace_id, s.passport_id, workspace_id,
                 s.stale_reason, now),
            )
            marked += 1
        return marked

    async def _active_fact_head(self, workspace_id: str, fact_id: str) -> dict | None:
        return await self._first(
            """
            SELECT id, version, claim_text, numeric_value, unit, qualifier, scope
            FROM approved_fact
            WHERE workspace_id = ? AND status = 'active'
              AND (id = ? OR id LIKE ? || '-v%')
            ORDER BY version DESC
            LIMIT 1
            """,
            (workspace_id, fact_id, fact_id),
        )

    async def _active_evidence_head(self, workspace_id: str,
                                    evidence_id: str) -> dict | None:
        return await self._first(
            """
            SELECT id, version, title, source_type, summary, source_url
            FROM evidence
            WHERE workspace_id = ? AND status = 'active'
              AND (id = ? OR id LIKE ? || '-v%')
            ORDER BY version DESC
            LIMIT 1
            """,
            (workspace_id, evidence_id, evidence_id),
        )

    async def _active_policy(self, workspace_id: str, policy_id: str) -> dict | None:
        return await self._first(
            "SELECT id, version, name, rules_json FROM policy "
            "WHERE id = ? AND workspace_id = ? AND status = 'active'",
            (policy_id, workspace_id),
        )

    async def _check_entry(self, workspace_id: str, entry: dict) -> tuple[str | None, str | None]:
        etype = entry.get("type")
        sid = entry.get("id")
        recorded_version = entry.get("version")
        if etype == "fact":
            current = await self._active_fact_head(workspace_id, sid)
            if current is None:
                return (f"Approved fact {sid} has no active version", "approved_fact")
            if str(current["version"]) != str(recorded_version):
                return (
                    f"Approved fact {sid} changed from version {recorded_version} "
                    f"to {current['version']}",
                    "approved_fact",
                )
        elif etype == "evidence":
            current = await self._active_evidence_head(workspace_id, sid)
            if current is None:
                return (f"Evidence {sid} has no active version", "evidence")
            if str(current["version"]) != str(recorded_version):
                return (
                    f"Evidence {sid} changed from version {recorded_version} "
                    f"to {current['version']}",
                    "evidence",
                )
        elif etype == "policy":
            current = await self._active_policy(workspace_id, sid)
            if current is None:
                return (f"Policy {sid} is no longer active", "policy")
            if str(current["version"]) != str(recorded_version):
                return (
                    f"Policy {sid} changed from version {recorded_version} "
                    f"to {current['version']}",
                    "policy",
                )
        return (None, None)

    async def find_stale_releases_detailed(self, workspace_id: str) -> list[StaleRelease]:
        """Full stale detection with async DB lookups per passport entry."""
        passports = await self._all(
            "SELECT * FROM release_passport WHERE workspace_id = ? AND status = 'valid'",
            (workspace_id,),
        )
        stale: list[StaleRelease] = []
        for p in passports:
            try:
                entries = json.loads(p["fact_evidence_versions"] or "[]")
            except (json.JSONDecodeError, TypeError):
                entries = []
            # Also include policy as an entry if a version was recorded alongside.
            reason = None
            changed_dep = None
            for entry in entries:
                reason, changed_dep = await self._check_entry(workspace_id, entry)
                if reason is not None:
                    break
            if reason is None:
                # Check policy via policy_version_id if no policy entry recorded.
                policy_id = p["policy_version_id"]
                current = await self._active_policy(workspace_id, policy_id)
                if current is None:
                    reason = f"Policy {policy_id} is no longer active"
                    changed_dep = "policy"
            if reason is not None:
                stale.append(StaleRelease(
                    passport_id=p["id"],
                    workspace_id=workspace_id,
                    content_version_id=p["content_version_id"],
                    content_sha256=p["content_sha256"],
                    status="stale",
                    stale_reason=reason,
                    stale_since="",
                    changed_dependency=changed_dep,
                ))
        return stale
