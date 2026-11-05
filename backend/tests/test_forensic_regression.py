"""
BRANDCORE Backend Forensic Audit — Regression Tests.

These tests reproduce and verify fixes for defects discovered during the
forensic audit (Phases B–G). Each test is tied to a specific finding ID.

No remote Workers AI calls are made — all AI interactions use fake bindings.
"""
import asyncio
import json
import os
import re
import sqlite3
from datetime import datetime, timezone

import pytest

from app.domain.models import (
    ApprovedFactCreate,
    ContentItemCreate,
    ContentVersionCreate,
    WorkspaceCreate,
    now_utc,
)
from app.repositories.base import SqliteD1Wrapper
from app.repositories.content_repo import ContentItemRepository, ContentVersionRepository
from app.repositories.fact_repo import ApprovedFactRepository
from app.repositories.stale_detection_repo import StaleDetectionRepository
from app.services.verification_engine import VerificationEngine


def _db():
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    mig_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "database", "migrations")
    )
    for name in sorted(os.listdir(mig_dir)):
        if name.endswith(".sql"):
            with open(os.path.join(mig_dir, name), encoding="utf-8") as f:
                conn.executescript(f.read())
    conn.execute(
        "INSERT INTO workspace (id, name, slug, demo_flag, status, created_at, updated_at) "
        "VALUES ('ws-1', 'Workspace One', 'ws-one', 1, 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
    )
    conn.commit()
    return SqliteD1Wrapper(conn)


def _run(coro):
    return asyncio.run(coro)


# ---------------------------------------------------------------------------
# Finding F-01: Stale Detection — find_stale_releases() was a stub that always
# returned empty. Fix: delegate to find_stale_releases_detailed().
# ---------------------------------------------------------------------------

def _seed_stale_baseline(db):
    """Seed workspace, content, fact, policy, passport for stale detection."""
    conn = db._conn
    conn.execute(
        "INSERT INTO content_item (id,workspace_id,title,status,created_by,created_at,updated_at) "
        "VALUES ('ci-1','ws-1','T','active','c','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO content_version (id,workspace_id,content_item_id,version_number,body_text,sha256_hash,submitted_by,created_at) "
        "VALUES ('cv-1','ws-1','ci-1',1,'body v1','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','c','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO content_version (id,workspace_id,content_item_id,version_number,body_text,sha256_hash,submitted_by,created_at) "
        "VALUES ('cv-2','ws-1','ci-1',2,'body v2','bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb','c','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO approved_fact (id,workspace_id,claim_text,numeric_value,unit,qualifier,scope,version,status,previous_version_id,created_by,created_at) "
        "VALUES ('fact-1','ws-1','fact text','30','percent','up to',NULL,1,'active',NULL,'c','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO policy (id,workspace_id,name,description,rules_json,version,status,previous_version_id,created_by,created_at) "
        "VALUES ('pol-1','ws-1','P','d','[]',1,'active',NULL,'c','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO audit_event (id,workspace_id,actor_id,actor_role,action,entity_type,entity_id,details,correlation_id,created_at) "
        "VALUES ('audit-1','ws-1','ap','reviewer','review_decision','review_decision','rd-1','{}','batch-1','2026-01-01T00:00:00Z')"
    )
    conn.commit()


