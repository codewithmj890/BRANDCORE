# BRANDCORE — Security Checklist (T2)

**Single source of truth for security control status.**
**Rule:** Tick an item only with evidence (command output, test name, date, link). Do not copy this list into other documents — link to it.
**Tier:** T2 — all 40 items apply.
**Date:** 2026-11-06

---

## Secrets & Configuration

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 1 | Secret keys never in frontend (no `VITE_*` prefixed secrets) | VERIFIED | `rg` secret-pattern scan across `frontend`, `src`, and `backend`: no matches, 2026-11-06 |
| 2 | `.env*` and `.dev.vars` in `.gitignore`; never in public or cloud-synced folders | VERIFIED | `.gitignore` excludes `.env*` and `.dev.vars*`; `git ls-files` lists only example templates, 2026-11-06 |
| 3 | Git history scanned for secrets (gitleaks or equivalent) | NOT VERIFIED | — |
| 4 | Any exposed keys rotated | NOT VERIFIED | — |

## Authentication & Authorization

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 5 | Server-side permission check on every request | VERIFIED | Product routers use `require_workspace_access`; review/release writes use `require_workspace_permission`; `test_api_protection.py`, `test_workspace_auth.py`, and `test_releases_api.py` pass in the 246-test suite, 2026-11-06 |
| 6 | Never trust client-supplied IDs, roles or prices | VERIFIED | Release creation recomputes SHA-256 from stored content and uses the approved reviewer identity; `test_releases_api.py::TestReleaseCreation`, 2026-11-06 |
| 7 | Users cannot read each other's data (workspace-scoped queries) | VERIFIED | Workspace-scoped repository queries and cross-workspace authorization tests in `test_workspace_auth.py`, `test_forensic_regression.py`, 2026-11-06 |
| 8 | DB and file storage locked down (no public D1/R2 access) | VERIFIED | Browser accesses only relative backend API routes; product routes require Clerk workspace authorization; API protection tests pass, 2026-11-06 |
| 9 | Admin actions protected when called directly | VERIFIED | Review and release creation require `require_workspace_permission(..., require_admin=True)`; unauthorized/creator approval coverage in `test_review_api.py` and `test_releases_api.py`, 2026-11-06 |
| 10 | Login/logout/reset tested (N/A for demo; document when production auth is added) | NOT APPLICABLE (Round 2 demo) | — |

## Abuse & Cost

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 11 | Rate-limit login, signup, expensive calls (AI analysis endpoint) | PARTIAL | D1-backed analysis limit returns 429 after 10 requests per workspace per 60 seconds; Clerk login/signup limits and deployment-wide limits require hosted-environment evidence, 2026-11-07 |
| 12 | Per-workspace AI usage cap | VERIFIED | `workspace_rate_limit` migration and `test_rate_limit.py` enforce a per-workspace analysis cap; full backend suite: 248 passed, 2026-11-07 |

## Input Validation

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 13 | Server-side validation on all inputs (Pydantic) | PARTIAL | Content/fact/review/release route validation and 246 backend tests pass; several JSON routes still use explicit validation rather than shared Pydantic request models |
| 14 | Parameterized queries; no SQL concatenation | VERIFIED | Repository and route SQL use bound parameters; repository regression tests and `docs/security/BACKEND_FORENSIC_AUDIT.md`, 2026-11-06 |
| 15 | User content cannot run scripts (no dangerouslySetInnerHTML; output escaped) | VERIFIED | No `dangerouslySetInnerHTML` in `frontend/src`; React renders submitted content as text, 2026-11-06 |
| 16 | Upload type/size limits (uploads disabled in Round 2; verify restriction is enforced) | NOT APPLICABLE (Round 2) | No upload route or upload UI is exposed; document uploads are out of scope in `docs/PRD.md` §7 |

## Payments & Production

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 17 | Server-side payment verification (N/A — no payments in Round 2) | NOT APPLICABLE | — |
| 18 | Debug mode off in production; no secrets in errors or logs | VERIFIED | FastAPI docs are disabled; API converts infrastructure failures to generic client errors; POC production guard and error-path tests pass, 2026-11-06 |

