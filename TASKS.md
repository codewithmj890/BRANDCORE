# BRANDCORE — Task Board

**Living document.** Update after every meaningful change.
**Status values:** `TODO` · `IN PROGRESS` · `BLOCKED` · `DONE` · `VERIFIED`
**Round 2 deadline:** CodeNexus India 2026 (confirm exact date with organizers)

---

## Milestone 0 — Repository Bootstrap

| ID | Task | Owner | Status | Depends On | Acceptance Criteria |
|----|------|-------|--------|-----------|---------------------|
| M0-01 | Create repository structure and all required documents | Mritunjay | DONE | — | All 8 core docs exist; 0 TypeScript files; FILE_INVENTORY.json accurate (61 files); 3/3 tests passed 2026-11-04 |
| M0-02 | Initialize git repository and create develop branch | Mritunjay | DONE | M0-01 | main branch initialized; initial commit 32a2381; develop branch created; 74 files; GitHub push pending — 2026-11-04 |
| M0-03 | Verify Cloudflare Python Workers proof-of-concept gate | Mritunjay | VERIFIED | M0-01 | All 5 POC checks in `docs/ARCHITECTURE.md` §9 pass with evidence — 2026-11-04 |

---

## Milestone 1 — Runtime Proof of Concept (Mritunjay)

| ID | Task | Owner | Status | Depends On | Acceptance Criteria |
|----|------|-------|--------|-----------|---------------------|
| M1-01 | FastAPI health endpoint runs in pywrangler local dev | Mritunjay | VERIFIED | M0-01 | `GET /api/health` → `{"status":"ok","version":"0.1.0"}` HTTP 200 via `uv run pywrangler dev --local`; wrangler 4.157.0; 2026-11-04 |
| M1-02 | Vite production build served by Worker via Workers Static Assets | Mritunjay | VERIFIED | M1-01 | `npm run build` → 145.63 kB JS (47.08 kB gzip); `GET /` → HTTP 200 `text/html` from same Worker origin; 2026-11-04 |
| M1-03 | D1 binding: parameterized write and read in Python Worker runtime | Mritunjay | VERIFIED | M1-01 | `POST /api/poc/d1` → insert + read back via `env.DB`; migration `0001_poc_records.sql` applied locally; 2026-11-04 |
| M1-04 | R2 binding: store and retrieve a private test object | Mritunjay | VERIFIED | M1-01 | `POST /api/poc/r2` → `env.ASSETS.put/get` verified with fixed POC key; 2026-11-04 |
| M1-06 | Workers AI binding: bounded structured response validated with Pydantic | Mritunjay | **VERIFIED** | M1-01 | Gate B and Gate B-sub approved. `brandcore.workers.dev` registered. Attempts 1–3 failed (upstream error; Pydantic schema mismatch ×2). Schema-fix approval granted 2026-11-04: `claim_type: str \| None`, `numeric_value: str \| int \| float \| None`, raw+usage captured before Pydantic; 9/9 local tests passed. Attempt 4 (final authorization): HTTP 200 (4.262s); Pydantic PASS; `claim_type: null`, `numeric_value: 40` (int) accepted; `unit: "percent"`, `qualifier: "up to"`; prompt_tokens: 86, completion_tokens: 64, total_tokens: 150; raw and usage captured. Evidence: `docs/evidence/M1-06/attempt-4-final/`. 2026-11-04 |
| M1-07 | Document POC results in `docs/ARCHITECTURE.md` and `docs/TOOLING_AUDIT.md` | Mritunjay | DONE | M1-01–M1-06 | §9 updated with evidence for all checks; TOOLING_AUDIT.md updated; 2026-11-04 |
| M1-08 | POC route security guard: `require_development_env` dependency on `/api/poc/*` | Mritunjay | DONE | M1-06 | `src/app/api/dependencies.py` created; `src/app/main.py` updated; `wrangler.jsonc` `vars.BRANDCORE_ENV` set for default (disabled) and production; 11 guard tests in `test_poc_guard.py` — 20/20 total tests pass; security-checklist controls 5, 9, 18 updated; 2026-11-04 |

