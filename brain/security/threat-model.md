# BRANDCORE — Threat Model

**Version:** 0.1.0 · **Date:** 2026-11-04 · **Owner:** Mritunjay Singh
**Method:** STRIDE · **Tier:** T2
**Status:** Draft — all controls NOT VERIFIED until evidence exists

---

## 1. System Overview

BRANDCORE is a brand governance workspace. One Cloudflare Worker serves a React frontend (Workers Static Assets) and a FastAPI backend (`/api/*`). The backend holds all binding access: D1 (relational data), R2 (private object storage), Workers AI (claim extraction). The browser has no direct binding access.

---

## 2. Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser ↔ Worker | Public internet. All requests are untrusted. |
| Worker ↔ D1 | Internal Cloudflare binding. Trusted runtime, but SQL must be parameterized. |
| Worker ↔ R2 | Internal Cloudflare binding. Objects must be access-controlled. |
| Worker ↔ Workers AI | Internal Cloudflare binding. Model output is untrusted; validate with Pydantic. |
| Demo role switching | Not a real authentication boundary. Treat all demo roles as untrusted. |

---

## 3. Assets to Protect

| Asset | Sensitivity | Location |
|-------|-------------|----------|
| Approved facts and evidence | High | D1 |
| Content versions and hashes | High | D1 |
| Release Passports | High | D1 |
| Audit events | High | D1 |
| Private evidence files | High | R2 |
| Workers AI binding | Medium | Worker runtime |
| Wrangler secrets / API keys | Critical | `.dev.vars` / Cloudflare secrets (never in code) |

---

## 4. STRIDE Threat Analysis

### 4.1 Spoofing

| ID | Threat | Component | Mitigation | Status |
|----|--------|-----------|------------|--------|
| S1 | Demo role spoofing — client sends a different role header | API routes | Server-side role validation; never trust client-supplied role | NOT VERIFIED |
| S2 | Forged content hash — client claims a different SHA-256 | Release Passport creation | Hash computed server-side from stored content version body | NOT VERIFIED |
| S3 | Replay of old approval decision | Review decision endpoint | Content version ID and hash bound to decision; timestamp recorded | NOT VERIFIED |

### 4.2 Tampering

| ID | Threat | Component | Mitigation | Status |
|----|--------|-----------|------------|--------|
| T1 | SQL injection via content submission | D1 repositories | Parameterized statements only; never concatenate untrusted values | VERIFIED — repository regression suite, 2026-11-06 |
| T2 | Mutation of immutable content version | Content version table | No UPDATE path on content_version rows; append-only | VERIFIED — migration triggers and forensic regression tests, 2026-11-06 |
| T3 | Mutation of Release Passport | Release Passport table | No UPDATE path on release_passport rows; status via event table | VERIFIED — migration triggers and `test_releases_api.py`, 2026-11-06 |
| T4 | Prompt injection via submitted content | Workers AI call | Content is passed as data, not as system instructions; output validated with Pydantic | VERIFIED — `ClaimExtractionService` bounded prompt/output validation tests, 2026-11-06 |
| T5 | Unsafe HTML rendering of findings | React frontend | Use text content, not dangerouslySetInnerHTML; sanitize if HTML is ever needed | VERIFIED — no `dangerouslySetInnerHTML` in `frontend/src`, 2026-11-06 |

### 4.3 Repudiation

| ID | Threat | Component | Mitigation | Status |
|----|--------|-----------|------------|--------|
| R1 | Reviewer denies making an approval decision | Review decision | Audit event recorded server-side with timestamp and reviewer identity | VERIFIED — review persistence and release audit tests, 2026-11-06 |
| R2 | Fact change not traceable | Approved fact versioning | New fact version created on change; old version preserved; audit event recorded | VERIFIED — fact versioning and stale-detection regression tests, 2026-11-06 |

### 4.4 Information Disclosure

| ID | Threat | Component | Mitigation | Status |
|----|--------|-----------|------------|--------|
| I1 | Private R2 objects accessible without authorization | R2 access | Backend-only access; no public R2 URLs; signed URLs if needed | NOT VERIFIED |
| I2 | Debug traces or stack traces exposed to client | Error handling | Generic error messages to client; detailed logs server-side only | VERIFIED — production docs disabled and generic error responses tested, 2026-11-06 |
| I3 | Secrets in environment variables exposed via VITE_ prefix | Frontend build | No secrets in VITE_ prefixed variables; secrets in `.dev.vars` / Cloudflare secrets only | VERIFIED — secret-pattern scan, 2026-11-06 |
| I4 | Cross-workspace data leakage | All repository queries | Every query scoped by workspace_id; never trust client-supplied workspace_id without server-side validation | VERIFIED — workspace authorization and forensic regression tests, 2026-11-06 |

### 4.5 Denial of Service

| ID | Threat | Component | Mitigation | Status |
|----|--------|-----------|------------|--------|
| D1 | Large content submission exhausting Workers AI credits | Content submission endpoint | Server-side size limit on content body; per-workspace AI call cap | VERIFIED — 10,000-character body limit and D1-backed 10 analyses per workspace per 60-second window are enforced and tested, 2026-11-07 |
| D2 | Excessive API calls from browser | All API routes | Rate limiting on expensive endpoints (AI calls, bulk queries) | PARTIAL — analysis calls are rate-limited; general API and hosted login limits remain deployment concerns |

### 4.6 Elevation of Privilege

| ID | Threat | Component | Mitigation | Status |
|----|--------|-----------|------------|--------|
| E1 | Content creator approving their own content | Review decision endpoint | Server-side check: creator cannot be the approver for the same content version | VERIFIED — review API authorization tests, 2026-11-06 |
| E2 | Mass assignment — client sets protected fields | Pydantic models | Explicit allow-list of writable fields in Pydantic request models | PARTIAL — routes explicitly allow-list fields; shared Pydantic request models remain to be added |
| E3 | AI output used to directly change release status | Services layer | AI output is advisory only; release state transitions are deterministic and require human decision | VERIFIED — release creation requires an approved human review, 2026-11-06 |

---

## 5. Out-of-Scope Threats (Round 2)

- Production authentication attacks (no production auth in Round 2)
- Multi-tenant data isolation beyond demo workspace scoping
- DDoS at network layer (Cloudflare platform handles this)
- Supply chain attacks on npm/Python packages (tracked in security checklist)

---

## 6. Residual Risks

| Risk | Reason Not Mitigated | Owner | Review Date |
|------|---------------------|-------|-------------|
| Demo role switching is not real auth | Out of scope for Round 2 | Mritunjay | Before any real user access |
| No production authentication | Out of scope for Round 2 | Mritunjay | Before Round 3 |
| Workers AI Beta stability | Platform dependency | Mritunjay | At proof-of-concept gate |

---

## 7. Review Cadence

Review this threat model before each release and after any architecture change. Update status fields with evidence (test name, command, date) when controls are verified.
