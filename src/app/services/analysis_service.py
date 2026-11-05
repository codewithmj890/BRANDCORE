"""
M3-05 — Analysis service.

Orchestrates the full claim-analysis flow for a content version:
fetch version → load facts/evidence/policy/terminology → extract claims via AI
→ persist claims → run deterministic verification → persist findings → create
claim-fact dependencies → append audit events → return structured result.

Every write is workspace-scoped and uses parameterized SQL. Writes are committed
atomically where the D1 batch mechanism is available.
"""
import hashlib
import json
import uuid
from datetime import datetime, timezone

from app.domain.models import now_utc
from app.services.ai_extraction import ClaimExtractionService, ClaimExtractionError
from app.services.verification_engine import VerificationEngine, Finding


class AnalysisService:
    def __init__(self, db, ai_binding, claim_repo, finding_repo, version_repo,
                 fact_repo, evidence_repo, terminology_repo, dependency_repo,
                 audit_repo, engine: VerificationEngine | None = None,
                 extraction_service: ClaimExtractionService | None = None):
        self.db = db
        self.ai_binding = ai_binding
        self.claim_repo = claim_repo
        self.finding_repo = finding_repo
        self.version_repo = version_repo
        self.fact_repo = fact_repo
        self.evidence_repo = evidence_repo
        self.terminology_repo = terminology_repo
        self.dependency_repo = dependency_repo
        self.audit_repo = audit_repo
        self.engine = engine or VerificationEngine()
        self.extraction_service = extraction_service or ClaimExtractionService()

    # ------------------------------------------------------------------ #
    # Public entry point
    # ------------------------------------------------------------------ #
    async def analyze(self, workspace_id: str, content_version_id: str) -> dict:
        # 1. Fetch the exact content version within the workspace.
        version = await self.version_repo.get(content_version_id, workspace_id)
        if version is None:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Content version not found")

        body_text = version["body_text"] if isinstance(version, dict) else version.body_text
        if not body_text or not body_text.strip():
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Content version is empty")

        # 2. Load relevant approved facts, evidence, policies, terminology.
        facts_result = await self.fact_repo.list_by_workspace(workspace_id)
        facts = [f.model_dump() if hasattr(f, "model_dump") else f for f in facts_result.items]

        evidence_result = await self.evidence_repo.list_by_workspace(workspace_id)
        evidence = [e.model_dump() if hasattr(e, "model_dump") else e
                    for e in evidence_result.items]

        # Policies: use active policies as applicable rules.
        from app.repositories.policy_repo import PolicyRepository  # type: ignore
        policy_repo = PolicyRepository(self.db)
        policies_result = await policy_repo.list_by_workspace(workspace_id)
        policies = [p.model_dump() if hasattr(p, "model_dump") else p
                    for p in policies_result.items]

        terminology_result = await self.terminology_repo.list_by_workspace(workspace_id)
        terminology = [t.model_dump() if hasattr(t, "model_dump") else t
                       for t in terminology_result.items]

        # 3. Extract claims via Workers AI.
        extraction_batch_id = f"batch-{uuid.uuid4()}"
        try:
            extractions = await self.extraction_service.extract_claims(
                self.ai_binding, workspace_id, content_version_id, body_text,
                extraction_batch_id,
            )
        except ClaimExtractionError as exc:
            from fastapi import HTTPException
            # AI unavailable → 502; invalid response → 422.
            status = 502 if "unavailable" in str(exc) or "service error" in str(exc) else 422
            raise HTTPException(status_code=status, detail=str(exc))

        # 4. Persist candidate claims (atomic batch).
        claim_records = []
        claim_dicts = []
        for ext in extractions:
            claim_id = f"claim-{uuid.uuid4()}"
            claim_dict = {
                "id": claim_id,
                "workspace_id": workspace_id,
                "content_version_id": content_version_id,
                "claim_text": ext.claim_text,
                "claim_type": ext.claim_type,
                "numeric_value_text": ext.numeric_value_str,
                "unit": ext.unit,
                "qualifier": ext.qualifier,
                "scope": json.dumps(ext.scope) if ext.scope else None,
                "extraction_batch_id": extraction_batch_id,
                "extracted_by": self.extraction_service.model,
                "extracted_at": now_utc(),
            }
            claim_dicts.append(claim_dict)
            claim_records.append(self.db.prepare(
                """
                INSERT INTO candidate_claim
                    (id, workspace_id, content_version_id, claim_text, claim_type,
                     numeric_value_text, unit, qualifier, scope,
                     extraction_batch_id, extracted_by, extracted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """).bind(
                claim_id, workspace_id, content_version_id, ext.claim_text,
                ext.claim_type, ext.numeric_value_str, ext.unit, ext.qualifier,
                json.dumps(ext.scope) if ext.scope else None,
                extraction_batch_id, self.extraction_service.model, now_utc()
            ))

        # 5. Run deterministic verification.
        findings = self.engine.verify(
            claims=[{**c, "id": c["id"]} for c in claim_dicts],
            facts=facts,
            evidence=evidence,
            terminology=terminology,
            dependencies=None,  # dependencies created after verification
            analysis_batch_id=extraction_batch_id,
            content_version_id=content_version_id,
        )

        # 6. Persist findings + create dependencies + audit events (atomic batch).
        statements = list(claim_records)
        analysis_batch_id = extraction_batch_id  # same batch for claims + findings
        finding_dicts = []
        dependency_statements = []
        seen_deps: set[tuple[str, str]] = set()
        for f in findings:
            finding_id = f"finding-{uuid.uuid4()}"
            finding_dict = {
                "id": finding_id,
                "workspace_id": workspace_id,
                "content_version_id": content_version_id,
                "claim_id": f.claim_id,
                "finding_type": f.finding_type,
                "severity": f.severity,
                "explanation": f.explanation,
                "suggested_correction": f.suggested_correction,
                "analysis_batch_id": analysis_batch_id,
                "created_at": now_utc(),
            }
            finding_dicts.append(finding_dict)
            statements.append(self.db.prepare(
                """
                INSERT INTO verification_finding
                    (id, workspace_id, content_version_id, claim_id, finding_type,
                     severity, explanation, suggested_correction, analysis_batch_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """).bind(
                finding_id, workspace_id, content_version_id, f.claim_id,
                f.finding_type, f.severity, f.explanation, f.suggested_correction,
                analysis_batch_id, now_utc()
            ))
            # Create a defensible claim-fact dependency when a related fact exists.
            if f.related_fact_id:
                dep_key = (f.claim_id, f.related_fact_id)
                if dep_key in seen_deps:
                    continue
                seen_deps.add(dep_key)
                dep_id = f"dep-{uuid.uuid4()}"
                dependency_statements.append(self.db.prepare(
                    """
                    INSERT INTO claim_fact_dependency
                        (id, workspace_id, claim_id, claim_workspace, fact_id,
                         fact_workspace, dependency_type, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'supports', ?)
                    """).bind(
                    dep_id, workspace_id, f.claim_id, workspace_id,
                    f.related_fact_id, workspace_id, now_utc()
                ))

        # Audit event for the analysis run.
        audit_id = f"audit-{uuid.uuid4()}"
        statements.append(self.db.prepare(
            """
            INSERT INTO audit_event
                (id, workspace_id, actor_id, actor_role, action, entity_type,
                 entity_id, details, correlation_id, created_at)
            VALUES (?, ?, ?, ?, 'run_verification', 'content_version', ?, ?, ?, ?)
            """).bind(
            audit_id, workspace_id, "system", "system", content_version_id,
            json.dumps({
                "claims": len(claim_dicts),
                "findings": len(finding_dicts),
                "batch": analysis_batch_id,
            }), analysis_batch_id, now_utc()
        ))
        statements.extend(dependency_statements)

        # Execute all writes atomically via D1 batch.
        try:
            await self.db.batch(statements)
        except Exception as exc:
            from fastapi import HTTPException
            raise HTTPException(status_code=500, detail=f"Database write failed: {exc}")

        # 7. Build structured response.
        return {
            "content_version_id": content_version_id,
            "extraction_batch_id": extraction_batch_id,
            "analysis_batch_id": analysis_batch_id,
            "claims": [
                {
                    "id": c["id"],
                    "text": c["claim_text"],
                    "claim_type": c["claim_type"],
                    "numeric_value": c["numeric_value_text"],
                    "unit": c["unit"],
                    "qualifier": c["qualifier"],
                    "scope": c["scope"],
                }
                for c in claim_dicts
            ],
            "findings": [
                {
                    "id": fd["id"],
                    "claim_id": fd["claim_id"],
                    "finding_type": fd["finding_type"],
                    "severity": fd["severity"],
                    "explanation": fd["explanation"],
                    "suggested_correction": fd["suggested_correction"],
                    "analysis_batch_id": fd["analysis_batch_id"],
                }
                for fd in finding_dicts
            ],
            "summary": {
                "claims_count": len(claim_dicts),
                "findings_count": len(finding_dicts),
            },
        }
