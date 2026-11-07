/**
 * BRANDCORE — Mock Fixtures (DEMO MODE ONLY)
 *
 * These fixtures are used when backend endpoints are not yet available.
 * They are clearly labeled as demo data and must NOT be presented as live data.
 *
 * Source: docs/PRD.md §4 — seeded fictional demo brand workspace
 */

export const DEMO_WORKSPACE = {
  id: 'ws_demo',
  name: 'Demo Brand',
  demo: true,
  created_at: '2026-10-01T00:00:00Z',
}

export const DEMO_FACTS = [
  {
    id: 'fact_001',
    workspace_id: 'ws_demo',
    text: 'Our product reduces energy consumption by up to 30% compared to the industry average.',
    scope: { product: 'EcoWidget Pro', region: 'IN', valid_until: '2027-06-30' },
    qualifier: 'up to',
    evidence_id: 'ev_001',
    version: 1,
    status: 'active',
    created_at: '2026-10-15T10:00:00Z',
    updated_at: '2026-10-15T10:00:00Z',
    evidence_count: 1,
  },
  {
    id: 'fact_002',
    workspace_id: 'ws_demo',
    text: 'Customer onboarding time is reduced by 40% with our platform.',
    scope: { product: 'EcoWidget Pro', region: 'GLOBAL', valid_until: null },
    qualifier: null,
    evidence_id: 'ev_002',
    version: 1,
    status: 'active',
    created_at: '2026-10-10T14:30:00Z',
    updated_at: '2026-10-10T14:30:00Z',
    evidence_count: 1,
  },
  {
    id: 'fact_003',
    workspace_id: 'ws_demo',
    text: 'Enterprise customers see 99.9% uptime SLA compliance.',
    scope: { product: 'EcoWidget Pro', region: 'US', valid_until: '2026-12-31' },
    qualifier: null,
    evidence_id: 'ev_003',
    version: 2,
    status: 'active',
    created_at: '2026-09-20T09:00:00Z',
    updated_at: '2026-10-05T11:00:00Z',
    evidence_count: 2,
  },
  {
    id: 'fact_004',
    workspace_id: 'ws_demo',
    text: 'Our solution supports up to 10,000 concurrent users per cluster.',
    scope: { product: 'EcoWidget Pro', region: 'GLOBAL', valid_until: null },
    qualifier: null,
    evidence_id: null,
    version: 1,
    status: 'active',
    created_at: '2026-09-05T16:45:00Z',
    updated_at: '2026-09-05T16:45:00Z',
    evidence_count: 0,
  },
]

export const DEMO_EVIDENCE = [
  {
    id: 'ev_001',
    workspace_id: 'ws_demo',
    title: 'Energy Efficiency Study — Q3 2026',
    source_type: 'internal_study',
    summary: 'Third-party verified energy consumption measurements across 50 deployments.',
    source_url: 'https://internal.brandcore.example/studies/energy-q3-2026',
    version: 1,
    status: 'active',
    created_at: '2026-10-01T00:00:00Z',
    linked_fact_ids: ['fact_001'],
  },
  {
    id: 'ev_002',
    workspace_id: 'ws_demo',
    title: 'Customer Onboarding Benchmark Report',
    source_type: 'third_party_report',
    summary: 'Independent benchmark comparing onboarding times before and after platform adoption.',
    source_url: 'https://internal.brandcore.example/reports/onboarding-2026',
    version: 1,
    status: 'active',
    created_at: '2026-09-28T00:00:00Z',
    linked_fact_ids: ['fact_002'],
  },
  {
    id: 'ev_003',
    workspace_id: 'ws_demo',
    title: 'Uptime SLA Monitoring Data',
    source_type: 'internal_monitoring',
    summary: 'Continuous uptime monitoring for enterprise tier customers over 12 months.',
    source_url: 'https://internal.brandcore.example/monitoring/sla-2026',
    version: 2,
    status: 'active',
    created_at: '2026-09-20T00:00:00Z',
    linked_fact_ids: ['fact_003'],
  },
]

