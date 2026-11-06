/**
 * BRANDCORE — API Client
 * All requests use relative /api paths — no hardcoded origins.
 *
 * Two request types:
 *   - publicRequest: no Authorization header (for /api/health)
 *   - protectedRequest: Clerk session token as Bearer (all other endpoints)
 *
 * Uses Clerk's default session token (no custom template). Clerk returns 404
 * when a requested JWT template doesn't exist, so we never request one.
 *
 * Backend status tracking for honest connectivity display.
 * Auth errors (401/403) are surfaced to the caller — never silently
 * replaced with demo data.
 *
 * Response parsing is defensive: response.json() is never called on an
 * unknown body. Non-JSON error bodies (plain text, HTML, empty) are
 * handled gracefully and surfaced as structured errors.
 */
import { getToken } from '@clerk/react'

const BASE = '/api'

let statusListeners = []
let authErrorListeners = []

function notifyStatus(status) {
  statusListeners.forEach((cb) => cb(status))
}

function notifyAuthError(status) {
  authErrorListeners.forEach((cb) => cb(status))
}

export function onBackendStatusChange(callback) {
  statusListeners.push(callback)
  return () => {
    statusListeners = statusListeners.filter((cb) => cb !== callback)
  }
}

export function onAuthError(callback) {
  authErrorListeners.push(callback)
  return () => {
    authErrorListeners = authErrorListeners.filter((cb) => cb !== callback)
  }
}

// Safely parse a response body. Tries JSON first, falls back to text,
// then returns null if the body is empty or unreadable. Never throws.
async function safeParseBody(res) {
  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')

  if (isJson) {
    try {
      return await res.json()
    } catch {
      // Malformed JSON — fall through to text
    }
  }

  try {
    const text = await res.text()
    if (!text || text.trim() === '') {
      return null
    }
    // Return raw text wrapped so callers can surface it
    return { _rawText: text, _rawStatus: res.status }
  } catch {
    return null
  }
}

// Build a structured error from a response, handling JSON and non-JSON bodies.
function buildError(res, parsed) {
  const status = res.status
  let message = 'Request failed'
  let code = null

  if (parsed && typeof parsed === 'object') {
    message = parsed?.error?.message ?? parsed?.detail ?? parsed?._rawText ?? message
    code = parsed?.error?.code ?? parsed?.code ?? null
  } else if (typeof parsed === 'string') {
    message = parsed
  }

  // Map common status codes to sensible defaults
  if (!message || message === 'Request failed') {
    switch (status) {
      case 400: message = 'Bad request'; break
      case 401: message = 'Unauthorized'; break
      case 403: message = 'Forbidden'; break
      case 404: message = 'Not found'; break
      case 409: message = 'Conflict'; break
      case 422: message = 'Validation error'; break
      case 500: message = 'Internal server error'; break
      default: message = `Request failed (${status})`
    }
  }

  const err = new Error(message)
  err.status = status
  err.code = code
  return err
}

// Public requests — no Clerk token
async function publicHeaders() {
  return { 'Content-Type': 'application/json' }
}

// Protected requests — Clerk default session token
async function protectedHeaders() {
  const headers = { 'Content-Type': 'application/json' }
  let token = null
  try {
    token = await getToken()
  } catch {
    // Clerk session not available — proceed without Authorization header
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

async function publicRequest(method, path, body) {
  const options = {
    method,
    headers: await publicHeaders(),
  }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  notifyStatus('connecting')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(`${BASE}${path}`, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)

    notifyStatus('connected')

    const parsed = await safeParseBody(res)
    if (!res.ok) {
      throw buildError(res, parsed)
    }
    return parsed
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      notifyStatus('offline')
    } else if (err.status !== 401 && err.status !== 403) {
      notifyStatus('connected')
    }
    throw err
  }
}

async function protectedRequest(method, path, body) {
  const options = {
    method,
    headers: await protectedHeaders(),
  }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  notifyStatus('connecting')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const res = await fetch(`${BASE}${path}`, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)

    notifyStatus('connected')

    const parsed = await safeParseBody(res)

    if (res.status === 401) {
      notifyAuthError(401)
      throw buildError(res, parsed)
    }

    if (res.status === 403) {
      notifyAuthError(403)
      throw buildError(res, parsed)
    }

    if (!res.ok) {
      throw buildError(res, parsed)
    }

    return parsed
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      notifyStatus('offline')
    } else if (err.status !== 401 && err.status !== 403) {
      notifyStatus('connected')
    }
    throw err
  }
}

export const api = {
  health: () => publicRequest('GET', '/health'),

  listWorkspaces: () => protectedRequest('GET', '/workspaces'),

  getWorkspace: (workspaceId) =>
    protectedRequest('GET', `/workspaces/${workspaceId}`),

  getFacts: (workspaceId) =>
    protectedRequest('GET', `/workspaces/${workspaceId}/facts`),

  createFact: (workspaceId, fact) =>
    protectedRequest('POST', `/workspaces/${workspaceId}/facts`, fact),

  submitContent: (workspaceId, content) =>
    protectedRequest('POST', `/workspaces/${workspaceId}/content`, content),

  getContentVersions: (workspaceId, contentItemId) =>
    protectedRequest('GET', `/workspaces/${workspaceId}/content/${contentItemId}/versions`),

  analyzeContent: (workspaceId, contentVersionId) =>
    protectedRequest('POST', `/workspaces/${workspaceId}/content/${contentVersionId}/analyze`),

  submitReview: (workspaceId, contentVersionId, decision) =>
    protectedRequest('POST', `/workspaces/${workspaceId}/content/${contentVersionId}/review`, decision),

  getReleases: (workspaceId) =>
    protectedRequest('GET', `/workspaces/${workspaceId}/releases`),

  getStaleImpact: (workspaceId, releaseId) =>
    protectedRequest('GET', `/workspaces/${workspaceId}/releases/${releaseId}/stale-impact`),

  provisionWorkspace: (name, slug) =>
    protectedRequest('POST', '/workspaces/provision', { name, slug }),
}
