
/**
 * Content-review data access.
 *
 * Single switch point between the mock fixture and the real API so
 * components never import mocks directly.
 *
 * Real API mode is the default. Mock mode requires explicit opt-in via
 * VITE_USE_MOCK_API=true and is intended for local development.
 */

import { api } from '../../services/api.js'
import {
  mockAnalyzeContent,
  mockGetContentVersions,
  mockSubmitContent,
  mockSubmitReview,
} from './__mocks__/contentApi.mock.js'

// Real API mode is the default. Mock only when explicitly opted in.
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

/** Limits from docs/API_CONTRACT.md §3.4. The server remains authoritative. */
export const TITLE_MAX = 200
export const BODY_MAX = 10000

export function submitContent(
  workspaceId,
  content,
  { simulateError = false } = {}
) {
  if (USE_MOCK_API) {
    return mockSubmitContent(workspaceId, content, { simulateError })
  }

  return api.submitContent(workspaceId, content)
}

export function analyzeContent(workspaceId, contentVersionId) {
  if (USE_MOCK_API) {
    return mockAnalyzeContent(workspaceId, contentVersionId)
  }

  return api.analyzeContent(workspaceId, contentVersionId)
}

export function getContentVersions(workspaceId, contentItemId) {
  if (USE_MOCK_API) {
    return mockGetContentVersions(workspaceId, contentItemId)
  }

  return api.getContentVersions(workspaceId, contentItemId)
}

export function submitReview(workspaceId, contentVersionId, decision) {
  if (USE_MOCK_API) {
    return mockSubmitReview(workspaceId, contentVersionId, decision)
  }

  return api.submitReview(workspaceId, contentVersionId, decision)
}

