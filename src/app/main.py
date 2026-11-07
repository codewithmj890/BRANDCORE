import json

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .api.health import router as health_router
from .api.poc import router as poc_router
from .api.analyze import router as analyze_router
from .api.workspaces import router as workspaces_router
from .api.facts import router as facts_router
from .api.evidence import router as evidence_router
from .api.content import router as content_router
from .api.review import router as review_router
from .api.releases import router as releases_router
from .api.dependencies import require_development_env
from .auth.dependencies import require_workspace_access, require_workspace_permission

app = FastAPI(title="BRANDCORE API", version="0.1.0", docs_url=None, redoc_url=None)


@app.exception_handler(json.JSONDecodeError)
async def handle_malformed_json(request: Request, exc: json.JSONDecodeError):
    return JSONResponse(status_code=400, content={"detail": "Malformed JSON request body"})


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; frame-ancestors 'none'; object-src 'none'",
    )
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(health_router, prefix="/api")

# Product routes — all require Clerk authentication + workspace authorization.
# Workspace list/provision endpoints handled separately (no workspace_id path param).
_workspace_deps = [Depends(require_workspace_access("workspace_id"))]

# Workspace routes: list and provision don't require existing mapping.
app.include_router(
    workspaces_router,
    prefix="/api",
)
app.include_router(
    facts_router,
    prefix="/api",
    dependencies=_workspace_deps,
)
app.include_router(
    evidence_router,
    prefix="/api",
    dependencies=_workspace_deps,
)
app.include_router(
    content_router,
    prefix="/api",
    dependencies=_workspace_deps,
)

# Review write endpoint requires admin permission; read endpoint requires workspace access.
app.include_router(
    review_router,
    prefix="/api",
    dependencies=_workspace_deps,
)

app.include_router(
    analyze_router,
    prefix="/api",
    dependencies=_workspace_deps,
)

app.include_router(
    releases_router,
    prefix="/api",
    dependencies=_workspace_deps,
)

# POC routes are guarded by require_development_env.
app.include_router(
    poc_router,
    prefix="/api",
    dependencies=[Depends(require_development_env)],
)
