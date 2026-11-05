"""
M2-07 release/dependency/stale detection repository tests.

Runs real repositories against an in-memory SQLite database through
SqliteD1Wrapper. Verifies passport immutability, append-only status events,
dependency traversal (fact→claims, claim→facts), and evidence-change-aware
stale detection against SQLite itself.
"""
import asyncio
import json
import os
import sqlite3

import pytest

from app.domain.models import (
    AuditEventCreate,
    ClaimFactDependencyCreate,
    ListResult,
    ReleasePassportCreate,
    ReleaseStatusEventCreate,
    StaleRelease,
    now_utc,
)
from app.repositories.base import SqliteD1Wrapper
from app.repositories.claim_repo import CandidateClaimRepository
from app.repositories.content_repo import ContentItemRepository, ContentVersionRepository
from app.repositories.dependency_repo import ClaimFactDependencyRepository
from app.repositories.event_repo import (  # noqa: F401
    AuditEventRepository,
    ReleaseStatusEventRepository,
)
from app.repositories.passport_repo import ReleasePassportRepository
from app.repositories.stale_detection_repo import StaleDetectionRepository


def _db():
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON")
    mig_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "database", "migrations")
    )
    for name in sorted(os.listdir(mig_dir)):
        if name.endswith(".sql"):
            with open(os.path.join(mig_dir, name), encoding="utf-8") as f:
                conn.executescript(f.read())
    # Seed workspace + content + fact + policy needed by passport tests.
    conn.execute(
        "INSERT INTO workspace (id,name,slug,demo_flag,status,created_at,updated_at) "
        "VALUES ('ws-1','W','w',1,'active','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z')"
    )
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
        "INSERT INTO candidate_claim (id,workspace_id,content_version_id,claim_text,extraction_batch_id,extracted_by,extracted_at) "
        "VALUES ('cc-1','ws-1','cv-1','claim one','batch-1','model','2026-01-01T00:00:00Z')"
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
    return SqliteD1Wrapper(conn)


def _run(coro):
    return asyncio.run(coro)


@pytest.fixture
def repos():
    db = _db()
    return {
        "passports": ReleasePassportRepository(db),
        "events": ReleaseStatusEventRepository(db),
        "audit": AuditEventRepository(db),
        "deps": ClaimFactDependencyRepository(db),
        "stale": StaleDetectionRepository(db),
        "claims": CandidateClaimRepository(db),
        "versions": ContentVersionRepository(db),
        "items": ContentItemRepository(db),
        "db": db,
    }


def test_release_passport_create_and_get(repos):
    p = _run(repos["passports"].create(
        "rp-1", "ws-1", ReleasePassportCreate(
            content_version_id="cv-1",
            content_sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            policy_version_id="pol-1",
            fact_evidence_versions=json.dumps([{"type": "fact", "id": "fact-1", "version": 1}]),
            finding_ids_and_dispositions=json.dumps([]),
            approver_id="reviewer-1",
            approver_role="reviewer",
            decision_timestamp="2026-01-01T00:00:00Z",
            audit_reference="audit-1",
        )
    ))
    assert p is not None
    assert p.id == "rp-1"
    assert p.status == "valid"
    fetched = _run(repos["passports"].get("rp-1", "ws-1"))
    assert fetched is not None and fetched.content_version_id == "cv-1"


def test_release_passport_one_per_content_version(repos):
    _run(repos["passports"].create(
        "rp-1", "ws-1", ReleasePassportCreate(
            content_version_id="cv-1",
            content_sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            policy_version_id="pol-1",
            fact_evidence_versions=json.dumps([]),
            finding_ids_and_dispositions=json.dumps([]),
            approver_id="reviewer-1", approver_role="reviewer",
            decision_timestamp="2026-01-01T00:00:00Z", audit_reference="audit-1",
        )
    ))
    # unique(content_version_id) prevents a second passport for cv-1.
    with pytest.raises(sqlite3.IntegrityError):
        _run(repos["passports"].create(
            "rp-2", "ws-1", ReleasePassportCreate(
                content_version_id="cv-1",
                content_sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                policy_version_id="pol-1",
                fact_evidence_versions=json.dumps([]),
                finding_ids_and_dispositions=json.dumps([]),
                approver_id="reviewer-1", approver_role="reviewer",
                decision_timestamp="2026-01-01T00:00:00Z", audit_reference="audit-1",
            )
        ))


def test_release_passport_immutable(repos):
    _run(repos["passports"].create(
        "rp-1", "ws-1", ReleasePassportCreate(
            content_version_id="cv-1",
            content_sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            policy_version_id="pol-1",
            fact_evidence_versions=json.dumps([]),
            finding_ids_and_dispositions=json.dumps([]),
            approver_id="reviewer-1", approver_role="reviewer",
            decision_timestamp="2026-01-01T00:00:00Z", audit_reference="audit-1",
        )
    ))
    # DB trigger rejects direct UPDATE.
    with pytest.raises(Exception):
        _run(repos["passports"].db.prepare(
            "UPDATE release_passport SET status='stale' WHERE id='rp-1'"
        ).run())
    fetched = _run(repos["passports"].get("rp-1", "ws-1"))
    assert fetched.status == "valid"


