# BRANDCORE — Test Plan

**Version:** 0.1.0 · **Owner:** Mritunjay Singh (backend), Rahul Sahu (content-review), Arvind Shah (brand/release)
**Tier:** T2

---

## 1. Test Layers

| Layer | Tool | Location | Owner |
|-------|------|----------|-------|
| Backend unit (domain, services) | pytest | `backend/tests/unit/` | Mritunjay |
| Backend repository (D1 queries) | pytest + D1 test fixture | `backend/tests/repository/` | Mritunjay |
| Backend API (FastAPI TestClient) | pytest | `backend/tests/api/` | Mritunjay |
| Frontend unit (components) | Vitest | `frontend/src/**/*.test.jsx` | Rahul, Arvind |
| Frontend integration (feature flows) | Vitest + Testing Library | `frontend/src/features/**/*.test.jsx` | Rahul, Arvind |
| End-to-end | Playwright (to be added via ADR) | `e2e/` | All |

---

## 2. Coverage Target

- ≥ 80% line coverage on critical paths: D1 repositories, deterministic check services, release state transitions, review decision endpoint.
- Coverage measured with `pytest --cov` and `vitest --coverage`.
- Do not claim coverage targets met until measured.

---

## 3. Backend Test Scenarios

### 3.1 Health Endpoint

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| T-BE-01 | GET /api/health returns 200 with `{"status": "ok"}` | 200 OK | VERIFIED — health route and API protection suite |

### 3.2 Deterministic Checks (Unit)

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| T-BE-10 | Content with no matching approved fact → UNSUPPORTED_CLAIM finding | Finding returned | VERIFIED — verification engine tests |
| T-BE-11 | Content with numeric value differing from approved fact → NUMERIC_MISMATCH | Finding returned | VERIFIED — verification engine tests |
| T-BE-12 | Content with claim exceeding evidence strength → CLAIM_STRONGER_THAN_EVIDENCE | Finding returned | VERIFIED — verification engine tests |
| T-BE-13 | Content missing required qualifier → MISSING_QUALIFIER | Finding returned | VERIFIED — verification engine tests |
| T-BE-14 | Content with out-of-scope product/region → SCOPE_MISMATCH | Finding returned | VERIFIED — verification engine tests |
| T-BE-15 | Content with expired date/offer → EXPIRED_OFFER | Finding returned | VERIFIED — verification engine tests |
| T-BE-16 | Content with unapproved terminology → UNAPPROVED_TERMINOLOGY | Finding returned | VERIFIED — verification engine tests |
| T-BE-17 | Content with all approved claims → zero findings | No findings | VERIFIED — verification engine tests |

### 3.3 Content Version Immutability

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| T-BE-20 | Attempt to UPDATE a content_version row | Error / no-op | VERIFIED — repository immutability tests |
| T-BE-21 | Submitting edited content creates a new version, not a mutation | New version ID returned | VERIFIED — content API tests |
| T-BE-22 | SHA-256 hash matches content body | Hash verified | VERIFIED — release API tests |

### 3.4 Release Passport

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| T-BE-30 | Approve a content version → Release Passport created with correct fields | Passport created | VERIFIED — release API tests |
| T-BE-31 | Attempt to UPDATE a release_passport row | Error / no-op | VERIFIED — repository immutability tests |
| T-BE-32 | Change an approved fact → dependent passports receive STALE status event | STALE event recorded | VERIFIED — stale detection repository tests |
| T-BE-33 | Historical passport is not rewritten after fact change | Original passport unchanged | VERIFIED — stale detection repository tests |

### 3.5 Authorization

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| T-BE-40 | Content creator attempts to approve their own content version | 403 Forbidden | VERIFIED — review API tests |
| T-BE-41 | Request with wrong workspace_id cannot access another workspace's data | 403 or 404 | VERIFIED — workspace authorization tests |
| T-BE-42 | Client-supplied role header is not trusted | Server-side role used | VERIFIED — API protection tests |

### 3.6 Input Validation

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| T-BE-50 | Content body exceeds max length | 400 Validation Error | VERIFIED — content API validation tests |
| T-BE-51 | SQL injection attempt in content body | Parameterized query; no injection | VERIFIED — forensic regression tests |
| T-BE-52 | Malformed JSON request body | 400 Validation Error | VERIFIED — global JSON decode handler |

---

## 4. Frontend Test Scenarios

### 4.1 Content Review (Rahul)

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| T-FE-10 | Content submission form shows loading state during API call | Spinner visible | TODO |
| T-FE-11 | Content submission form shows error state on API failure | Error message visible | TODO |
| T-FE-12 | Finding card renders all 7 finding types correctly | Correct badge and text | TODO |
| T-FE-13 | Finding card uses text label alongside color badge | Text label present | TODO |
| T-FE-14 | Review decision buttons: approve / request changes / reject | All three render and are clickable | TODO |
| T-FE-15 | Empty state shown when no findings | Empty state message visible | TODO |

### 4.2 Brand Governance (Arvind)

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| T-FE-20 | Approved facts list shows loading state | Skeleton or spinner | TODO |
| T-FE-21 | Release Passport list shows VALID/STALE/REVOKED/INVALID badges | Correct badge per status | TODO |
| T-FE-22 | STALE badge includes text label, not color only | Text "STALE" visible | TODO |
| T-FE-23 | Stale impact view lists affected releases | Affected releases shown | TODO |

### 4.3 Accessibility

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| T-A11Y-01 | axe scan on content review page | 0 serious/critical violations | TODO |
| T-A11Y-02 | axe scan on brand governance page | 0 serious/critical violations | TODO |
| T-A11Y-03 | Full keyboard navigation path through primary workflow | All actions reachable by keyboard | TODO |
| T-A11Y-04 | Focus indicator visible on all interactive elements | Focus ring visible | TODO |

---

## 5. Critical-Path Gates

These must pass before any release:

1. T-BE-01 (health endpoint)
2. T-BE-10 through T-BE-17 (all 7 finding types)
3. T-BE-20 through T-BE-22 (content version immutability)
4. T-BE-30 through T-BE-33 (release passport)
5. T-BE-40 through T-BE-42 (authorization)
6. T-A11Y-01 through T-A11Y-04 (accessibility)

---

## 6. What Is Not Tested in Round 2

- Production authentication flows (no production auth)
- Multi-tenant isolation beyond demo workspace
- Payment flows (no payments)
- File upload scanning (uploads disabled)
- Performance benchmarks (measured separately with Lighthouse)
