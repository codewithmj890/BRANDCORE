/**
 * BRANDCORE — Workspace Context
 * Manages Clerk authentication state and resolves the active workspace
 * for the authenticated Clerk consumer. Provides workspaceId to pages
 * without hardcoding any workspace value.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from '@clerk/react'
import { api, onAuthError, setAuthTokenProvider } from '@/services/api'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const [workspaceId, setWorkspaceId] = useState(null)
  const [workspaceName, setWorkspaceName] = useState(null)
  const [authStatus, setAuthStatus] = useState('loading') // loading | signed-out | no-workspace | ready

  useEffect(() => {
    setAuthTokenProvider(getToken)
    return () => setAuthTokenProvider(null)
  }, [getToken])

  // Listen for backend auth errors (401/403)
  useEffect(() => {
    const unsubscribe = onAuthError((status) => {
      if (status === 401) {
        // Session expired or invalid — user needs to sign in again
        setAuthStatus('signed-out')
        setWorkspaceId(null)
        setWorkspaceName(null)
      } else if (status === 403) {
        // Access denied — organization not mapped to workspace
        setAuthStatus('no-workspace')
        setWorkspaceId(null)
        setWorkspaceName(null)
      }
    })
    return unsubscribe
  }, [])

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

    resolveWorkspace()
  }, [isLoaded, isSignedIn])

  const resolveWorkspace = useCallback(async () => {
    try {
      // Try to discover workspaces accessible to this org
      // We attempt the workspace list endpoint first
      const data = await api.listWorkspaces()
      const workspaces = data.workspaces || []

      if (workspaces.length > 0) {
        setWorkspaceId(workspaces[0].id)
        setWorkspaceName(workspaces[0].name || workspaces[0].id)
        setAuthStatus('ready')
      } else {
        setAuthStatus('no-workspace')
      }
    } catch (err) {
      if (err.status === 401) {
        setAuthStatus('signed-out')
        setWorkspaceId(null)
        setWorkspaceName(null)
      } else if (err.status === 403) {
        setAuthStatus('no-workspace')
        setWorkspaceId(null)
        setWorkspaceName(null)
      } else {
        setAuthStatus('no-workspace')
        setWorkspaceId(null)
        setWorkspaceName(null)
      }
    }
  }, [])

  const value = {
    isSignedIn,
    isLoaded,
    workspaceId,
    workspaceName,
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
