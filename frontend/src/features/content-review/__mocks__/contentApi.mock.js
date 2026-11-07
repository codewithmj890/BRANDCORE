/**
 * MOCK FIXTURE — content submission (M4-01).
 *
 * Stands in for `POST /api/workspaces/:workspace_id/content`, which is still
 * PROPOSED in docs/API_CONTRACT.md §3.4 and not yet implemented by the backend.
 * Must be removed from the core workflow in M4-05 / M6 (see docs/TEAM_HANDOFF.md).
 *
 * The response and error shapes follow the contract exactly so swapping to the
 * real endpoint needs no component changes. The "hash" below is computed in the
 * browser purely to produce a realistic-looking mock value; the real hash is
 * always computed server-side (RULES.md §6).
 */

const MOCK_LATENCY_MS = 600
const versions = new Map()

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function mockSha256Hex(text) {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text)
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return '0'.repeat(64)
}

function mockId(prefix) {
  return `${prefix}_mock_${Math.random().toString(36).slice(2, 10)}`
}

/**
 * @param {string} _workspaceId
 * @param {{ title: string, body_text: string }} content
 * @param {{ simulateError?: boolean }} [options]
 */
export async function mockSubmitContent(_workspaceId, content, options = {}) {
  await delay(MOCK_LATENCY_MS)

  if (options.simulateError) {
    const err = new Error('The content service is temporarily unavailable. Please try again.')
    err.code = 'INTERNAL_ERROR'
    err.status = 500
    throw err
  }

  const result = {
    content_item_id: mockId('ci'),
    content_version_id: mockId('cv'),
    title: content.title,
    body_text: content.body_text,
    version_number: 1,
    review_status: 'PENDING',
    sha256_hash: await mockSha256Hex(content.body_text),
    created_at: new Date().toISOString(),
  }
  versions.set(result.content_item_id, [result])
  return result
}

const FINDING_TYPES = [
  ['unsupported_claim', 'Unsupported claim', 'The claim could not be matched to an approved fact.'],
  ['numeric_mismatch', 'Numeric mismatch', 'The number in the claim differs from the approved fact.'],
  ['claim_stronger_than_evidence', 'Claim stronger than evidence', 'The wording makes a stronger promise than the evidence supports.'],
  ['missing_qualifier', 'Missing qualifier', 'The claim needs a qualifier such as “up to” or “typically”.'],
  ['scope_mismatch', 'Scope mismatch', 'The claim scope does not match the approved fact scope.'],
  ['expired_offer', 'Expired offer', 'The offer referenced by this claim is no longer active.'],
  ['unapproved_terminology', 'Unapproved terminology', 'This term is not in the approved terminology list.'],
]

export async function mockAnalyzeContent(_workspaceId, contentVersionId) {
  await delay(MOCK_LATENCY_MS)
  return {
    content_version_id: contentVersionId,
    claims: [],
    findings: FINDING_TYPES.map(([finding_type, _label, explanation], index) => ({
      id: `fi_mock_${index + 1}`,
      claim_id: null,
      finding_type,
      severity: index < 2 ? 'high' : 'medium',
      explanation,
      suggested_correction: 'Review this claim against the approved facts before publishing.',
      analysis_batch_id: 'analysis_mock_1',
    })),
    summary: { finding_count: FINDING_TYPES.length },
  }
}

export async function mockGetContentVersions(_workspaceId, contentItemId) {
  await delay(250)
  return { versions: versions.get(contentItemId) || [] }
}

export async function mockSubmitReview(_workspaceId, contentVersionId, decision) {
  await delay(MOCK_LATENCY_MS)
  for (const itemVersions of versions.values()) {
    const version = itemVersions.find((item) => item.content_version_id === contentVersionId)
    if (version) version.review_status = decision.decision
  }
  return {
    review_decision_id: mockId('rd'),
    content_version_id: contentVersionId,
    decision: decision.decision,
    timestamp: new Date().toISOString(),
  }
}