---

## Milestone 2 — Data Foundation (Mritunjay)

| ID | Task | Owner | Status | Depends On | Acceptance Criteria |
|----|------|-------|--------|-----------|---------------------|
| M2-01 | Write D1 migration: workspace, evidence, approved_fact, policy, terminology | Mritunjay | VERIFIED | M1-03 | Migration 0002_core_data_foundation.sql applied; 6 tables + 11 indexes; all FK, CHECK, UNIQUE and workspace-isolation constraints verified; rollback tested; forward re-apply confirmed; 20/20 tests pass — 2026-11-04 |
| M2-02 | Write D1 migration: content_item, content_version, candidate_claim, verification_finding | Mritunjay | VERIFIED | M2-01 | Migration 0003_content_claims_verification.sql applied locally; 4 tables + triggers + indexes; FK/CHECK/UNIQUE/workspace-isolation and immutability constraints verified against real SQLite; rollback tested; forward re-apply confirmed; 44/44 backend tests pass; local D1 state updated — 2026-11-05 |
| M2-03 | Write D1 migration: claim_fact_dependency, review_decision, release_passport, release_status_event, audit_event | Mritunjay | VERIFIED | M2-02 | Migration 0004_release_governance.sql applied locally; 5 tables + 2 triggers + indexes; FK/CHECK/UNIQUE/workspace-isolation and passport immutability verified against real SQLite; rollback tested; forward re-apply confirmed; local D1 state updated — 2026-11-05 |
| M2-04 | Seed demo workspace with fictional brand data | Mritunjay | VERIFIED | M2-03 | Idempotent seed script `src/app/seed_demo.py`; deterministic uuid5 ids; parameterized SQL; demo data demonstrates supported/numeric/qualifier/scope/terminology cases; repeated seed creates no duplicates — 2026-11-05 |
| M2-05 | Repository layer: workspace, fact, evidence CRUD with parameterized SQL | Mritunjay | VERIFIED | M2-01 | WorkspaceRepository, ApprovedFactRepository, EvidenceRepository in `src/app/repositories/`; all queries workspace-scoped; no SQL concatenation; unit tests pass — 2026-11-05 |
| M2-06 | Repository layer: content version, claim, finding, review decision | Mritunjay | VERIFIED | M2-02 | ContentItemRepository, ContentVersionRepository (immutable, no update path), CandidateClaimRepository, VerificationFindingRepository, ReviewDecisionRepository; version ordering asc/desc; latest version; batch grouping — 2026-11-05 |
| M2-07 | Repository layer: release passport, status events, dependency traversal | Mritunjay | VERIFIED | M2-03 | ReleasePassportRepository (immutable), ReleaseStatusEventRepository (append-only), ClaimFactDependencyRepository (fact→claims, claim→facts traversal), AuditEventRepository, StaleDetectionRepository (evidence→fact→claim→version→passport traversal; duplicate stale events prevented) — 2026-11-05 |

---

## Milestone 3 — Claim Analysis Engine (Mritunjay)

| ID | Task | Owner | Status | Depends On | Acceptance Criteria |
|----|------|-------|--------|-----------|---------------------|
| M3-01 | AI service: extract candidate claims from content version using Workers AI | Mritunjay | VERIFIED | M1-06, M2-06 | `ClaimExtractionService` in `src/app/services/ai_extraction.py`; Pydantic-validated output; fake binding tests cover valid/null/integer/decimal/string numeric, malformed JSON, missing fields, unavailable binding, input size limits — 14 tests pass; no remote inference |
| M3-02 | Deterministic check: unsupported claim and numeric mismatch | Mritunjay | VERIFIED | M2-05 | `VerificationEngine` in `src/app/services/verification_engine.py`; Decimal exact comparison; positive/negative cases for both types — 25 tests pass |
| M3-03 | Deterministic check: claim stronger than evidence, missing qualifier | Mritunjay | VERIFIED | M2-05 | Strength/qualifier mappings; positive/negative cases for both types |
| M3-04 | Deterministic check: scope mismatch, expired offer, unapproved terminology | Mritunjay | VERIFIED | M2-05 | Scope subset comparison; injectable clock for expiry; word-boundary terminology; positive/negative cases for all three types |
| M3-05 | API endpoint: POST /api/workspaces/:id/content/:vid/analyze | Mritunjay | VERIFIED | M3-01–M3-04 | `POST /api/workspaces/{workspace_id}/content/{content_version_id}/analyze` in `src/app/api/analyze.py`; structured claims+findings; workspace-scoped; error handling (404/400/422/502/500); analysis history preserved; no auto approval — integration tests pass |