def test_f01_find_stale_releases_detects_fact_change():
    """F-01: find_stale_releases() must detect stale releases (was always empty)."""
    db = _db()
    _seed_stale_baseline(db)

    stale = StaleDetectionRepository(db)

    # Create a passport depending on fact-1 version 1.
    _run(db.prepare(
        "INSERT INTO release_passport (id, workspace_id, content_item_id, content_version_id, "
        "content_sha256, policy_version_id, fact_evidence_versions, finding_ids_and_dispositions, "
        "approver_id, approver_role, decision_timestamp, audit_reference, status, created_at) "
        "VALUES ('rp-1', 'ws-1', 'ci-1', 'cv-2', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', "
        "'pol-1', '[{\"type\":\"fact\",\"id\":\"fact-1\",\"version\":1}]', '[]', 'reviewer-1', 'reviewer', "
        "'2026-01-01T00:00:00Z', 'audit-1', 'valid', '2026-01-01T00:00:00Z')"
    ).run())

    # Before fact change: not stale.
    result_before = _run(stale.find_stale_releases("ws-1"))
    assert result_before == [], "find_stale_releases should return empty before fact change"

    # After fact version changes to 2: should be detected as stale.
    conn = db._conn
    conn.execute(
        "INSERT INTO approved_fact (id,workspace_id,claim_text,numeric_value,unit,qualifier,scope,version,status,previous_version_id,created_by,created_at) "
        "VALUES ('fact-1-v2','ws-1','fact text v2','50','percent','up to',NULL,2,'active','fact-1','c','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "UPDATE approved_fact SET status='superseded' WHERE id='fact-1' AND workspace_id='ws-1'"
    )
    conn.commit()

    result_after = _run(stale.find_stale_releases("ws-1"))
    assert len(result_after) == 1, f"Expected 1 stale release, got {len(result_after)}"
    assert result_after[0].passport_id == "rp-1"
    assert result_after[0].changed_dependency == "approved_fact"
    assert "version" in result_after[0].stale_reason


def test_f01_find_stale_releases_matches_detailed():
    """F-01: find_stale_releases() must return same results as find_stale_releases_detailed()."""
    db = _db()
    _seed_stale_baseline(db)

    stale = StaleDetectionRepository(db)
    _run(db.prepare(
        "INSERT INTO release_passport (id, workspace_id, content_item_id, content_version_id, "
        "content_sha256, policy_version_id, fact_evidence_versions, finding_ids_and_dispositions, "
        "approver_id, approver_role, decision_timestamp, audit_reference, status, created_at) "
        "VALUES ('rp-1', 'ws-1', 'ci-1', 'cv-2', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', "
        "'pol-1', '[{\"type\":\"fact\",\"id\":\"fact-1\",\"version\":1}]', '[]', 'reviewer-1', 'reviewer', "
        "'2026-01-01T00:00:00Z', 'audit-1', 'valid', '2026-01-01T00:00:00Z')"
    ).run())

    basic = _run(stale.find_stale_releases("ws-1"))
    detailed = _run(stale.find_stale_releases_detailed("ws-1"))
    assert basic == detailed


# ---------------------------------------------------------------------------
# Finding F-02: VerificationEngine._claim_strength used substring matching
# ("all" matched "already", "almost"). Fix: word-boundary matching.
# ---------------------------------------------------------------------------

def test_f02_strength_word_boundary_all_does_not_match_already():
    """F-02: "all" strength word must not match "already" via substring."""
    eng = VerificationEngine()
    claims = [
        {"id": "c1", "content_version_id": "cv-1", "claim_text": "This already works.",
         "numeric_value_text": None, "unit": None, "qualifier": None, "scope": None},
    ]
    facts = [
        {"id": "f1", "claim_text": "Supported.", "numeric_value": None, "unit": None,
         "qualifier": None, "scope": None, "version": 1},
    ]
    findings = eng.verify(
        claims=claims, facts=facts, evidence=[], terminology=[],
        dependencies={"c1": ["f1"]}, analysis_batch_id="b",
        content_version_id="cv-1",
    )
    strength_findings = [f for f in findings if f.finding_type == "claim_stronger_than_evidence"]
    assert strength_findings == [], (
        "'all' should not match 'already' — no claim_stronger_than_evidence expected"
    )


