"""
M5-05 â€” Release API endpoints.

GET /api/workspaces/{workspace_id}/releases                              â€” list releases
GET /api/workspaces/{workspace_id}/releases/{release_id}                 â€” get release
GET /api/workspaces/{workspace_id}/releases/{release_id}/stale-impact    â€” stale impact

Protected by require_workspace_access.
"""
import hashlib
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth.dependencies import require_workspace_access
from app.auth.dependencies import require_workspace_permission
from app.domain.models import (
    ContentVersion,
    ReleasePassportCreate,
    StaleRelease,
    now_utc,
)
from app.repositories.content_repo import ContentVersionRepository
from app.repositories.passport_repo import ReleasePassportRepository
from app.repositories.event_repo import ReleaseStatusEventRepository
from app.repositories.review_repo import ReviewDecisionRepository
from app.repositories.stale_detection_repo import StaleDetectionRepository

router = APIRouter()


def _get_db(request: Request):
    env = request.scope.get("env")
    if env is None:
        raise HTTPException(status_code=401, detail="Authentication unavailable")
    db = getattr(env, "DB", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    return db


@router.post(
    "/workspaces/{workspace_id}/releases",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
)
async def create_release(
    workspace_id: str,
    request: Request,
    user=Depends(require_workspace_permission("workspace_id", require_admin=True)),
):
    """Create an immutable release passport after an approved human review."""
    db = _get_db(request)
    body = await request.json()
    content_version_id = body.get("content_version_id")
    if not content_version_id:
        raise HTTPException(status_code=400, detail="content_version_id is required")
    policy_version_id = body.get("policy_version_id")
    if not policy_version_id:
        raise HTTPException(status_code=400, detail="policy_version_id is required")

    version = await ContentVersionRepository(db).get(content_version_id, workspace_id)
    if version is None:
        raise HTTPException(status_code=404, detail="Content version not found")

    reviews = await ReviewDecisionRepository(db).list_by_version(
        content_version_id, workspace_id
    )
    approved = next((review for review in reviews.items if review.decision == "approved"), None)
    if approved is None:
        raise HTTPException(
            status_code=409,
            detail="An approved human review is required before release",
        )

    passport_repo = ReleasePassportRepository(db)
    if await passport_repo.get_by_content_version(content_version_id, workspace_id):
        raise HTTPException(status_code=409, detail="A release passport already exists")

    policy = await db.prepare(
        "SELECT id FROM policy WHERE id = ? AND workspace_id = ? AND status = 'active'"
    ).bind(policy_version_id, workspace_id).first()
    if policy is None:
        raise HTTPException(status_code=400, detail="Active policy version not found")

    version_data = version.model_dump() if hasattr(version, "model_dump") else dict(version)
    passport_id = f"rp-{uuid.uuid4()}"
    audit_id = f"audit-{uuid.uuid4()}"
    created = now_utc()
    content_hash = hashlib.sha256(version_data["body_text"].encode("utf-8")).hexdigest()
    fact_evidence_versions = body.get("fact_evidence_versions", [])
    findings = body.get("finding_ids_and_dispositions", [])
    if not isinstance(fact_evidence_versions, list) or not isinstance(findings, list):
        raise HTTPException(status_code=400, detail="Release evidence and findings must be arrays")

    await db.prepare(
        """
        INSERT INTO audit_event
            (id, workspace_id, actor_id, actor_role, action, entity_type, entity_id,
             details, correlation_id, created_at)
        VALUES (?, ?, ?, ?, 'create_release_passport', 'release_passport', ?, ?, ?, ?)
        """
    ).bind(
        audit_id,
        workspace_id,
        user.user_id,
        user.org_role or "org:admin",
        passport_id,
        json.dumps({"content_version_id": content_version_id, "content_sha256": content_hash}),
        passport_id,
        created,
    ).run()

    passport = await passport_repo.create(
        passport_id,
        workspace_id,
        ReleasePassportCreate(
            content_version_id=content_version_id,
            content_sha256=content_hash,
            policy_version_id=policy_version_id,
            fact_evidence_versions=json.dumps(fact_evidence_versions),
            finding_ids_and_dispositions=json.dumps(findings),
            approver_id=approved.reviewer_id,
            approver_role=approved.reviewer_role,
            decision_timestamp=approved.created_at,
            audit_reference=audit_id,
        ),
    )
    await db.prepare(
        """
        INSERT INTO release_status_event
            (id, workspace_id, passport_id, passport_workspace, status, reason, timestamp)
        VALUES (?, ?, ?, ?, 'approved', ?, ?)
        """
    ).bind(
        f"event-{uuid.uuid4()}",
        workspace_id,
        passport_id,
        workspace_id,
        "Human review approved this content version.",
        created,
    ).run()

    data = passport.model_dump() if hasattr(passport, "model_dump") else dict(passport)
    return {
        "id": data["id"],
        "workspace_id": data["workspace_id"],
        "content_item_id": data["content_item_id"],
        "content_version_id": data["content_version_id"],
        "content_sha256": data["content_sha256"],
        "policy_version_id": data["policy_version_id"],
        "status": data["status"],
        "approved_at": data["created_at"],
        "approver_id": data["approver_id"],
        "approver_role": data["approver_role"],
    }


@router.get("/workspaces/{workspace_id}/releases", response_model=dict)
async def list_releases(
    workspace_id: str,
    request: Request,
    user = Depends(require_workspace_access("workspace_id")),
):
    """List release passports for a workspace."""
    db = _get_db(request)
    repo = ReleasePassportRepository(db)
    stale_releases = await StaleDetectionRepository(db).find_stale_releases_detailed(workspace_id)
    stale_by_id = {stale.passport_id: stale for stale in stale_releases}
    result = await repo.list_by_workspace(workspace_id)
    releases = []
    for p in result.items:
        d = p.model_dump() if hasattr(p, "model_dump") else dict(p)
        stale = stale_by_id.get(d["id"])
        releases.append({
            "id": d["id"],
            "workspace_id": d["workspace_id"],
            "content_version_id": d["content_version_id"],
            "content_sha256": d["content_sha256"],
            "status": "stale" if stale else d["status"],
            "approved_at": d["created_at"],
            "approver_id": d.get("approver_id"),
            "policy_version_id": d.get("policy_version_id"),
            "stale_reason": stale.stale_reason if stale else None,
            "stale_since": stale.stale_since if stale else None,
            "changed_dependency": stale.changed_dependency if stale else None,
        })
    return {"releases": releases}


@router.get("/workspaces/{workspace_id}/releases/{release_id}", response_model=dict)
async def get_release(
    workspace_id: str,
    release_id: str,
    request: Request,
    user = Depends(require_workspace_access("workspace_id")),
):
    """Get a single release passport by ID."""
    db = _get_db(request)
    repo = ReleasePassportRepository(db)
    passport = await repo.get(release_id, workspace_id)
    if passport is None:
        raise HTTPException(status_code=404, detail="Release not found")
    d = passport.model_dump() if hasattr(passport, "model_dump") else dict(passport)
    return {
        "id": d["id"],
        "workspace_id": d["workspace_id"],
        "content_item_id": d["content_item_id"],
        "content_version_id": d["content_version_id"],
        "content_sha256": d["content_sha256"],
        "status": d["status"],
        "approved_at": d["created_at"],
        "approver_id": d.get("approver_id"),
        "approver_role": d.get("approver_role"),
        "decision_timestamp": d.get("decision_timestamp"),
        "policy_version_id": d.get("policy_version_id"),
    }


@router.get(
    "/workspaces/{workspace_id}/releases/{release_id}/stale-impact",
    response_model=dict,
)
async def get_stale_impact(
    workspace_id: str,
    release_id: str,
    request: Request,
    user = Depends(require_workspace_access("workspace_id")),
):
    """Return stale impact explanation for a release.

    Explains whether the release is stale, what changed, and why revalidation is required.
    """
    db = _get_db(request)

    # Verify the release exists in this workspace
    passport_repo = ReleasePassportRepository(db)
    passport = await passport_repo.get(release_id, workspace_id)
    if passport is None:
        raise HTTPException(status_code=404, detail="Release not found")

    p = passport.model_dump() if hasattr(passport, "model_dump") else dict(passport)

    # Run stale detection for this workspace
    stale_repo = StaleDetectionRepository(db)
    stale_releases = await stale_repo.find_stale_releases_detailed(workspace_id)

    # Find this specific release in the stale list
    stale_entry = None
    for s in stale_releases:
        if s.passport_id == release_id:
            stale_entry = s
            break

    # Also get status events for this release
    event_repo = ReleaseStatusEventRepository(db)
    events_result = await event_repo.list_for_passport(release_id, workspace_id)
    events = []
    for e in events_result.items:
        ed = e.model_dump() if hasattr(e, "model_dump") else dict(e)
        events.append({
            "id": ed["id"],
            "status": ed["status"],
            "reason": ed["reason"],
            "timestamp": ed["timestamp"],
        })

    is_stale = stale_entry is not None

    return {
        "release_id": release_id,
        "workspace_id": workspace_id,
        "status": "STALE" if is_stale else p["status"].upper(),
        "content_version_id": p["content_version_id"],
        "content_sha256": p["content_sha256"],
        "stale_reason": stale_entry.stale_reason if is_stale else None,
        "stale_since": stale_entry.stale_since if is_stale else None,
        "changed_dependency": stale_entry.changed_dependency if is_stale else None,
        "revalidation_required": is_stale,
        "status_events": events,
    }
