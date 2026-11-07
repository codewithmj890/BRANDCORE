"""
M5-05 — Content API endpoints.

POST   /api/workspaces/{workspace_id}/content                                    — create content + version
GET    /api/workspaces/{workspace_id}/content                                    — list content items
GET    /api/workspaces/{workspace_id}/content/{content_item_id}                  — get content item
GET    /api/workspaces/{workspace_id}/content/{content_item_id}/versions         — list versions
GET    /api/workspaces/{workspace_id}/content/{content_item_id}/versions/{version_number} — get exact version

Protected by require_workspace_access.
"""
import hashlib
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth.dependencies import require_workspace_access
from app.domain.models import (
    ContentItem, ContentItemCreate, ContentVersion, ContentVersionCreate,
)
from app.repositories.content_repo import ContentItemRepository, ContentVersionRepository
from app.repositories.review_repo import ReviewDecisionRepository

router = APIRouter()


def _get_db(request: Request):
    env = request.scope.get("env")
    if env is None:
        raise HTTPException(status_code=401, detail="Authentication unavailable")
    db = getattr(env, "DB", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")
    return db


@router.post("/workspaces/{workspace_id}/content", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_content(
    workspace_id: str,
    request: Request,
    user = Depends(require_workspace_access("workspace_id")),
):
    """Create a new content item with its first immutable content version."""
    import json
    from app.domain.models import now_utc

    db = _get_db(request)
    body = await request.json()

    title = body.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    if len(title) > 200:
        raise HTTPException(status_code=400, detail="Title exceeds 200 characters")

    body_text = body.get("body_text", "")
    if not body_text or not body_text.strip():
        raise HTTPException(status_code=400, detail="Body text is required")
    if len(body_text) > 10000:
        raise HTTPException(status_code=400, detail="Body text exceeds 10000 characters")

    item_repo = ContentItemRepository(db)
    version_repo = ContentVersionRepository(db)

    item_id = f"ci-{uuid.uuid4()}"
    item = await item_repo.create(item_id, workspace_id, ContentItemCreate(title=title))
    if item is None:
        raise HTTPException(status_code=500, detail="Failed to create content item")

    version_id = f"cv-{uuid.uuid4()}"
    sha = hashlib.sha256(body_text.encode("utf-8")).hexdigest()
    version = await version_repo.create(version_id, workspace_id, ContentVersionCreate(
        content_item_id=item_id,
        body_text=body_text,
        submitted_by=user.user_id,
    ))
    if version is None:
        raise HTTPException(status_code=500, detail="Failed to create content version")

    return {
        "content_item_id": item_id,
        "content_version_id": version_id,
        "sha256_hash": sha,
        "created_at": version.created_at,
    }


@router.get("/workspaces/{workspace_id}/content", response_model=dict)
async def list_content(
    workspace_id: str,
    request: Request,
    user = Depends(require_workspace_access("workspace_id")),
):
    """List content items for a workspace."""
    db = _get_db(request)
    repo = ContentItemRepository(db)
    result = await repo.list_by_workspace(workspace_id)
    items = []
    for c in result.items:
        d = c.model_dump() if hasattr(c, "model_dump") else dict(c)
        items.append({
            "id": d["id"],
            "workspace_id": d["workspace_id"],
            "title": d["title"],
            "status": d["status"],
            "created_at": d["created_at"],
            "updated_at": d["updated_at"],
        })
    return {"content_items": items}


@router.get("/workspaces/{workspace_id}/content/{content_item_id}", response_model=dict)
async def get_content(
    workspace_id: str,
    content_item_id: str,
    request: Request,
    user = Depends(require_workspace_access("workspace_id")),
):
    """Get a single content item by ID."""
    db = _get_db(request)
    repo = ContentItemRepository(db)
    item = await repo.get(content_item_id, workspace_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Content item not found")
    d = item.model_dump() if hasattr(item, "model_dump") else dict(item)
    return {
        "id": d["id"],
        "workspace_id": d["workspace_id"],
        "title": d["title"],
        "status": d["status"],
        "created_at": d["created_at"],
        "updated_at": d["updated_at"],
    }


@router.get("/workspaces/{workspace_id}/content/{content_item_id}/versions", response_model=dict)
async def list_content_versions(
    workspace_id: str,
    content_item_id: str,
    request: Request,
    user = Depends(require_workspace_access("workspace_id")),
):
    """List all versions of a content item, ordered by version number."""
    db = _get_db(request)
    repo = ContentVersionRepository(db)

    # Verify the content item belongs to the workspace
    item_repo = ContentItemRepository(db)
    item = await item_repo.get(content_item_id, workspace_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Content item not found")

    result = await repo.list_by_item(content_item_id, workspace_id, order="asc")
    review_repo = ReviewDecisionRepository(db)
    versions = []
    for v in result.items:
        d = v.model_dump() if hasattr(v, "model_dump") else dict(v)
        reviews = await review_repo.list_by_version(d["id"], workspace_id)
        latest_review = reviews.items[-1] if reviews.items else None
        review_status = (
            latest_review.decision.upper() if latest_review is not None else "PENDING"
        )
        versions.append({
            "id": d["id"],
            "content_item_id": d["content_item_id"],
            "version_number": d["version_number"],
            "sha256_hash": d["sha256_hash"],
            "created_at": d["created_at"],
            "review_status": review_status,
        })
    return {"versions": versions}


@router.get("/workspaces/{workspace_id}/content/{content_item_id}/versions/{version_number}", response_model=dict)
async def get_content_version(
    workspace_id: str,
    content_item_id: str,
    version_number: int,
    request: Request,
    user = Depends(require_workspace_access("workspace_id")),
):
    """Get an exact content version by item ID and version number."""
    db = _get_db(request)
    repo = ContentVersionRepository(db)

    # Verify the content item belongs to the workspace
    item_repo = ContentItemRepository(db)
    item = await item_repo.get(content_item_id, workspace_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Content item not found")

    version = await repo.get_by_item_and_number(content_item_id, workspace_id, version_number)
    if version is None:
        raise HTTPException(status_code=404, detail="Content version not found")
    d = version.model_dump() if hasattr(version, "model_dump") else dict(version)
    return {
        "id": d["id"],
        "content_item_id": d["content_item_id"],
        "version_number": d["version_number"],
        "body_text": d["body_text"],
        "sha256_hash": d["sha256_hash"],
        "submitted_by": d["submitted_by"],
        "created_at": d["created_at"],
    }