def test_f02_strength_word_boundary_all_matches_standalone_all():
    """F-02: "all" strength word must match standalone word "all"."""
    eng = VerificationEngine()
    claims = [
        {"id": "c1", "content_version_id": "cv-1", "claim_text": "Works for all customers.",
         "numeric_value_text": None, "unit": None, "qualifier": None, "scope": None},
    ]
    facts = [
        {"id": "f1", "claim_text": "Works for some customers.", "numeric_value": None,
         "unit": None, "qualifier": None, "scope": None, "version": 1},
    ]
    findings = eng.verify(
        claims=claims, facts=facts, evidence=[], terminology=[],
        dependencies={"c1": ["f1"]}, analysis_batch_id="b",
        content_version_id="cv-1",
    )
    strength_findings = [f for f in findings if f.finding_type == "claim_stronger_than_evidence"]
    assert len(strength_findings) == 1, (
        "'all' as standalone word should trigger claim_stronger_than_evidence"
    )


# ---------------------------------------------------------------------------
# Finding F-03: VerificationEngine._check_qualifier used substring matching
# ("up to" could be falsely found inside "update"/"uptime"). Fix: word-boundary.
# ---------------------------------------------------------------------------

def test_f03_qualifier_word_boundary_up_to_not_in_update():
    """F-03: "up to" qualifier must not be falsely matched inside "upto" (no space).

    The claim contains "upto" as a single word. Since "up to" (with space) is
    not present as a word-boundary phrase, the claim correctly does NOT satisfy
    the qualifier — but the key point is that word-boundary matching prevents
    false positives where a shorter qualifier could match inside a longer word.
    """
    eng = VerificationEngine()
    claims = [
        {"id": "c1", "content_version_id": "cv-1",
         "claim_text": "Results are upto 30 percent better.",
         "numeric_value_text": None, "unit": None, "qualifier": None, "scope": None},
    ]
    facts = [
        {"id": "f1", "claim_text": "Supported.", "numeric_value": None, "unit": None,
         "qualifier": "up to", "scope": None, "version": 1},
    ]
    findings = eng.verify(
        claims=claims, facts=facts, evidence=[], terminology=[],
        dependencies={"c1": ["f1"]}, analysis_batch_id="b",
        content_version_id="cv-1",
    )
    # "upto" (one word) does NOT contain "up to" (word-boundary phrase).
    # The claim is missing the qualifier → missing_qualifier IS correct here.
    qualifier_findings = [f for f in findings if f.finding_type == "missing_qualifier"]
    assert len(qualifier_findings) == 1, (
        "'upto' is not 'up to' — missing_qualifier should be flagged"
    )


def test_f03_qualifier_word_boundary_up_to_present_not_flagged():
    """F-03: When "up to" IS present as word-boundary phrase, no missing_qualifier."""
    eng = VerificationEngine()
    claims = [
        {"id": "c1", "content_version_id": "cv-1",
         "claim_text": "Reduces dark spots by up to 30 percent.",
         "numeric_value_text": None, "unit": None, "qualifier": None, "scope": None},
    ]
    facts = [
        {"id": "f1", "claim_text": "Supported.", "numeric_value": None, "unit": None,
         "qualifier": "up to", "scope": None, "version": 1},
    ]
    findings = eng.verify(
        claims=claims, facts=facts, evidence=[], terminology=[],
        dependencies={"c1": ["f1"]}, analysis_batch_id="b",
        content_version_id="cv-1",
    )
    qualifier_findings = [f for f in findings if f.finding_type == "missing_qualifier"]
    assert qualifier_findings == [], (
        "'up to' present as word-boundary phrase — no missing_qualifier expected"
    )


# ---------------------------------------------------------------------------
# Finding F-04: ContentVersionRepository version number race condition —
# SELECT MAX + 1 is not atomic. Fix: retry on UNIQUE conflict.
# Regression: concurrent creation should not silently produce duplicates.
# ---------------------------------------------------------------------------

def test_f04_version_number_unique_constraint_enforced():
    """F-04: Duplicate version numbers for same content_item are rejected."""
    db = _db()
    items = ContentItemRepository(db)
    versions = ContentVersionRepository(db)

    _run(items.create("ci-1", "ws-1", ContentItemCreate(title="Campaign")))

    _run(versions.create("cv-1", "ws-1", ContentVersionCreate(
        content_item_id="ci-1", body_text="version one", submitted_by="creator"
    )))

    # Inserting a second row with version_number=1 for same content_item must fail.
    with pytest.raises(Exception):
        _run(db.prepare(
            "INSERT INTO content_version (id, workspace_id, content_item_id, version_number, "
            "body_text, sha256_hash, submitted_by, created_at) "
            "VALUES ('cv-dup', 'ws-1', 'ci-1', 1, 'duplicate', 'deadbeef', 'creator', '2026-01-01T00:00:00Z')"
        ).run())


