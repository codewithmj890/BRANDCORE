# BRANDCORE — Backend Test Matrix

**Audit date:** 2026-11-05
**Branch:** `security/backend-forensic-hardening`

---

## Test Inventory by Category

| Category | File | Test Count | Status |
|----------|------|------------|--------|
| Health endpoint | `backend/tests/test_health.py` | 3 | Pass |
| AI schema validation | `backend/tests/test_ai_schema.py` | 6 | Pass |
| POC route guard | `backend/tests/test_poc_guard.py` | 11 | Pass |
| M2-02 schema/constraints | `backend/tests/test_m2_02_schema.py` | 24 | Pass |
| M2-03 schema/constraints | `backend/tests/test_m2_03_schema.py` | 25 | Pass |
| M2-04 seed | `backend/tests/test_m2_04_seed.py` | 5 | Pass |
| M2-05 workspace repos | `backend/tests/repository/test_workspace_repo.py` | 7 | Pass |
| M2-06 content/claim/finding/review | `backend/tests/repository/test_m2_06_repos.py` | 7 | Pass |
| M2-07 release/dependency/stale | `backend/tests/repository/test_m2_07_repos.py` | 8 | Pass |
| M3-01 AI extraction | `backend/tests/services/test_ai_extraction.py` | 14 | Pass |
| M3-02 to M3-04 verification engine | `backend/tests/services/test_verification_engine.py` | 25 | Pass |
| M3-05 analysis service | `backend/tests/services/test_analysis_service.py` | 7 | Pass |
| Forensic regression (new) | `backend/tests/test_forensic_regression.py` | 18 | Pass |
| **Total** | | **148** | **All pass** |

---

## Test Coverage by Finding

| Finding ID | Test(s) | Type | Coverage |
|------------|---------|------|----------|
| F-00 (No auth) | None | N/A | Documented as blocker |
| F-01 (Stale detection stub) | `test_f01_find_stale_releases_detects_fact_change`, `test_f01_find_stale_releases_matches_detailed` | Regression | Stale detection actually works |
| F-02 (Strength substring) | `test_f02_strength_word_boundary_all_does_not_match_already`, `test_f02_strength_word_boundary_all_matches_standalone_all` | Regression | Word-boundary strength matching |
| F-03 (Qualifier substring) | `test_f03_qualifier_word_boundary_up_to_not_in_update`, `test_f03_qualifier_word_boundary_up_to_present_not_flagged` | Regression | Word-boundary qualifier matching |
| F-04 (Version race) | `test_f04_version_number_unique_constraint_enforced` | Regression | UNIQUE constraint on version_number |
| F-05 (Cross-workspace) | `test_f05_analyze_cross_workspace_rejected_at_db_level` | Regression | Workspace-scoped content version lookup |
| F-06 (Finding types) | `test_f06_finding_types_match_d1_constraint`, `test_f06_severities_match_d1_constraint` | Regression | D1 CHECK constraint alignment |
| F-07 (Decimal exactness) | `test_f07_decimal_40_equals_40_0` | Regression | Decimal comparison correctness |
| F-08 (fact_repo bug) | `test_f08_fact_repo_workspace_isolation` | Regression | fact_repo.create() parameterized correctly |
| F-09 (Content immutability) | `test_f09_content_version_immutability_trigger` | Regression | DB trigger blocks UPDATE/DELETE |
| F-10 (Passport immutability) | `test_f10_release_passport_immutability_trigger` | Regression | DB trigger blocks UPDATE/DELETE |
| F-12 (Property invariants) | `test_f12_invariant_*` | Property | Cross-workspace isolation, version monotonicity, Decimal exactness, seed idempotency |

---

## Test Categories Covered

- **Unit tests:** Repository methods, service methods, domain models
- **Integration tests:** AnalysisService end-to-end with fake AI binding
- **Database integration tests:** All migrations applied to real SQLite with FK enforcement
- **Schema/constraint tests:** CHECK, UNIQUE, FK, trigger enforcement against SQLite
- **Security tests:** POC route guard (404 in production/missing env), cross-workspace rejection
- **Negative tests:** Malformed AI output, missing content version, unavailable AI binding, empty content
- **Boundary tests:** Numeric null values, scope edge cases, terminology word boundaries
- **Property tests:** Cross-workspace isolation, version monotonicity, Decimal exactness, seed idempotency
- **Performance tests:** Manual — stale detection on 1000 passports in ~9ms

---

## Test Gaps (Documented)

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| No authentication/authorization tests | Cannot test what doesn't exist | Add when auth is implemented |
| No HTTP-level analyze endpoint tests | Requires DB fixture in TestClient | Add when test DB fixture is available |
| No static analysis | No tools installed | Add `ruff`/`flake8` as dev dependency |
| No load/stress tests | Manual performance only | Add bounded concurrency tests |
| No frontend/backend integration tests | Frontend not modified | Add during M4/M5 integration |