def test_release_status_event_append_and_current_status(repos):
    _run(repos["passports"].create(
        "rp-1", "ws-1", ReleasePassportCreate(
            content_version_id="cv-1",
            content_sha256="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            policy_version_id="pol-1",
            fact_evidence_versions=json.dumps([]),
            finding_ids_and_dispositions=json.dumps([]),
            approver_id="reviewer-1", approver_role="reviewer",
            decision_timestamp="2026-01-01T00:00:00Z", audit_reference="audit-1",
        )
    ))
    for status in ("pending", "approved", "released"):
        _run(repos["events"].create(
            f"ev-{status}", "ws-1", ReleaseStatusEventCreate(
                passport_id="rp-1", passport_workspace="ws-1",
                status=status, reason=f"reason {status}", timestamp="2026-01-01T00:00:00Z"
            )
        ))
    events = _run(repos["events"].list_for_passport("rp-1", "ws-1"))
    assert events.total == 3
    assert [e.status for e in events.items] == ["pending", "approved", "released"]
    current = _run(repos["events"].current_status("rp-1", "ws-1"))
    assert current == "released"


def test_claim_fact_dependency_traversal(repos):
    _run(repos["deps"].create(
        "d-1", "ws-1", ClaimFactDependencyCreate(
            claim_id="cc-1", claim_workspace="ws-1",
            fact_id="fact-1", fact_workspace="ws-1", dependency_type="supports",
        )
    ))
    # fact → claims
    claims = _run(repos["deps"].claims_for_fact("fact-1", "ws-1"))
    assert claims.total == 1
    # claim → facts
    facts = _run(repos["deps"].facts_for_claim("cc-1", "ws-1"))
    assert facts.total == 1


def test_dependency_cross_workspace_rejected(repos):
    # cc-1 is in ws-1; fact-1 is in ws-1. Try a ws-2 claim (doesn't exist) → FK fail.
    with pytest.raises(Exception):
        _run(repos["deps"].create(
            "d-x", "ws-1", ClaimFactDependencyCreate(
                claim_id="cc-1", claim_workspace="ws-1",
                fact_id="fact-1", fact_workspace="ws-2", dependency_type="supports",
            )
        ))


def test_stale_detection_fact_change(repos):
    # Create a passport that depends on fact-1 version 1.
    _run(repos["passports"].create(
        "rp-1", "ws-1", ReleasePassportCreate(
            content_version_id="cv-2",
            content_sha256="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            policy_version_id="pol-1",
            fact_evidence_versions=json.dumps([{"type": "fact", "id": "fact-1", "version": 1}]),
            finding_ids_and_dispositions=json.dumps([]),
            approver_id="reviewer-1", approver_role="reviewer",
            decision_timestamp="2026-01-01T00:00:00Z", audit_reference="audit-1",
        )
    ))
    stale = _run(repos["stale"].find_stale_releases_detailed("ws-1"))
    assert stale == []  # fact-1 version 1 is current → not stale

    # Now create a new version of fact-1 (version 2), superseding v1.
    conn = repos["db"]._conn
    conn.execute(
        "INSERT INTO approved_fact (id,workspace_id,claim_text,numeric_value,unit,qualifier,scope,version,status,previous_version_id,created_by,created_at) "
        "VALUES ('fact-1-v2','ws-1','fact text v2','50','percent','up to',NULL,2,'active','fact-1','c','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "UPDATE approved_fact SET status='superseded' WHERE id='fact-1' AND workspace_id='ws-1'"
    )
    conn.commit()

    stale = _run(repos["stale"].find_stale_releases_detailed("ws-1"))
    assert len(stale) == 1
    assert stale[0].passport_id == "rp-1"
    assert stale[0].changed_dependency == "approved_fact"
    assert "version" in stale[0].stale_reason


def test_stale_detection_no_duplicate_events(repos):
    _run(repos["passports"].create(
        "rp-1", "ws-1", ReleasePassportCreate(
            content_version_id="cv-2",
            content_sha256="bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            policy_version_id="pol-1",
            fact_evidence_versions=json.dumps([{"type": "fact", "id": "fact-1", "version": 1}]),
            finding_ids_and_dispositions=json.dumps([]),
            approver_id="reviewer-1", approver_role="reviewer",
            decision_timestamp="2026-01-01T00:00:00Z", audit_reference="audit-1",
        )
    ))
    # Mark stale once.
    conn = repos["db"]._conn
    conn.execute(
        "INSERT INTO approved_fact (id,workspace_id,claim_text,numeric_value,unit,qualifier,scope,version,status,previous_version_id,created_by,created_at) "
        "VALUES ('fact-1-v2','ws-1','fact text v2','50','percent','up to',NULL,2,'active','fact-1','c','2026-01-01T00:00:00Z')"
    )
    conn.execute(
        "UPDATE approved_fact SET status='superseded' WHERE id='fact-1' AND workspace_id='ws-1'"
    )
    conn.commit()
    stale = _run(repos["stale"].find_stale_releases_detailed("ws-1"))
    n1 = _run(repos["stale"].mark_newly_stale("ws-1", stale, "2026-01-01T00:00:01Z"))
    assert n1 == 1
    # Re-run: fact still stale, but event already exists → no duplicate.
    stale2 = _run(repos["stale"].find_stale_releases_detailed("ws-1"))
    n2 = _run(repos["stale"].mark_newly_stale("ws-1", stale2, "2026-01-01T00:00:02Z"))
    assert n2 == 0


def test_audit_event_create(repos):
    e = _run(repos["audit"].create(
        "audit-2", "ws-1", AuditEventCreate(
            workspace_id="ws-1",
            actor_id="reviewer-1", actor_role="reviewer",
            action="release_passport", entity_type="release_passport",
            entity_id="rp-1", details='{"status":"valid"}',
            correlation_id="batch-1",
        )
    ))
    assert e is not None and e.action == "release_passport"
    fetched = _run(repos["audit"].get("audit-2", "ws-1"))
    assert fetched is not None
