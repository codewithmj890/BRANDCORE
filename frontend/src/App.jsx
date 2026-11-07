
/**
 * BRANDCORE — App
 * Root component managing Clerk authentication, workspace resolution,
 * and page routing. No hardcoded workspace IDs.
 */

import React, { useEffect, useState } from 'react'
import { useAuth, useClerk } from '@clerk/react'
import { api, onBackendStatusChange } from './services/api.js'
import { AppShell } from './components/layout/AppShell'
import { Button } from './components/ui/Button'
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext'
import ApprovedFactsPage from './features/brand-governance/ApprovedFactsPage'
import EvidenceLibraryPage from './features/brand-governance/EvidenceLibraryPage'
import OverviewPage from './features/brand-governance/OverviewPage'
import ReleaseGovernancePage from './features/release-governance/ReleaseGovernancePage'
import ContentReviewPage from './features/content-review/ContentReviewPage'
import { WorkspaceOnboarding } from './components/WorkspaceOnboarding'

const PAGE_COMPONENTS = {
  overview: OverviewPage,
  facts: ApprovedFactsPage,
  content: ContentReviewPage,
  releases: ReleaseGovernancePage,
  evidence: EvidenceLibraryPage,
}

function AppWithAuth() {
  const { isSignedIn, isLoaded } = useAuth()
  const clerk = useClerk()
  const { workspaceId, workspaceName } = useWorkspace()

  const [activePage, setActivePage] = useState('overview')
  const [backendStatus, setBackendStatus] = useState('checking')

  useEffect(() => {
    let cancelled = false

    async function checkHealth() {
      try {
        await api.health()

        if (!cancelled) {
          setBackendStatus('connected')
        }
      } catch (error) {
        if (!cancelled) {
          setBackendStatus(
            error.status === 401 || error.status === 403
              ? 'connected'
              : 'offline'
          )
        }
      }
    }

    checkHealth()

    const timer = setInterval(checkHealth, 30000)

    const unsubscribe = onBackendStatusChange((status) => {
      if (!cancelled && ['connecting', 'connected', 'offline'].includes(status)) {
        setBackendStatus(status === 'connecting' ? 'checking' : status)
      }
    })

    return () => {
      cancelled = true
      clearInterval(timer)
      unsubscribe()
    }
  }, [])

  const shell = (children, name = 'BRANDCORE') => (
    <AppShell
      workspace={{
        id: workspaceId || '',
        name: workspaceName || name,
      }}
      backendStatus={backendStatus}
      header={{
        activeItem: activePage,
        onNavChange: setActivePage,
      }}
    >
      {children}
    </AppShell>
  )

  if (!isLoaded) {
    return shell(
      <section
        aria-labelledby="auth-loading-heading"
        className="rounded-lg border border-border bg-surface p-6"
      >
        <h1
          id="auth-loading-heading"
          className="text-xl font-semibold text-text-primary"
        >
          Loading authentication
        </h1>

        <p role="status" className="mt-2 text-sm text-text-secondary">
          Waiting for Clerk to establish your session. If this remains here,
          verify the local Clerk publishable key.
        </p>
      </section>,
      'Loading…'
    )
  }

  if (!isSignedIn) {
    return shell(
      <div className="flex flex-col items-center justify-center h-64">
        <p className="mb-4 text-text-primary">Sign in to continue</p>

        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={() => clerk.openSignIn()}
          >
            Sign in
          </Button>

          <Button
            variant="ghost"
            onClick={() => clerk.openSignUp()}
          >
            Sign up
          </Button>
        </div>
      </div>,
      'Sign in'
    )
  }

  if (!workspaceId) {
    return shell(<WorkspaceOnboarding />, 'Workspace Setup')
  }

  const PageComponent = PAGE_COMPONENTS[activePage]

  return shell(
    PageComponent ? <PageComponent /> : <OverviewPage />
  )
}

export default function App() {
  return (
    <WorkspaceProvider>
      <AppWithAuth />
    </WorkspaceProvider>
  )
}

