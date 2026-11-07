"""
BRANDCORE — Workspace authorization dependencies.

Maps consumer Clerk user IDs to BRANDCORE workspaces via D1. Legacy organization
mappings remain supported for existing deployments.
"""
from fastapi import Depends, HTTPException, Request
from typing import Any
import sqlite3

from app.auth.clerk import ClerkUser, get_current_clerk_user


# ---------------------------------------------------------------------------
# Workspace organization mapping repository
# ---------------------------------------------------------------------------

class WorkspaceOrgMappingRepository:
    """
    Repository for the workspace <-> Clerk organization ID mapping.
    All queries use parameterized SQL.
    """

    def __init__(self, db: Any):
        self.db = db

    async def get_workspace_id_by_org_id(self, org_id: str) -> str | None:
        """Return the BRANDCORE workspace_id for a Clerk organization ID."""
        row = await self.db.prepare("""
            SELECT workspace_id FROM workspace_org_mapping
            WHERE org_id = ?
        """).bind(org_id).first()
        return row["workspace_id"] if row else None

    async def get_org_id_by_workspace_id(self, workspace_id: str) -> str | None:
        """Return the Clerk organization ID for a BRANDCORE workspace."""
        row = await self.db.prepare("""
            SELECT org_id FROM workspace_org_mapping
            WHERE workspace_id = ?
        """).bind(workspace_id).first()
        return row["org_id"] if row else None

    async def workspace_exists(self, workspace_id: str) -> bool:
        row = await self.db.prepare(
            "SELECT 1 FROM workspace WHERE id = ?",
        ).bind(workspace_id).first()
        return row is not None

    async def create_mapping(
        self,
        mapping_id: str,
        workspace_id: str,
        org_id: str,
        created_by: str,
        created_at: str,
    ) -> None:
        await self.db.prepare("""
            INSERT INTO workspace_org_mapping
                (id, workspace_id, org_id, created_by, created_at)
            VALUES (?, ?, ?, ?, ?)
        """).bind(
            mapping_id, workspace_id, org_id, created_by, created_at,
        ).run()

    async def mapping_exists(self, workspace_id: str, org_id: str) -> bool:
        row = await self.db.prepare("""
            SELECT 1 FROM workspace_org_mapping
            WHERE workspace_id = ? AND org_id = ?
        """).bind(workspace_id, org_id).first()
        return row is not None

    async def get_workspace_id_by_user_id(self, user_id: str) -> str | None:
        try:
            row = await self.db.prepare("""
                SELECT workspace_id FROM workspace_user_mapping WHERE user_id = ?
            """).bind(user_id).first()
        except sqlite3.OperationalError as exc:
            # Keep older local/test schemas usable until migration 0006 is applied.
            if "no such table: workspace_user_mapping" not in str(exc):
                raise
            return None
        return row["workspace_id"] if row else None

    async def create_user_mapping(
        self, mapping_id: str, workspace_id: str, user_id: str, created_at: str
    ) -> None:
        await self.db.prepare("""
            INSERT INTO workspace_user_mapping (id, workspace_id, user_id, created_at)
            VALUES (?, ?, ?, ?)
        """).bind(mapping_id, workspace_id, user_id, created_at).run()


# ---------------------------------------------------------------------------
# Dependency: authenticated consumer
# ---------------------------------------------------------------------------

async def get_current_organization(
    clerk_user: ClerkUser = Depends(get_current_clerk_user),
) -> ClerkUser:
    return clerk_user


# ---------------------------------------------------------------------------
# Dependency: require_workspace_access
# ---------------------------------------------------------------------------

def require_workspace_access(workspace_id_param: str = "workspace_id"):
    """
    Factory for a dependency that enforces workspace access:
      1. Valid Clerk user (via get_current_clerk_user)
      2. Existing D1 user workspace mapping
      3. Legacy organization mapping when an org claim is present

    Usage:
        @router.post("/workspaces/{workspace_id}/...")
        async def route(
            workspace_id: str,
            user: ClerkUser = Depends(require_workspace_access("workspace_id")),
        ):
    """

    async def dependency(
        request: Request,
        clerk_user: ClerkUser = Depends(get_current_organization),
    ) -> ClerkUser:
        env = request.scope.get("env")
        if env is None:
            raise HTTPException(status_code=401, detail="Authentication unavailable")

        db = getattr(env, "DB", None)
        if db is None:
            raise HTTPException(status_code=500, detail="Database unavailable")

        # Get workspace_id from path parameters (may be None for list endpoint)
        path_params = request.path_params or {}
        workspace_id = path_params.get(workspace_id_param)

        mapping_repo = WorkspaceOrgMappingRepository(db)

        mapped_workspace_id = None
        if clerk_user.org_id:
            mapped_workspace_id = await mapping_repo.get_workspace_id_by_org_id(
                clerk_user.org_id
            )
        else:
            mapped_workspace_id = await mapping_repo.get_workspace_id_by_user_id(
                clerk_user.user_id
            )
        if mapped_workspace_id is None:
            raise HTTPException(
                status_code=403,
                detail="User is not mapped to any workspace",
            )

        # If a specific workspace_id is provided, verify access to it
        if workspace_id:
            if not await mapping_repo.workspace_exists(workspace_id):
                raise HTTPException(status_code=404, detail="Workspace not found")
            if mapped_workspace_id != workspace_id:
                raise HTTPException(
                    status_code=403,
                    detail="Organization does not have access to this workspace",
                )

        return clerk_user

    return dependency


# ---------------------------------------------------------------------------
# Dependency: require_workspace_permission
# ---------------------------------------------------------------------------

def require_workspace_permission(
    workspace_id_param: str = "workspace_id",
    required_permission: str | None = None,
    require_admin: bool = False,
):
    """
    Factory for a dependency that enforces workspace access AND a permission.

    Permission model (based on Clerk Admin and Member roles):
      - org:admin (Administrator) — all permissions
      - org:member (Member) — limited permissions; no approval authority unless
        explicitly granted via require_admin=True

    Usage:
        @router.post("/workspaces/{workspace_id}/review")
        async def route(
            workspace_id: str,
            user: ClerkUser = Depends(require_workspace_permission(
                "workspace_id", require_admin=True)),
        ):
    """

    async def dependency(
        request: Request,
        clerk_user: ClerkUser = Depends(require_workspace_access(workspace_id_param)),
    ) -> ClerkUser:
        if require_admin:
            # Consumer workspace owners may approve and release their own content.
            if clerk_user.org_role not in (None, "org:admin"):
                raise HTTPException(
                    status_code=403,
                    detail="Administrator role required for this action",
                )

        if required_permission:
            if required_permission not in clerk_user.org_permissions:
                if clerk_user.org_role != "org:admin":
                    raise HTTPException(
                        status_code=403,
                        detail=f"Permission required: {required_permission}",
                    )

        return clerk_user

    return dependency


# ---------------------------------------------------------------------------
# Convenience aliases
# ---------------------------------------------------------------------------

get_current_clerk_user_dep = get_current_clerk_user
require_admin = lambda workspace_id_param="workspace_id": require_workspace_permission(
    workspace_id_param, require_admin=True
)
