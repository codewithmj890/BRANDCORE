# BRANDCORE — Project Memory State

**Protocol:** This file is the single source of truth for current project state.
**Session start:** Read first; verify status against recent git commits.
**Updates:** After meaningful changes, when blocked, and at session end.
**Rule:** Record only facts. Never store secrets (keys, tokens, passwords, personal data). Keep compact.

---

## Project Overview

**Name:** BRANDCORE
**Objective:** Evidence-linked, explainable and change-aware brand governance.
**Tier / Mode:** T2 · Autonomy A1
**Event:** CodeNexus India 2026 · Team: SMRITUNJAY837

---

## Current State

**Milestone:** M2 → M3 complete (M2-01 through M2-07, M3-01 through M3-05 VERIFIED); Clerk authentication implemented (VERIFIED); UI redesign complete (UX-01 through UX-10 DONE)
**Status:** Data foundation, claim analysis engine, Clerk authentication, premium frontend UI, and M5-05 backend API all complete; 192/192 backend tests pass; all 5 D1 migrations applied to local state (0001–0005); frontend build success (122 modules); local Worker verified via wrangler dev --local
**Last verified:** 2026-11-05 @ UI redesign build success; 192/192 backend tests pass; M5-05 backend API routes + 48 regression tests pass; local Worker health endpoint HTTP 200

---

## Verified Architecture & Entry Points

- Frontend: React + Vite + Tailwind CSS (JavaScript/JSX only) — built and served from Worker
- Backend: Python 3.14 FastAPI on Cloudflare Python Workers — running locally via pywrangler
- Worker entry point: `src/worker.py` — `Default = entrypoint(app)` pattern
- App modules: `src/app/main.py`, `src/app/api/health.py`, `src/app/api/poc.py`, `src/app/api/dependencies.py`, `src/app/api/analyze.py`, `src/app/auth/clerk.py`, `src/app/auth/dependencies.py`
- Vendored packages: `python_modules/` (431 modules, 9.4 MB) — managed by `pywrangler sync`
- DB: Cloudflare D1 local simulation — `poc_records` table created, write/read verified
- Storage: Cloudflare R2 local simulation — put/get verified with fixed POC key
- AI: Cloudflare Workers AI — remote only; binding, model and Pydantic validation all verified PASS_REMOTE (attempt 4, 2026-11-04)
- Config: `wrangler.jsonc` — `compatibility_date: 2026-09-08`, `migrations_dir: database/migrations`
- Pyodide runtime: 3.14.2 (CPython 3.14) — confirmed by `pyodide-py==314.0.7`

---

## Completed Work (evidence-based)