---

## Milestone 3.5 — Clerk Authentication & Workspace Authorization (Mritunjay)

| ID | Task | Owner | Status | Depends On | Acceptance Criteria |
|----|------|-------|--------|-----------|---------------------|
| M3.5-01 | Clerk JWT verification module (RS256 via JWKS + pow()) | Mritunjay | VERIFIED | M3-05 | `src/app/auth/clerk.py`; `ClerkJwksClient` with bounded TTL cache; `verify_clerk_token()` validates iss/exp/nbf/azp/sub; RS256 verification via stdlib `pow()` + SHA-256; `ClerkUser` with org_id/org_role/org_permissions; `get_current_clerk_user` FastAPI dependency reads `CLERK_ISSUER_URL` from `request.scope["env"]`; 15 tests pass |
| M3.5-02 | Workspace authorization dependencies | Mritunjay | VERIFIED | M3.5-01, M2-01 | `src/app/auth/dependencies.py`; `WorkspaceOrgMappingRepository` (parameterized SQL); `require_workspace_access()` enforces org → workspace mapping match (403 cross-org, 404 missing workspace); `require_workspace_permission()` enforces org:admin for admin actions; migration `0005_clerk_workspace_mapping.sql` with UNIQUE constraints; 20 tests pass |
| M3.5-03 | API route protection | Mritunjay | VERIFIED | M3.5-02 | `src/app/main.py` — analyze router protected with `require_workspace_access`; health endpoint remains public; POC routes guarded by `require_development_env`; 9 API protection tests pass |
| M3.5-04 | Frontend Clerk integration | Mritunjay | VERIFIED | M0-01 | `ClerkProvider` wraps app; UserButton/OrganizationSwitcher components; API client attaches `Authorization: Bearer <token>` via `getToken({template:'brandcore-api'})`; relative `/api/*` paths only; `npm run build` success |

---

## Milestone 4 — Content Review UI (Rahul)

| ID | Task | Owner | Status | Depends On | Acceptance Criteria |
|----|------|-------|--------|-----------|---------------------|
| M4-01 | Content submission form (uses mock API until M3-05 is available) | Rahul | DONE | M0-01 | Form submits content; shows loading/error/success states |
| M4-02 | Findings display: finding card component with all 7 finding types | Rahul | DONE | M4-01 | Each finding type renders correctly; color + text label; no dangerouslySetInnerHTML |
| M4-03 | Review decision UI: approve / request changes / reject | Rahul | DONE | M4-02 | Decision recorded; confirmation shown; no auto-approval path |
| M4-04 | Content version history list | Rahul | DONE | M4-01 | Versions listed with status badges; immutability clear in UI |
| M4-05 | Replace mock API with real endpoints (M3-05, M2-06) | Rahul | DONE | M3-05, M2-06 | Real authenticated API client now handles submission, analysis, version history, and review; mock adapter removed from the core workflow; frontend build and lint pass |
| M4-06 | Accessibility pass: keyboard nav, focus order, axe scan | Rahul | IN PROGRESS | M4-05 | Semantic headings, labels, focus management and keyboard-safe controls are implemented; application-shell axe scan passes with 0 serious/critical violations; authenticated workflow verification remains blocked by Clerk auth configuration |

---

## Milestone 5 — Brand Governance and Release UI (Arvind)

