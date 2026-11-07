"""
M3-05 — Analysis API endpoint.

POST /api/workspaces/{workspace_id}/content/{content_version_id}/analyze

Triggers AI claim extraction and deterministic verification for a content
version. Returns structured claims and findings. Preserves analysis history;
never creates review approvals or release passports as a side effect.
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.services.analysis_service import AnalysisService
from app.services.ai_extraction import ClaimExtractionError, ClaimExtractionService
from app.services.verification_engine import VerificationEngine
from app.repositories.claim_repo import CandidateClaimRepository
from app.repositories.finding_repo import VerificationFindingRepository
from app.repositories.content_repo import ContentVersionRepository
from app.repositories.fact_repo import ApprovedFactRepository
from app.repositories.evidence_repo import EvidenceRepository
from app.repositories.policy_repo import PolicyRepository
from app.repositories.terminology_repo import TerminologyRepository
from app.repositories.dependency_repo import ClaimFactDependencyRepository
from app.repositories.event_repo import AuditEventRepository
from app.services.rate_limit import (
    WorkspaceRateLimitExceeded,
    check_workspace_analysis_limit,
)

router = APIRouter()


class AnalyzeClaim(BaseModel):
    id: str
    text: str
    claim_type: str | None = None
    numeric_value: str | None = None
    unit: str | None = None
    qualifier: str | None = None
    scope: str | None = None


class AnalyzeFinding(BaseModel):
    id: str
    claim_id: str | None
    finding_type: str
    severity: str
    explanation: str
    suggested_correction: str | None = None
    analysis_batch_id: str


class AnalyzeResponse(BaseModel):
    content_version_id: str
    extraction_batch_id: str
    analysis_batch_id: str
    claims: list[AnalyzeClaim]
    findings: list[AnalyzeFinding]
    summary: dict


def _env_bindings(request: Request):
    env = request.scope.get("env")
    if env is None:
        raise HTTPException(status_code=404)
    db = getattr(env, "DB", None)
    ai = getattr(env, "AI", None)
    if db is None:
        raise HTTPException(status_code=500, detail="D1 binding unavailable")
    return db, ai


@router.post(
    "/workspaces/{workspace_id}/content/{content_version_id}/analyze",
    response_model=AnalyzeResponse,
)
async def analyze(workspace_id: str, content_version_id: str,
                  request: Request) -> AnalyzeResponse:
    db, ai = _env_bindings(request)
    try:
        await check_workspace_analysis_limit(db, workspace_id)
    except WorkspaceRateLimitExceeded:
        raise HTTPException(
            status_code=429,
            detail="Analysis rate limit exceeded. Try again later.",
            headers={"Retry-After": "60"},
        )

    service = AnalysisService(
        db=db,
        ai_binding=ai,
        claim_repo=CandidateClaimRepository(db),
        finding_repo=VerificationFindingRepository(db),
        version_repo=ContentVersionRepository(db),
        fact_repo=ApprovedFactRepository(db),
        evidence_repo=EvidenceRepository(db),
        terminology_repo=TerminologyRepository(db),
        dependency_repo=ClaimFactDependencyRepository(db),
        audit_repo=AuditEventRepository(db),
        engine=VerificationEngine(),
        extraction_service=ClaimExtractionService(),
    )

    try:
        result = await service.analyze(workspace_id, content_version_id)
    except HTTPException:
        raise
    except ClaimExtractionError as exc:
        status = 502 if "unavailable" in str(exc) or "service error" in str(exc) else 422
        raise HTTPException(status_code=status, detail=str(exc))
    except Exception as exc:  # D1 or other infrastructure failure
        raise HTTPException(status_code=500, detail="Analysis failed")

    return AnalyzeResponse(**result)