export const DEMO_RELEASES = [
  {
    id: 'rp_001',
    workspace_id: 'ws_demo',
    content_version_id: 'cv_001',
    content_sha256: 'a1b2c3d4e5f6...',
    status: 'VALID',
    approved_at: '2026-10-20T13:00:00Z',
    approved_by: 'brand_admin',
    policy_version_id: 'pol_001',
    fact_evidence_versions: ['fact_001:v1', 'ev_001:v1'],
  },
  {
    id: 'rp_002',
    workspace_id: 'ws_demo',
    content_version_id: 'cv_002',
    content_sha256: 'f6e5d4c3b2a1...',
    status: 'STALE',
    approved_at: '2026-10-15T10:00:00Z',
    approved_by: 'brand_admin',
    policy_version_id: 'pol_001',
    fact_evidence_versions: ['fact_003:v1', 'ev_003:v1'],
  },
  {
    id: 'rp_003',
    workspace_id: 'ws_demo',
    content_version_id: 'cv_003',
    content_sha256: '998877665544...',
    status: 'REVOKED',
    approved_at: '2026-10-05T09:00:00Z',
    approved_by: 'reviewer_1',
    policy_version_id: 'pol_001',
    fact_evidence_versions: ['fact_004:v1'],
  },
]

export const DEMO_STALE_IMPACT = {
  release_id: 'rp_002',
  status: 'STALE',
  stale_reason: 'Approved fact fact_003 version 1 was superseded by version 2',
  stale_since: '2026-10-05T11:00:00Z',
  revalidation_required: true,
  changed_facts: [
    {
      fact_id: 'fact_003',
      old_version: 1,
      new_version: 2,
      change: 'valid_until extended from 2026-12-31 to 2027-03-31',
    },
  ],
}

export const DEMO_CONTENT_VERSIONS = [
  {
    id: 'cv_001',
    version_number: 1,
    sha256_hash: 'a1b2c3d4e5f6...',
    created_at: '2026-10-20T12:00:00Z',
    review_status: 'APPROVED',
    title: 'Q4 Product Launch Announcement',
  },
  {
    id: 'cv_002',
    version_number: 1,
    sha256_hash: 'f6e5d4c3b2a1...',
    created_at: '2026-10-15T09:00:00Z',
    review_status: 'PENDING',
    title: 'Enterprise Uptime SLA Page',
  },
  {
    id: 'cv_003',
    version_number: 1,
    sha256_hash: '998877665544...',
    created_at: '2026-10-05T08:00:00Z',
    review_status: 'REJECTED',
    title: 'Concurrent Users Scaling Guide',
  },
]

export const DEMO_FINDINGS = [
  {
    id: 'fi_001',
    claim_id: 'cl_001',
    finding_type: 'NUMERIC_MISMATCH',
    severity: 'critical',
    reason: 'Claim states 40% but approved fact states up to 30%',
    approved_fact_id: 'fact_001',
    evidence_id: 'ev_001',
    suggestion: "Change '40%' to 'up to 30%' to match the approved fact",
  },
  {
    id: 'fi_002',
    claim_id: 'cl_002',
    finding_type: 'MISSING_QUALIFIER',
    severity: 'medium',
    reason: 'Claim omits required qualifier "up to" from approved fact',
    approved_fact_id: 'fact_001',
    evidence_id: null,
    suggestion: 'Add qualifier "up to" before the percentage value',
  },
  {
    id: 'fi_003',
    claim_id: 'cl_003',
    finding_type: 'UNSUPPORTED_CLAIM',
    severity: 'high',
    reason: 'No approved evidence reference found for this claim',
    approved_fact_id: null,
    evidence_id: null,
    suggestion: 'Add supporting evidence or remove unsupported claim',
  },
]

export const DEMO_TERMINOLOGY = [
  { term: 'EcoWidget', status: 'approved', notes: 'Preferred product name' },
  { term: 'energy consumption', status: 'approved', notes: 'Use full term, not "energy use"' },
  { term: ' customers', status: 'denied', notes: 'Use "clients" instead' },
]

export const DEMO_POLICIES = [
  { id: 'pol_001', name: 'Brand Voice Policy', version: 1, status: 'active', created_at: '2026-09-01T00:00:00Z' },
]

export const DEMO_AUDIT_EVENTS = [
  { id: 'aud_001', actor_id: 'user_1', action: 'fact_created', target_type: 'approved_fact', target_id: 'fact_001', timestamp: '2026-10-15T10:00:00Z' },
  { id: 'aud_002', actor_id: 'user_2', action: 'content_approved', target_type: 'release_passport', target_id: 'rp_001', timestamp: '2026-10-20T13:00:00Z' },
  { id: 'aud_003', actor_id: 'user_1', action: 'fact_updated', target_type: 'approved_fact', target_id: 'fact_003', timestamp: '2026-10-05T11:00:00Z' },
]