- [x] M0: All 8 core docs, scaffold, 61 files — 2026-11-04
- [x] uv 0.13.7 installed (`C:\Users\smrit\.local\bin`)
- [x] `pyproject.toml` updated: uvicorn removed from runtime; workers-py, workers-runtime-sdk, pytest, httpx in dev group
- [x] `uv sync --group dev`: 30 packages installed; `uv.lock` generated — 2026-11-04
- [x] `uv run pytest backend/tests/test_health.py -v`: **3/3 passed** — 2026-11-04
- [x] `npm install` (frontend): 319 packages; `package-lock.json` generated — 2026-11-04
- [x] `npm run build`: **success** — 145.63 kB JS (47.08 kB gzip) — 2026-11-04
- [x] `pywrangler sync`: python_modules/ vendored (431 modules); pylock.toml generated — 2026-11-04
- [x] `wrangler.jsonc`: `compatibility_date` updated to `2026-09-08`; `migrations_dir` added
- [x] `src/worker.py`: `Default = entrypoint(app)` — correct Wrangler export pattern
- [x] `src/app/` created at project root (Worker-canonical location)
- [x] D1 migration `0001_poc_records.sql` applied locally — 2026-11-04
- [x] M1-01 PASS_LOCAL: `GET /api/health` → `{"status":"ok","version":"0.1.0"}` HTTP 200
- [x] M1-02 PASS_LOCAL: `GET /` → HTTP 200 `text/html` from same Worker origin
- [x] M1-03 PASS_LOCAL: `POST /api/poc/d1` → insert + read back via `env.DB`
- [x] M1-04 PASS_LOCAL: `POST /api/poc/r2` → put/get via `env.ASSETS`
- [x] M1-06 VERIFIED: attempt 4 HTTP 200 (4.262s); Pydantic PASS; `claim_type: null`, `numeric_value: 40` (int) accepted; tokens 86+64=150; raw and usage captured — evidence in `docs/evidence/M1-06/attempt-4-final/`
- [x] M2-01 VERIFIED: migration `0002_core_data_foundation.sql`; 6 tables (workspace, evidence, approved_fact, fact_evidence, policy, terminology); 11 indexes; all FK/CHECK/UNIQUE/workspace-isolation constraints verified with actual D1 execute results; rollback `0002_core_data_foundation_rollback.sql` tested; forward re-apply confirmed; ADR-009 added; ARCHITECTURE.md §5 updated; 20/20 tests pass — 2026-11-04
- [x] M2-02 VERIFIED: migration `0003_content_claims_verification.sql`; 4 tables (content_item, content_version, candidate_claim, verification_finding); 4 triggers (2 immutability, 2 claim→version match); 13 indexes; all FK/CHECK/UNIQUE/workspace-isolation and immutability constraints verified against real SQLite; rollback `0003_content_claims_verification_rollback.sql` tested; forward re-apply confirmed; Wrangler migration-tracker behavior verified (apply → d1_migrations recorded → re-apply no-op → manual rollback → tracker still records applied → tracker no-op on re-apply); local D1 state (.wrangler/state/v3) updated with 0003; 24 new schema tests added; 44/44 backend tests pass — 2026-11-05
- [x] M2-03 VERIFIED: migration `0004_release_governance.sql`; 5 tables (claim_fact_dependency, review_decision, release_passport, release_status_event, audit_event); 2 triggers (passport immutability); indexes; FK/CHECK/UNIQUE/workspace-isolation verified against real SQLite; rollback `0004_release_governance_rollback.sql` tested; forward re-apply confirmed; manual SQL execute ≠ tracker replay (tracker still records applied after rollback); local D1 state (.wrangler/state/v3) updated with 0004 — 2026-11-05
- [x] M2-04 VERIFIED: idempotent seed script `src/app/seed_demo.py`; deterministic uuid5 ids; parameterized SQL; demo data demonstrates supported/numeric/qualifier/scope/terminology cases; repeated seed creates no duplicates — 2026-11-05
- [x] M2-05 VERIFIED: WorkspaceRepository, ApprovedFactRepository, EvidenceRepository in `src/app/repositories/`; all queries workspace-scoped; parameterized SQL only; no SQL concatenation; unit tests pass — 2026-11-05
- [x] M2-06 VERIFIED: ContentItemRepository, ContentVersionRepository (immutable, no update path), CandidateClaimRepository, VerificationFindingRepository, ReviewDecisionRepository; version ordering asc/desc; latest version; batch grouping; workspace isolation — 2026-11-05
- [x] M2-07 VERIFIED: ReleasePassportRepository (immutable), ReleaseStatusEventRepository (append-only), ClaimFactDependencyRepository (fact→claims, claim→facts traversal), AuditEventRepository, StaleDetectionRepository (evidence→fact→claim→version→passport traversal; duplicate stale events prevented via `has_status_event`) — 2026-11-05
- [x] M1-08 DONE: POC route guard — `require_development_env` dependency reads `BRANDCORE_ENV` from `request.scope["env"]`; `wrangler.jsonc` `vars.BRANDCORE_ENV` set for default (development) and production; 8 guard tests in `test_poc_guard.py`; security-checklist controls 5, 9, 18 updated — 2026-11-04
- [x] Repository organization: `tools/skill-doctor.mjs`, `docs/archive/bootstrap/`, `docs/prompts/archive/`, `FILE_INVENTORY.json` deleted — 2026-11-04
- [x] `backend/tests/test_ai_schema.py`: 6 schema tests — all PASS (2026-11-04)
- [x] **M3-01 VERIFIED:** `ClaimExtractionService` in `src/app/services/ai_extraction.py`; Pydantic-validated output; `ClaimExtractionError`; fake binding; input truncation; tests cover valid/null/integer/decimal/string numeric, malformed JSON, missing fields, unavailable binding, input size limits — 14 tests pass; no remote inference — 2026-11-05
- [x] **M3-02 VERIFIED:** `VerificationEngine` in `src/app/services/verification_engine.py`; unsupported_claim and numeric_mismatch checks; Decimal exact comparison; positive/negative cases — 25 tests pass — 2026-11-05
- [x] **M3-03 VERIFIED:** claim_stronger_than_evidence and missing_qualifier checks; strength mapping; qualifier required logic — part of 25 verification engine tests — 2026-11-05
- [x] **M3-04 VERIFIED:** scope_mismatch, expired_offer (injectable clock), unapproved terminology (word-boundary) checks — part of 25 verification engine tests — 2026-11-05
- [x] **M3-05 VERIFIED:** `POST /api/workspaces/{workspace_id}/content/{content_version_id}/analyze` in `src/app/api/analyze.py`; `AnalysisService` in `src/app/services/analysis_service.py` orchestrating fetch→extract→persist→verify→persist→dependencies→audit via atomic `db.batch()`; structured claims+findings response; workspace-scoped; error handling (404/400/422/502/500); analysis history preserved; registered in `src/app/main.py` — 7 integration tests pass; full suite 130/130 pass — 2026-11-05
- [x] **Clerk Authentication (Phase 8):** `src/app/auth/clerk.py` — RS256 JWT verification via JWKS + `pow()` (Pyodide-compatible, stdlib only); `src/app/auth/dependencies.py` — workspace org → D1 workspace mapping + `require_workspace_access`/`require_workspace_permission` dependencies; `src/app/main.py` — analyze routes protected, health stays public; migration `0005_clerk_workspace_mapping.sql` created; 44 new auth tests (test_auth_clerk.py, test_workspace_auth.py, test_api_protection.py) — all pass; full suite 192/192 pass — 2026-11-05
- [x] **M5-05 VERIFIED:** Backend API endpoints for all 6 resource types — workspaces (GET), facts (GET/POST/GET/PATCH), evidence (GET/GET), content (POST/GET/GET/versions/version), review (POST/GET), releases (GET/GET/stale-impact). All routes registered in `src/app/main.py` with `require_workspace_access` auth. 48 integration tests pass (`backend/tests/test_*.py`). Local Worker verified via `wrangler dev --local --config wrangler.local.jsonc` — `GET /api/health` returns HTTP 200 `{"status":"ok","version":"0.1.0"}` — 2026-11-05
- [x] Frontend `npm run build`: success — 2026-11-05
- [x] All 17 tests pass (M1 baseline); 44/44 pass (M2); 130/130 pass (M3 full regression); 192/192 pass (with Clerk auth) — 2026-11-05
- [x] Frontend content review workflow uses authenticated content, analysis, version-history, and review APIs; frontend build and lint pass — 2026-11-05