# ---------------------------------------------------------------------------
# Finding F-05: No authentication on product analyze endpoint — any workspace_id
# is accepted. Regression: verify cross-workspace access is rejected at DB level.
# ---------------------------------------------------------------------------

def test_f05_analyze_cross_workspace_rejected_at_db_level():
    """F-05: Content version lookup is workspace-scoped — cross-workspace returns None."""
    db = _db()
    items = ContentItemRepository(db)
    versions = ContentVersionRepository(db)

    _run(items.create("ci-1", "ws-1", ContentItemCreate(title="Campaign")))
    _run(versions.create("cv-1", "ws-1", ContentVersionCreate(
        content_item_id="ci-1", body_text="body", submitted_by="creator"
    )))

    # Looking up cv-1 under ws-2 must return None (cross-workspace rejected).
    result = _run(versions.get("cv-1", "ws-2"))
    assert result is None, "Cross-workspace content version access must be rejected"


# ---------------------------------------------------------------------------
# Finding F-06: Deterministic finding types and severities match D1 CHECK constraints.
# ---------------------------------------------------------------------------

def test_f06_finding_types_match_d1_constraint():
    """F-06: All seven canonical finding types are valid per D1 CHECK."""
    expected = {
        "unsupported_claim", "numeric_mismatch", "claim_stronger_than_evidence",
        "missing_qualifier", "scope_mismatch", "expired_offer", "unapproved_terminology",
    }
    from app.services.verification_engine import FINDING_TYPES
    assert set(FINDING_TYPES) == expected


def test_f06_severities_match_d1_constraint():
    """F-06: All four severities are valid per D1 CHECK."""
    expected = {"critical", "high", "medium", "low"}
    from app.services.verification_engine import SEVERITIES
    assert set(SEVERITIES) == expected


# ---------------------------------------------------------------------------
# Finding F-07: Decimal numeric comparison is exact (no float conversion).
# ---------------------------------------------------------------------------

def test_f07_decimal_40_equals_40_0():
    """F-07: Decimal treats "40" and "40.0" as equal — no float noise."""
    eng = VerificationEngine()
    claims = [
        {"id": "c1", "content_version_id": "cv-1", "claim_text": "Reduces by 40 percent.",
         "numeric_value_text": "40", "unit": "percent", "qualifier": None, "scope": None},
    ]
    facts = [
        {"id": "f1", "claim_text": "Reduces by 40 percent.", "numeric_value": "40.0",
         "unit": "percent", "qualifier": None, "scope": None, "version": 1},
    ]
    findings = eng.verify(
        claims=claims, facts=facts, evidence=[], terminology=[],
        dependencies={"c1": ["f1"]}, analysis_batch_id="b",
        content_version_id="cv-1",
    )
    mismatch = [f for f in findings if f.finding_type == "numeric_mismatch"]
    assert mismatch == [], "40 and 40.0 must be equal under Decimal comparison"


# ---------------------------------------------------------------------------
# Finding F-08: Repository queries are workspace-scoped — no cross-workspace leaks.
# ---------------------------------------------------------------------------

