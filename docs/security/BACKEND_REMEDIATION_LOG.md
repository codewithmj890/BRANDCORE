# BRANDCORE — Backend Remediation Log

**Audit date:** 2026-11-05
**Branch:** `security/backend-forensic-hardening`

---

## Fixes Applied

| Fix ID | Finding | File | Change | Root Cause | Status |
|--------|---------|------|--------|------------|--------|
| R-01 | F-01 | `src/app/repositories/stale_detection_repo.py` | `find_stale_releases()` now delegates to `find_stale_releases_detailed()`; removed dead `_passport_stale_reason()` stub | Stub method always returned `(None, None)` | Applied |
| R-02 | F-02 | `src/app/services/verification_engine.py` | `_claim_strength()` uses `re.search(r"\b" + re.escape(word) + r"\b", text_l)` instead of `word in text_l` | Substring matching caused false positives ("all" in "already") | Applied |
| R-03 | F-03 | `src/app/services/verification_engine.py` | `_check_qualifier()` uses `re.search(r"\b" + re.escape(fact_qualifier.lower()) + r"\b", claim_text)` instead of substring `in` check | Substring matching could cause false positives/negatives | Applied |
| R-04 | F-04 | `src/app/repositories/content_repo.py` | `create()` retries up to 3 times on UNIQUE constraint conflict for version number derivation | `SELECT MAX(version_number) + 1` not atomic under concurrency | Applied |
| R-05 | F-08 | `src/app/repositories/fact_repo.py` | Fixed `create()` SQL: 12 `?` placeholders matching 12 columns, all values parameterized | Column/placeholder mismatch (12 columns, 7 placeholders + 4 literals, 8 params) | Applied |
| R-06 | F-12 | `src/app/services/analysis_service.py` | Removed dead `for c in claim_dicts: pass` and `for fd in finding_dicts: pass` loops | Dead code after atomic batch write | Applied |
| R-07 | F-11 | `backend/tests/repository/test_m2_07_repos.py` | Removed duplicate `import sqlite3` (line 12) | Duplicate import | Applied |

---

## Fixes Not Applied (by design)

| Finding | Reason |
|---------|--------|
| F-00 (No auth on product routes) | Production authentication out of scope per PRD §7; requires separately reviewed security task |
| F-13 (POC makes real AI call) | POC route by design; will be removed before Milestone 2 |
| F-14 (No static analysis tools) | Tools not installed; documented as gap for future |
| F-15 (D1 ID placeholder) | Requires user approval to create D1 database |

---

## Verification

- All 148 tests pass (130 original + 18 new forensic regression tests)
- All backend Python files compile successfully via `py_compile`
- Migration 0004 applied and rollback-tested against local D1 state
- No frontend files modified