## Data & Testing

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 19 | Backup and tested restore (N/A for demo; document for production) | NOT APPLICABLE (Round 2 demo) | — |
| 20 | Two-account and logged-out tests | NOT VERIFIED | — |

## Supply Chain

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 21 | Lockfile committed; `npm ci` used; dependency audit in CI | PARTIAL | `package-lock.json`, `uv.lock`, and `pylock.toml` are tracked; CI dependency-audit evidence is still required |
| 22 | AI tooling supply chain: skills, hooks, MCP servers, npx packages vetted and pinned | NOT VERIFIED | — |

## Security Headers

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 23 | Security headers: CSP, HSTS, `X-Content-Type-Options`, `frame-ancestors`, `Referrer-Policy` | NOT VERIFIED | — |
| 24 | Cookies `HttpOnly; Secure; SameSite`; CSRF protection on state-changing routes | NOT VERIFIED | — |
| 25 | CORS allowlist; no wildcard with credentials | VERIFIED | `src/app/main.py` allows only `http://localhost:5173` and no wildcard credentials; API/CORS verification completed, 2026-11-05 |

## Server-Side Request Forgery & Redirects

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 26 | SSRF and open-redirect: validate outbound URLs and redirect targets | NOT VERIFIED | — |

## Webhooks

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 27 | Webhooks: verify signatures, reject replays, idempotency keys (N/A — no webhooks in Round 2) | NOT APPLICABLE | — |

## Passwords & Sessions

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 28 | Passwords: argon2/bcrypt; no user-enumeration; session rotation on login; MFA for admins (N/A for demo) | NOT APPLICABLE (Round 2 demo) | — |

## Mass Assignment

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 29 | Mass assignment: allow-list writable fields (Pydantic request models) | VERIFIED | Route payloads explicitly select writable fields before repository calls; content/review/release validation tests pass, 2026-11-06 |

## Least Privilege

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 30 | Least privilege: scoped DB roles/tokens/IAM; no shared keys across environments | NOT VERIFIED | — |
| 31 | Separate secrets per environment; stored in host/CI secret store; never in chat or synced folders | NOT VERIFIED | — |

## Logging & Monitoring

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 32 | Security event logging and alerts; no PII in logs | NOT VERIFIED | — |

## Privacy

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 33 | PII inventory, retention, deletion path, consent, privacy policy (India DPDP Act 2023 / GDPR where applicable) | NOT VERIFIED | — |

## LLM / AI Security

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 34 | LLM features: model output and retrieved content are untrusted; prompt-injection defenses; tool allow-lists; no unrestricted code/shell; output validation (OWASP LLM Top 10) | NOT VERIFIED | — |

## Uploads

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 35 | Uploads: sniff content type, malware scan, store outside web root, signed URLs (uploads disabled in Round 2; verify restriction enforced) | NOT VERIFIED | — |

## Third-Party Scripts

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 36 | Third-party scripts minimal, with SRI and consent where required | NOT VERIFIED | — |

## Error Handling

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 37 | Errors fail closed; generic messages to clients | NOT VERIFIED | — |

## Backups

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 38 | Backups encrypted; RPO/RTO written down | NOT APPLICABLE (Round 2 demo) | — |

## Incident Response

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 39 | One-page incident runbook: who, how to rotate keys, how to take the site down | NOT VERIFIED | See `brain/security/incident-runbook.md` |

## Pre-Release

| ID | Control | Status | Evidence |
|----|---------|--------|----------|
| 40 | Pre-release run: security audit + semgrep + dependency audit + 2-account test; results saved in `brain/security/` | NOT VERIFIED | — |

---

*Last updated: 2026-11-07 — 248 backend tests pass; analysis rate limiting and baseline response headers are implemented; authenticated browser, deployment, CI, and hosted Clerk evidence remain outstanding.*