def test_f08_fact_repo_workspace_isolation():
    """F-08: ApprovedFactRepository.list_by_workspace only returns rows for that workspace."""
    db = _db()
    facts = ApprovedFactRepository(db)

    # Create workspace ws-2 first (FK requires parent workspace row).
    _run(db.prepare(
        "INSERT INTO workspace (id, name, slug, demo_flag, status, created_at, updated_at) "
        "VALUES ('ws-2', 'Workspace Two', 'ws-two', 1, 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
    ).run())

    _run(facts.create("fact-a", "ws-1", ApprovedFactCreate(
        claim_text="Fact A", numeric_value="10", unit="percent", qualifier=None,
        scope=None
    )))
    _run(facts.create("fact-b", "ws-2", ApprovedFactCreate(
        claim_text="Fact B", numeric_value="20", unit="percent", qualifier=None,
        scope=None
    )))

    ws1_facts = _run(facts.list_by_workspace("ws-1"))
    assert ws1_facts.total == 1
    assert ws1_facts.items[0].claim_text == "Fact A"

    ws2_facts = _run(facts.list_by_workspace("ws-2"))
    assert ws2_facts.total == 1
    assert ws2_facts.items[0].claim_text == "Fact B"


# ---------------------------------------------------------------------------
# Finding F-09: Content version immutability — UPDATE/DELETE blocked by trigger.
# ---------------------------------------------------------------------------

def test_f09_content_version_immutability_trigger():
    """F-09: content_version UPDATE is blocked by DB trigger."""
    db = _db()
    items = ContentItemRepository(db)
    versions = ContentVersionRepository(db)

    _run(items.create("ci-1", "ws-1", ContentItemCreate(title="Campaign")))
    _run(versions.create("cv-1", "ws-1", ContentVersionCreate(
        content_item_id="ci-1", body_text="original", submitted_by="creator"
    )))

    with pytest.raises(Exception):
        _run(db.prepare(
            "UPDATE content_version SET body_text = 'changed' WHERE id = 'cv-1'"
        ).run())

    fetched = _run(versions.get("cv-1", "ws-1"))
    assert fetched.body_text == "original"


# ---------------------------------------------------------------------------
# Finding F-10: Release passport immutability — UPDATE blocked by trigger.
# ---------------------------------------------------------------------------

def test_f10_release_passport_immutability_trigger():
    """F-10: release_passport UPDATE is blocked by DB trigger."""
    db = _db()
    from app.domain.models import ReleasePassportCreate
    from app.repositories.passport_repo import ReleasePassportRepository

    conn = db._conn
    conn.execute(
        "INSERT INTO content_item (id,workspace_id,title,status,created_by,created_at,updated_at) "
        "VALUES ('ci-1','ws-1','T','active','c','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO content_version (id,workspace_id,content_item_id,version_number,body_text,sha256_hash,submitted_by,created_at) "
        "VALUES ('cv-1','ws-1','ci-1',1,'body v1','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','c','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO policy (id,workspace_id,name,description,rules_json,version,status,previous_version_id,created_by,created_at) "
        "VALUES ('pol-1','ws-1','P','d','[]',1,'active',NULL,'c','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO audit_event (id,workspace_id,actor_id,actor_role,action,entity_type,entity_id,details,correlation_id,created_at) "
        "VALUES ('audit-1','ws-1','ap','reviewer','review_decision','review_decision','rd-1','{}','batch-1','2026-01-01T00:00:00Z')"
    )
    conn.commit()

    passports = ReleasePassportRepository(db)
    _run(passports.create(
        "rp-1", "ws-1", ReleasePassportCreate(
            content_version_id="cv-1",
            content_sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            policy_version_id="pol-1",
            fact_evidence_versions="[]",
            finding_ids_and_dispositions="[]",
            approver_id="reviewer-1", approver_role="reviewer",
            decision_timestamp="2026-01-01T00:00:00Z", audit_reference="audit-1",
        )
    ))

    with pytest.raises(Exception):
        _run(db.prepare(
            "UPDATE release_passport SET status='stale' WHERE id='rp-1'"
        ).run())

    fetched = _run(passports.get("rp-1", "ws-1"))
    assert fetched.status == "valid"


# ---------------------------------------------------------------------------
# Finding F-12: Property-based invariants (manual, no hypothesis dependency).
# ---------------------------------------------------------------------------