| ID | Task | Owner | Status | Depends On | Acceptance Criteria |
|----|------|-------|--------|-----------|---------------------|
| M5-01 | Approved facts list and create/edit form (uses mock API) | Arvind | DONE | M0-01 | Facts listed with scope, qualifier, evidence ref; form validates |
| M5-02 | Evidence reference management UI | Arvind | DONE | M5-01 | Evidence records listed; linked to facts |
| M5-03 | Release Passport list with status badges | Arvind | DONE | M0-01 | Passports listed; VALID/STALE/REVOKED/INVALID badges shown |
| M5-04 | Stale impact view: which releases are affected by a fact change | Arvind | DONE | M5-03 | Stale releases listed with reason; revalidation action available |
| M5-05 | Replace mock API with real endpoints (M2-05, M2-07) | Arvind | **VERIFIED** | M2-05, M2-07 | 6 API modules created and registered (workspaces, facts, evidence, content, review, releases); 48 integration tests pass; local Worker verified via wrangler dev --local — 2026-11-05 |
| M5-06 | Accessibility pass: keyboard nav, focus order, axe scan | Arvind | IN PROGRESS | M5-05 | Application shell axe scan passes with 0 serious/critical violations; authenticated governance-page keyboard verification remains blocked by Clerk test configuration |

---

## UI Redesign — Premium Frontend (Mritunjay)

| ID | Task | Owner | Status | Depends On | Acceptance Criteria |
|----|------|-------|--------|-----------|---------------------|
| UX-01 | Tailwind CSS design tokens (light + dark, class-based) | Mritunjay | DONE | M0-01 | `tailwind.config.js` with primitive/semantic/component tokens; `darkMode: 'class'` |
| UX-02 | ThemeProvider with localStorage persistence | Mritunjay | DONE | UX-01 | Dark/light toggle persists preference; `ThemeToggle` accessible button |
| UX-03 | Shared UI component library | Mritunjay | DONE | UX-02 | Button, StatusBadge, Card, EmptyState, Skeleton, ErrorState, DataTable, FormField; barrel export `@/components/ui` |
| UX-04 | AppShell layout (Sidebar, TopBar, Breadcrumbs) | Mritunjay | DONE | UX-03 | Collapsible sidebar; workspace context; backend status indicator; mobile nav |
| UX-05 | Approved Facts page (list + create/edit form) | Mritunjay | DONE | UX-04 | Facts table with search/filter; CRUD form; summary cards |
| UX-06 | Evidence Library page | Mritunjay | DONE | UX-04 | Evidence list with type filters; linked facts display |
| UX-07 | Release Governance page (list + passport + stale impact) | Mritunjay | DONE | UX-04 | Release list with VALID/STALE/REVOKED badges; passport drawer; stale impact |
| UX-08 | Content Review page (submission + findings + review decision) | Mritunjay | DONE | UX-04 | Content submission; findings display; review decision UI |
| UX-09 | API client with backend status tracking | Mritunjay | DONE | UX-04 | `api.js` with relative `/api/*` paths; Clerk token auth; `onBackendStatusChange` |
| UX-10 | Production build verified | Mritunjay | DONE | UX-01–UX-09 | `npm run build` success; 122 modules transformed; no errors |

---

## Milestone 6 — Integration and Release (All)

| ID | Task | Owner | Status | Depends On | Acceptance Criteria |
|----|------|-------|--------|-----------|---------------------|
| M6-01 | End-to-end workflow test: submit → analyze → review → passport → stale | Mritunjay | IN PROGRESS | M3-05, M4-05, M5-05 | Release passport creation is now human-review-gated, server-hashed, immutable, and covered by `test_releases_api.py`; full AI-backed stale workflow still needs a configured authenticated environment |
| M6-02 | Security checklist review: update evidence for all verified controls | Mritunjay | IN PROGRESS | M6-01 | Verified controls include D1-backed per-workspace AI limits and baseline response headers; deployment/CI-only controls remain explicitly unverified |

---

## Round 3 Improvements

1. **Real workspace onboarding** — multi-tenant setup with proper authentication, organization administration and production security review.
2. **Richer evidence management** — structured evidence documents, version diffs, evidence expiry tracking and evidence coverage reports.
3. **Audit and compliance reporting** — exportable audit trails, policy coverage reports, revalidation history and a brand operations dashboard.