---

## Remaining Tasks (prioritized)

1. **Milestone 4**: M4-01 through M4-06 (Content Review UI — Rahul)
2. **Milestone 5**: M5-01 through M5-06 (Brand Governance and Release UI — Arvind)
3. **Milestone 6**: M6-01 through M6-04 (Integration and Release — All)

## Blockers & Decisions Required

- **Cloudflare account IDs:** `wrangler.jsonc` still has `<D1_DATABASE_ID>` placeholder. Real ID requires user approval.
- **Frontend tooling gaps:** no Vitest (T-FE-10..15 need an ADR to add it); `npm run lint` broken — ESLint 9 needs `eslint.config.js` and rejects `--ext`.
- **Content API endpoints missing:** `POST /content`, `GET /content/:id/versions`, `POST /review` are PROPOSED only; M4-05 blocked on them. Enum casing differs between API_CONTRACT (UPPERCASE) and DB/engine (lowercase) — needs Mritunjay to confirm before M4-02 mocks.
- **Commit and push:** M2-01 commit `d0729e4` and subsequent M2/M3 work not yet pushed to `origin/develop` (remote `codewithmj890/BRANDCORE`, default branch `develop` at `80d592d`). Requires explicit user approval before committing/pushing.

---

## Tests & Checks Run

- `uv run pytest backend/tests/ -v`: **20/20 passed** (M1 baseline, pytest 9.2.0, Python 3.14.6, 2026-11-04)
- `uv run pytest backend/tests/ -v`: **44/44 passed** (M2-02 regression, pytest 9.2.0, Python 3.14.6, 2026-11-05)
- `uv run pytest backend/tests/ -v`: **130/130 passed** (full M2+M3 regression, 2026-11-05) — includes 24 M2-02 schema tests, 25 M2-03 schema tests, seed tests, 14 M3-01 extraction tests, 25 M3-02→M3-04 verification tests, 7 M3-05 analysis tests, M2-05→M2-07 repo tests
- `uv run pytest backend/tests/ -v`: **192/192 passed** (full suite with Clerk auth — test_auth_clerk.py, test_workspace_auth.py, test_api_protection.py, test_forensic_regression.py), 2026-11-05
- `npx wrangler d1 migrations apply brandcore-db --local`: **0002 ✅ / 0003 ✅ / 0004 ✅** applied to local state (.wrangler/state/v3); re-apply is a tracker no-op
- Rollback `0002_core_data_foundation_rollback.sql`: **6 commands ✅** — poc_records intact
- Rollback `0003_content_claims_verification_rollback.sql`: **4 commands ✅** — M2-01 tables + poc_records intact
- Rollback `0004_release_governance_rollback.sql`: **✅** — release governance tables dropped; M2-01/M2-02 tables intact
- Forward re-apply after rollback: **idempotent ✅** (IF NOT EXISTS; 2026-11-05)
- Manual `wrangler d1 execute --file rollback` ≠ tracker replay: tracker still records migration as applied (confirmed 2026-11-05)
- `npx wrangler dev --local --config wrangler.local.jsonc`: **Worker starts successfully** on port 8787; `GET /api/health` returns HTTP 200 `{"status":"ok","version":"0.1.0"}` — 2026-11-05
- `pytest ../backend/tests/test_*_api.py -v`: **48/48 passed** (M5-05 API integration tests: workspaces, facts, evidence, content, review, releases), 2026-11-05
- `curl GET /api/health`: **HTTP 200** `{"status":"ok","version":"0.1.0"}` (2026-11-04)
- `curl GET /`: **HTTP 200** `text/html` (2026-11-04)
- `curl POST /api/poc/d1`: **PASS_LOCAL** — insert + read back (2026-11-04)
- `curl POST /api/poc/r2`: **PASS_LOCAL** — put + get (2026-11-04)
- TypeScript scan: **0 files** (2026-11-04)
- wrangler.jsonc JSONC parse: **valid** (2026-11-04)
- Workers AI M1-06: **PASS_REMOTE** — attempt 4 HTTP 200 (4.262s); Pydantic valid; tokens 86+64=150; raw and usage captured (2026-11-04)
- POC route guard: **8/8 guard tests pass** — production 404, missing env 404, unknown env 404, development passes through (2026-11-04)
- Deployed preview: **BLOCKED** — no deployment approval; workers.dev subdomain registered

---

## ✅ GATE B — Workers AI (APPROVED 2026-11-04)

Gate B and Gate B-sub approved. `brandcore.workers.dev` registered.

**Model:** `@cf/meta/llama-3.1-8b-instruct-fp8`
**Input:** synthetic claim `"Our platform reduces customer onboarding time by up to 40 percent."`; requested JSON fields `claim_text`, `claim_type`, `numeric_value`, `unit`, `qualifier`, `scope`
**Attempts:**
1. `InferenceUpstreamError` (ref `kpjurgt1no531m46vndh55fu`) — no response.
2. JSON returned (5.17s); Pydantic caught `claim_type=None` and `numeric_value=40` int.
3. Authorized single retry: same model, input and parameters, unchanged source; HTTP 500 (3.994s); parseable JSON; Pydantic caught `numeric_value=40` int only; token usage not captured.

**Result:** M1-06 VERIFIED. Binding, model, Pydantic validation, raw capture and usage capture all confirmed.
**Evidence:** `docs/evidence/M1-06/attempt-4-final/` (`metadata.txt`, `response.headers.txt`, `response.body.txt`).
**Token usage:** prompt_tokens: 86, completion_tokens: 64, total_tokens: 150, cached_tokens: 0.

---

## NEXT ACTION

**Task:** Complete authenticated end-to-end integration and update security evidence.
**Branch:** Current working branch; backend Clerk auth and frontend API integration are implemented.

*Last updated: 2026-11-05 — Clerk authentication and frontend API integration verified; application-shell axe scan passes.*
