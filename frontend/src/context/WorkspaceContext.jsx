/**
 * BRANDCORE — Workspace Context
 * Manages Clerk authentication state and resolves the active workspace
 * for the user's Clerk organization. Provides workspaceId to pages
 * without hardcoding any workspace value.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/react'
import { api, onAuthError } from '@/services/api'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const { isSignedIn, isLoaded, orgId, getToken } = useAuth()
  const [workspaceId, setWorkspaceId] = useState(null)
  const [workspaceName, setWorkspaceName] = useState(null)
  const [authStatus, setAuthStatus] = useState('loading') // loading | signed-out | no-org | no-workspace | ready

  // Listen for backend auth errors (401/403)
  useEffect(() => {
    const unsubscribe = onAuthError((status) => {
      if (status === 401) {
        // Backend rejected the token. Only mark signed-out if Clerk also
        // says the user is not signed in. If Clerk says signed in, the
        // session is still valid — don't force a Clerk sign-in modal.
        if (!isSignedIn) {
          setAuthStatus('signed-out')
          setWorkspaceId(null)
          setWorkspaceName(null)
        }
      } else if (status === 403) {
        setAuthStatus((prev) => (prev === 'ready' ? 'ready' : 'no-workspace'))
        if (authStatus !== 'ready') {
          setWorkspaceId(null)
          setWorkspaceName(null)
        }
      }
    }, [isSignedIn])
    return unsubscribe
  }, [isSignedIn])

  useEffect(() => {
    // Clerk still loading
    if (!isLoaded) {
      setAuthStatus('loading')
      return
    }

    // User not signed in
    if (!isSignedIn) {
      setAuthStatus('signed-out')
      setWorkspaceId(null)
      setWorkspaceName(null)
      return
    }

    // Signed in but no active organization
    if (!orgId) {
      setAuthStatus('no-org')
      setWorkspaceId(null)
      setWorkspaceName(null)
      return
    }

    // Signed in with org — resolve workspace
    resolveWorkspace(orgId)
  }, [isLoaded, isSignedIn, orgId])

  const resolveWorkspace = useCallback(async (organizationId) => {
    try {
      // Try to discover workspaces accessible to this org
      // We attempt the workspace list endpoint first
      const data = await api.listWorkspaces()
      const workspaces = data.workspaces || []

      const matching = workspaces.find((w) => w.org_id === organizationId || w.id === organizationId)
      if (matching) {
        setWorkspaceId(matching.id)
        setWorkspaceName(matching.name || matching.id)
        setAuthStatus('ready')
      } else if (workspaces.length > 0) {
        // Fall back to first available workspace
        setWorkspaceId(workspaces[0].id)
        setWorkspaceName(workspaces[0].name || workspaces[0].id)
        setAuthStatus('ready')
      } else {
        setAuthStatus('no-workspace')
      }
     } catch (err) {
       if (err.status === 401) {
         return
       } else if (err.status === 403 || err.status === 404) {
         setAuthStatus('no-workspace')
         setWorkspaceId(null)
         setWorkspaceName(null)
       }
       // Other errors: preserve existing workspace state
     }
  }, [])

  const value = {
    isSignedIn,
    isLoaded,
    orgId,
    workspaceId,
    workspaceName,
    setWorkspaceId,
    setWorkspaceName,
    authStatus,
    getToken,
  }

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider')
  }
  return context
}
