"""
M5-05 — Workspace API endpoints.

GET /api/workspaces                              — List workspaces for the authenticated user
GET /api/workspaces/{workspace_id}               — Returns workspace information.
POST /api/workspaces/provision                   — Provision a workspace for the org.
Protected by Clerk authentication + workspace authorization.
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from uuid import uuid4
from datetime import datetime, timezone

from app.api.dependencies import require_development_env
from app.auth.dependencies import (
    require_workspace_access,
    get_current_clerk_user,
    WorkspaceOrgMappingRepository,
    require_workspace_permission,
)
from app.domain.models import Workspace
from app.repositories.workspace_repo import WorkspaceRepository
from typing import List


class WorkspaceProvisionRequest(BaseModel):
    name: str
    slug: str | None = None


router = APIRouter()


@router.get("/workspaces", response_model=dict)
async def list_workspaces(
    request: Request,
    user = Depends(get_current_clerk_user),
):
    """List workspaces accessible to the authenticated consumer."""
    env = request.scope.get("env")
    if env is None:
        raise HTTPException(status_code=401, detail="Authentication unavailable")
    db = getattr(env, "DB", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    mapping_repo = WorkspaceOrgMappingRepository(db)
    workspace_id = None
    if user.org_id:
        workspace_id = await mapping_repo.get_workspace_id_by_org_id(user.org_id)
    if workspace_id is None:
        workspace_id = await mapping_repo.get_workspace_id_by_user_id(user.user_id)

    workspaces = []
    if workspace_id:
        workspace = await WorkspaceRepository(db).get(workspace_id)
        if workspace:
            d = workspace.model_dump() if hasattr(workspace, "model_dump") else dict(workspace)
            workspaces.append({
                "id": d["id"],
                "name": d["name"],
                "slug": d.get("slug"),
                "owner_id": user.user_id,
            })

    return {"workspaces": workspaces}


@router.post("/workspaces/provision", response_model=dict)
async def provision_workspace(
    request: Request,
    body: WorkspaceProvisionRequest,
    user = Depends(get_current_clerk_user),
):
    """Provision one personal workspace for the authenticated consumer."""
    env = request.scope.get("env")
    if env is None:
        raise HTTPException(status_code=401, detail="Authentication unavailable")
    db = getattr(env, "DB", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    mapping_repo = WorkspaceOrgMappingRepository(db)
    existing_workspace_id = await mapping_repo.get_workspace_id_by_user_id(user.user_id)
    if existing_workspace_id:
        existing = await WorkspaceRepository(db).get(existing_workspace_id)
        if existing:
            d = existing.model_dump() if hasattr(existing, "model_dump") else dict(existing)
            return {
                "id": d["id"],
                "name": d["name"],
                "slug": d.get("slug"),
                "owner_id": user.user_id,
                "provisioned": False,
            }

    # Create workspace
    workspace_id = f"ws_{uuid4().hex[:12]}"
    slug = body.slug or body.name.lower().replace(" ", "-")
    now = datetime.now(timezone.utc).isoformat()

    repo = WorkspaceRepository(db)
    await repo.create(workspace_id, type("WorkspaceCreate", (), {
        "name": body.name,
        "slug": slug,
        "status": "active",
    })())

    await mapping_repo.create_user_mapping(
        mapping_id=f"map_{uuid4().hex[:12]}",
        workspace_id=workspace_id,
        created_at=now,
        user_id=user.user_id,
    )

    workspace = await repo.get(workspace_id)
    d = workspace.model_dump() if hasattr(workspace, "model_dump") else dict(workspace)
    return {
        "id": d["id"],
        "name": d["name"],
        "slug": d.get("slug"),
        "owner_id": user.user_id,
        "provisioned": True,
    }


@router.get("/workspaces/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    request: Request,
    user = Depends(require_workspace_access("workspace_id")),
) -> Workspace:
    """Return workspace information for the authenticated user's organization."""
    env = request.scope.get("env")
    if env is None:
        raise HTTPException(status_code=401, detail="Authentication unavailable")
    db = getattr(env, "DB", None)
    if db is None:
        raise HTTPException(status_code=500, detail="Database unavailable")

    repo = WorkspaceRepository(db)
    workspace = await repo.get(workspace_id)
    if workspace is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace
