/**
 * BRANDCORE API client.
 * All requests use relative /api paths and protected endpoints carry the
 * current Clerk session token.
 */
const BASE = '/api'
let statusListeners = []
let authErrorListeners = []
let tokenProvider = null

function notifyStatus(status) {
  statusListeners.forEach((callback) => callback(status))
}

function notifyAuthError(status) {
  authErrorListeners.forEach((callback) => callback(status))
}

export function onBackendStatusChange(callback) {
  statusListeners.push(callback)
  return () => {
    statusListeners = statusListeners.filter((item) => item !== callback)
  }
}

export function onAuthError(callback) {
  authErrorListeners.push(callback)
  return () => {
    authErrorListeners = authErrorListeners.filter((item) => item !== callback)
  }
}

export function setAuthTokenProvider(provider) {
  tokenProvider = provider
}

async function request(method, path, body, protectedEndpoint = true) {
  const headers = { 'Content-Type': 'application/json' }
  if (protectedEndpoint) {
    try {
      const token = tokenProvider ? await tokenProvider() : null
      if (token) headers.Authorization = 'Bearer ' + token
    } catch {
      // The backend returns 401 when no Clerk session is available.
    }
  }

  const options = { method, headers }
  if (body !== undefined) options.body = JSON.stringify(body)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)
  notifyStatus('connecting')

  try {
    const response = await fetch(`${BASE}${path}`, { ...options, signal: controller.signal })
    const data = await response.json().catch(() => null)
    if (response.status === 401 || response.status === 403) {
      notifyAuthError(response.status)
    }
    if (!response.ok) {
      const error = new Error(data?.error?.message || data?.detail || 'Request failed')
      error.code = data?.error?.code
      error.field = data?.error?.field
      error.status = response.status
      throw error
    }
    notifyStatus('connected')
    return data
  } catch (error) {
    notifyStatus(error.name === 'AbortError' ? 'offline' : 'connected')
    if (error.name === 'AbortError') {
      error.code = 'NETWORK_TIMEOUT'
      error.message = 'The request timed out. Please try again.'
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export const api = {
  health: () => request('GET', '/health', undefined, false),
  listWorkspaces: () => request('GET', '/workspaces'),
  getWorkspace: (workspaceId) => request('GET', `/workspaces/${workspaceId}`),
  getFacts: (workspaceId) => request('GET', `/workspaces/${workspaceId}/facts`),
  createFact: (workspaceId, fact) => request('POST', `/workspaces/${workspaceId}/facts`, fact),
  getEvidence: (workspaceId) => request('GET', `/workspaces/${workspaceId}/evidence`),
  submitContent: (workspaceId, content) => request('POST', `/workspaces/${workspaceId}/content`, content),
  getContentVersions: (workspaceId, contentItemId) =>
    request('GET', `/workspaces/${workspaceId}/content/${contentItemId}/versions`),
  analyzeContent: (workspaceId, contentVersionId) =>
    request('POST', `/workspaces/${workspaceId}/content/${contentVersionId}/analyze`),
  submitReview: (workspaceId, contentVersionId, decision) =>
    request('POST', `/workspaces/${workspaceId}/content/${contentVersionId}/review`, decision),
  getReleases: (workspaceId) => request('GET', `/workspaces/${workspaceId}/releases`),
  createRelease: (workspaceId, release) => request('POST', `/workspaces/${workspaceId}/releases`, release),
  getStaleImpact: (workspaceId, releaseId) =>
    request('GET', `/workspaces/${workspaceId}/releases/${releaseId}/stale-impact`),
  provisionWorkspace: (name, slug) => request('POST', '/workspaces/provision', { name, slug }),
}