def test_f12_invariant_no_cross_workspace_claim_fact_link():
    """F-12: claim_fact_dependency cannot link claim and fact from different workspaces."""
    db = _db()
    conn = db._conn
    # Create workspace ws-2
    conn.execute(
        "INSERT INTO workspace (id, name, slug, demo_flag, status, created_at, updated_at) "
        "VALUES ('ws-2', 'Workspace Two', 'ws-two', 1, 'active', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO content_item (id,workspace_id,title,status,created_by,created_at,updated_at) "
        "VALUES ('ci-2','ws-2','T2','active','c','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO content_version (id,workspace_id,content_item_id,version_number,body_text,sha256_hash,submitted_by,created_at) "
        "VALUES ('cv-2','ws-2','ci-2',1,'body','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','c','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO candidate_claim (id,workspace_id,content_version_id,claim_text,extraction_batch_id,extracted_by,extracted_at) "
        "VALUES ('cc-2','ws-2','cv-2','claim','batch','model','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "INSERT INTO approved_fact (id,workspace_id,claim_text,numeric_value,unit,qualifier,scope,version,status,previous_version_id,created_by,created_at) "
        "VALUES ('fact-1','ws-1','fact text',NULL,NULL,NULL,NULL,1,'active',NULL,'c','2026-01-01T00:00:00Z')"
    )
    conn.commit()

    # Cross-workspace dependency must fail (composite FK + CHECK constraint).
    with pytest.raises(Exception):
        conn.execute(
            "INSERT INTO claim_fact_dependency (id, workspace_id, claim_id, claim_workspace, "
            "fact_id, fact_workspace, dependency_type, created_at) "
            "VALUES ('d-x','ws-1','cc-2','ws-1','fact-1','ws-1','supports','2026-01-01T00:00:00Z')"
        )
    conn.rollback()


def test_f12_invariant_version_number_monotonic():
    """F-12: Version numbers for a content item are always >= 1 and unique."""
    db = _db()
    items = ContentItemRepository(db)
    versions = ContentVersionRepository(db)

    _run(items.create("ci-1", "ws-1", ContentItemCreate(title="Campaign")))
    for n in (1, 2, 3, 10, 100):
        _run(versions.create(f"cv-{n}", "ws-1", ContentVersionCreate(
            content_item_id="ci-1", body_text=f"body {n}", submitted_by="creator"
        )))

    rows = _run(db.prepare(
        "SELECT version_number FROM content_version WHERE content_item_id = 'ci-1' "
        "ORDER BY version_number"
    ).all())
    nums = [r["version_number"] for r in rows]
    assert nums == sorted(nums)
    assert len(nums) == len(set(nums))  # no duplicates
    assert all(n >= 1 for n in nums)


def test_f12_invariant_decimal_exactness():
    """F-12: Decimal comparison treats 40 and 40.00 as equal (no float noise)."""
    from decimal import Decimal
    assert Decimal("40") == Decimal("40.00")
    assert Decimal("40") == Decimal("40.0")
    assert Decimal("0.1") + Decimal("0.2") == Decimal("0.3")  # exact, not float
    assert Decimal("0.1") + Decimal("0.2") != float(0.1) + float(0.2)  # float is inexact


def test_f12_invariant_seed_idempotency():
    """F-12: Repeated seeding creates no duplicate rows."""
    import os
    import sqlite3
    from app.seed_demo import seed

    mig_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "database", "migrations")
    )
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    for name in sorted(os.listdir(mig_dir)):
        if name.endswith(".sql"):
            with open(os.path.join(mig_dir, name), encoding="utf-8") as f:
                conn.executescript(f.read())

    seed(conn)
    counts_before = {
        t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        for t in ("workspace", "evidence", "approved_fact", "fact_evidence",
                  "policy", "terminology", "content_item", "content_version",
                  "candidate_claim", "verification_finding", "claim_fact_dependency",
                  "review_decision", "release_passport", "release_status_event",
                  "audit_event")
    }
    seed(conn)
    seed(conn)
    counts_after = {
        t: conn.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
        for t in counts_before
    }
    assert counts_after == counts_before, counts_after
    conn.close()
