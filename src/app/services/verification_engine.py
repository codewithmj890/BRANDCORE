"""
M3-02 to M3-04 — Deterministic verification engine.

Consumes a content version, extracted candidate claims, approved facts,
supporting evidence, applicable policies and approved terminology. Returns
structured findings for all seven canonical finding types.

All checks are deterministic (no LLM as final authority). Numeric comparisons
use Decimal for exactness. A clock provider can be injected so expiry tests do
not depend on the machine date.

Canonical finding types (snake_case, matching the D1 CHECK constraint):
  unsupported_claim, numeric_mismatch, claim_stronger_than_evidence,
  missing_qualifier, scope_mismatch, expired_offer, unapproved_terminology

Severity levels: critical, high, medium, low
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Any

# Canonical finding types (must match D1 verification_finding.finding_type CHECK).
FINDING_TYPES = (
    "unsupported_claim",
    "numeric_mismatch",
    "claim_stronger_than_evidence",
    "missing_qualifier",
    "scope_mismatch",
    "expired_offer",
    "unapproved_terminology",
)

SEVERITIES = ("critical", "high", "medium", "low")

# Strength ordering for claim-vs-evidence comparison (deterministic mapping).
STRENGTH = {
    "universal": 5,
    "all": 5,
    "every": 5,
    "always": 5,
    "proven": 4,
    "guaranteed": 4,
    "clinically shown": 3,
    "demonstrated": 3,
    "up to": 2,
    "up to ": 2,
    "may": 1,
    "might": 1,
    "can": 1,
    "pilot": 1,
    "conditional": 1,
    "limited": 1,
}

# Qualifying words that weaken a claim.
WEAKENERS = {"up to", "may", "might", "can", "pilot", "conditional", "limited", "approximately", "about"}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Finding:
    id: str
    finding_type: str
    severity: str
    content_version_id: str
    claim_id: str | None
    explanation: str
    suggested_correction: str | None
    analysis_batch_id: str
    related_fact_id: str | None = None
    evidence_ids: list[str] = field(default_factory=list)


class VerificationEngine:
    def __init__(self, clock=None):
        self.clock = clock or _now_utc

    # ------------------------------------------------------------------ #
    # Public entry point
    # ------------------------------------------------------------------ #
    def verify(
        self,
        *,
        claims: list[dict],
        facts: list[dict],
        evidence: list[dict],
        terminology: list[dict],
        dependencies: dict[str, list[str]] | None = None,
        analysis_batch_id: str,
        content_version_id: str,
    ) -> list[Finding]:
        """
        Run all applicable deterministic verification checks.

        `dependencies` maps claim_id -> list of fact_ids that explicitly
        support the claim (from claim_fact_dependency). When absent, facts are
        matched by scope overlap deterministically.
        """
        dependencies = dependencies or {}
        findings: list[Finding] = []

        # Index facts by id for quick lookup.
        facts_by_id = {f["id"]: f for f in facts}

        for claim in claims:
            claim_id = claim["id"]
            claim_text = claim.get("claim_text") or ""
            claim_scope = self._parse_scope(claim.get("scope"))
            # Explicit dependency info takes precedence. A claim absent from the
            # dependency map falls back to deterministic scope matching; a claim
            # present with an empty list has no supporting facts.
            has_explicit_dep = claim_id in dependencies
            fact_ids = dependencies.get(claim_id, [])
            supporting = [facts_by_id[fid] for fid in fact_ids if fid in facts_by_id]

            # Deterministic fallback: match facts by scope overlap only when no
            # explicit dependency information exists for the claim.
            if not supporting and not has_explicit_dep:
                supporting = self._match_by_scope(claim, facts)

            # Rule 1: unsupported_claim — no relevant approved fact.
            if not supporting:
                findings.append(Finding(
                    id=self._fid("uc", claim_id),
                    finding_type="unsupported_claim",
                    severity="high",
                    content_version_id=content_version_id,
                    claim_id=claim_id,
                    explanation=("No approved fact supports the claim: "
                                 f"'{claim_text[:80]}'"),
                    suggested_correction=("Add supporting evidence or retract the claim."),
                    analysis_batch_id=analysis_batch_id,
                ))
                continue

            # For each supporting fact, run the exact-value and language rules.
            for fact in supporting:
                findings.extend(self._check_numeric(claim, fact, content_version_id,
                                                    analysis_batch_id))
                findings.extend(self._check_strength(claim, fact, content_version_id,
                                                     analysis_batch_id))
                findings.extend(self._check_qualifier(claim, fact, content_version_id,
                                                      analysis_batch_id))
                findings.extend(self._check_scope(claim, fact, content_version_id,
                                                  analysis_batch_id))

            # Rule 6: expired_offer — fact/evidence expiry passed.
            findings.extend(self._check_expiry(claim, supporting, evidence,
                                               content_version_id, analysis_batch_id))

        # Rule 7: unapproved_terminology — scan all claims once.
        findings.extend(self._check_terminology(claims, terminology,
                                                content_version_id, analysis_batch_id))

        # De-duplicate identical (type, claim) findings within the batch.
        findings = self._dedupe(findings)
        return findings

    # ------------------------------------------------------------------ #
    # Rule 2: numeric_mismatch (Decimal exact comparison)
    # ------------------------------------------------------------------ #
    def _check_numeric(self, claim, fact, content_version_id, analysis_batch_id):
        findings = []
        claim_num = self._to_decimal(claim.get("numeric_value_text"))
        fact_num = self._to_decimal(fact.get("numeric_value"))
        if claim_num is None or fact_num is None:
            return findings
        if claim_num != fact_num:
            findings.append(Finding(
                id=self._fid("nm", claim["id"]),
                finding_type="numeric_mismatch",
                severity="high",
                content_version_id=content_version_id,
                claim_id=claim["id"],
                explanation=(f"Claim states {claim.get('numeric_value_text')} "
                             f"{claim.get('unit') or ''} but approved fact states "
                             f"{fact.get('numeric_value')} {fact.get('unit') or ''}."),
                suggested_correction=(f"Change '{claim.get('numeric_value_text')}' to "
                                      f"'{fact.get('numeric_value')}' to match the approved fact."),
                analysis_batch_id=analysis_batch_id,
                related_fact_id=fact["id"],
            ))
        return findings

    # ------------------------------------------------------------------ #
    # Rule 3: claim_stronger_than_evidence
    # ------------------------------------------------------------------ #
    def _check_strength(self, claim, fact, content_version_id, analysis_batch_id):
        findings = []
        claim_strength = self._claim_strength(claim.get("claim_text") or "",
                                              claim.get("qualifier"))
        fact_strength = self._claim_strength(fact.get("claim_text") or "",
                                             fact.get("qualifier"))
        if claim_strength > fact_strength:
            findings.append(Finding(
                id=self._fid("cs", claim["id"]),
                finding_type="claim_stronger_than_evidence",
                severity="medium",
                content_version_id=content_version_id,
                claim_id=claim["id"],
                explanation=(f"Claim '{claim.get('claim_text')[:60]}' is stronger "
                             f"than the supporting evidence permits."),
                suggested_correction=(f"Add qualifier '{fact.get('qualifier')}' or "
                                      f"restrict the claim to the evidence scope."),
                analysis_batch_id=analysis_batch_id,
                related_fact_id=fact["id"],
            ))
        return findings

    # ------------------------------------------------------------------ #
    # Rule 4: missing_qualifier
    # ------------------------------------------------------------------ #
    def _check_qualifier(self, claim, fact, content_version_id, analysis_batch_id):
        findings = []
        fact_qualifier = fact.get("qualifier")
        claim_qualifier = claim.get("qualifier")
        claim_text = (claim.get("claim_text") or "").lower()
        if fact_qualifier:
            # Fact requires a qualifier. Check word-boundary so "up to" is not
            # falsely found inside words like "update" or "uptime".
            qualifier_present = bool(re.search(
                r"\b" + re.escape(fact_qualifier.lower()) + r"\b", claim_text))
            if not qualifier_present and claim_qualifier != fact_qualifier:
                findings.append(Finding(
                    id=self._fid("mq", claim["id"]),
                    finding_type="missing_qualifier",
                    severity="medium",
                    content_version_id=content_version_id,
                    claim_id=claim["id"],
                    explanation=(f"Claim omits the required qualifier "
                                 f"'{fact_qualifier}' from the approved fact."),
                    suggested_correction=(f"Add the qualifier '{fact_qualifier}' "
                                          f"to the claim."),
                    analysis_batch_id=analysis_batch_id,
                    related_fact_id=fact["id"],
                ))
        return findings

    # ------------------------------------------------------------------ #
    # Rule 5: scope_mismatch
    # ------------------------------------------------------------------ #
    def _check_scope(self, claim, fact, content_version_id, analysis_batch_id):
        findings = []
        claim_scope = self._parse_scope(claim.get("scope"))
        fact_scope = self._parse_scope(fact.get("scope"))
        if not fact_scope:
            return findings
        # Claim scope must be a subset of fact scope for every shared key.
        for key, fact_val in fact_scope.items():
            if key in claim_scope and str(claim_scope[key]) != str(fact_val):
                findings.append(Finding(
                    id=self._fid("sm", claim["id"]),
                    finding_type="scope_mismatch",
                    severity="high",
                    content_version_id=content_version_id,
                    claim_id=claim["id"],
                    explanation=(f"Claim implies {key}={claim_scope[key]} but the "
                                 f"approved fact supports {key}={fact_val}."),
                    suggested_correction=(f"Restrict the claim to {key}={fact_val} "
                                          f"per the approved fact scope."),
                    analysis_batch_id=analysis_batch_id,
                    related_fact_id=fact["id"],
                ))
                break
        return findings

    # ------------------------------------------------------------------ #
    # Rule 6: expired_offer
    # ------------------------------------------------------------------ #
    def _check_expiry(self, claim, supporting, evidence, content_version_id,
                      analysis_batch_id):
        findings = []
        now = self.clock()
        now_date = now.date().isoformat()
        # Check fact scope valid_until and evidence expiry.
        sources = list(supporting) + list(evidence)
        for src in sources:
            scope = self._parse_scope(src.get("scope"))
            valid_until = scope.get("valid_until")
            if valid_until and valid_until < now_date:
                findings.append(Finding(
                    id=self._fid("eo", claim["id"]),
                    finding_type="expired_offer",
                    severity="critical",
                    content_version_id=content_version_id,
                    claim_id=claim["id"],
                    explanation=(f"Referenced offer expired on {valid_until} "
                                 f"(current date {now_date})."),
                    suggested_correction="Remove or update the expired offer reference.",
                    analysis_batch_id=analysis_batch_id,
                    related_fact_id=src.get("id"),
                ))
                break
        return findings

    # ------------------------------------------------------------------ #
    # Rule 7: unapproved_terminology
    # ------------------------------------------------------------------ #
    def _check_terminology(self, claims, terminology, content_version_id,
                           analysis_batch_id):
        findings = []
        denied = {t["term"].lower() for t in terminology
                  if t.get("status") == "denied"}
        for claim in claims:
            text = (claim.get("claim_text") or "").lower()
            for term in denied:
                # Word-boundary match: don't flag approved term as substring.
                if re.search(r"\b" + re.escape(term) + r"\b", text):
                    findings.append(Finding(
                        id=self._fid("ut", claim["id"]),
                        finding_type="unapproved_terminology",
                        severity="critical",
                        content_version_id=claim.get("content_version_id") or "",
                        claim_id=claim["id"],
                        explanation=(f'The term "{term}" is on the denied '
                                     f"terminology list."),
                        suggested_correction=f'Remove or replace "{term}".',
                        analysis_batch_id=analysis_batch_id,
                    ))
                    break
        return findings

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    def _match_by_scope(self, claim, facts):
        """Deterministic fallback: facts whose scope is compatible with claim."""
        claim_scope = self._parse_scope(claim.get("scope"))
        matched = []
        for fact in facts:
            fact_scope = self._parse_scope(fact.get("scope"))
            if self._scopes_compatible(claim_scope, fact_scope):
                matched.append(fact)
        return matched

    @staticmethod
    def _scopes_compatible(claim_scope, fact_scope) -> bool:
        if not fact_scope:
            return True
        for key, val in fact_scope.items():
            if key in claim_scope and str(claim_scope[key]) != str(val):
                return False
        return True

    @staticmethod
    def _parse_scope(scope) -> dict:
        if isinstance(scope, dict):
            return {k: v for k, v in scope.items() if v is not None}
        if isinstance(scope, str):
            try:
                data = json.loads(scope)
                if isinstance(data, dict):
                    return {k: v for k, v in data.items() if v is not None}
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}

    @staticmethod
    def _to_decimal(value) -> Decimal | None:
        if value is None or value == "":
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError, TypeError):
            return None

    @classmethod
    def _claim_strength(cls, text: str, qualifier: str | None) -> int:
        text_l = (text or "").lower()
        qual_l = (qualifier or "").lower()
        # Qualifier-based strength is the most deterministic signal.
        if qual_l in STRENGTH:
            return STRENGTH[qual_l]
        # Text-based fallback: match whole words only (word-boundary),
        # so "all" does not match "already" or "always".
        for word, strength in STRENGTH.items():
            if re.search(r"\b" + re.escape(word) + r"\b", text_l):
                return strength
        return 3  # neutral default

    @staticmethod
    def _fid(prefix: str, claim_id: str) -> str:
        return f"{prefix}-{claim_id}"

    @staticmethod
    def _dedupe(findings: list[Finding]) -> list[Finding]:
        seen = set()
        out = []
        for f in findings:
            key = (f.finding_type, f.claim_id)
            if key in seen:
                continue
            seen.add(key)
            out.append(f)
        return out
