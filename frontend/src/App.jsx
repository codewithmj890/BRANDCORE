/**
 * BRANDCORE — App
 * Root component managing Clerk authentication, workspace resolution,
 * and page routing. No hardcoded workspace IDs.
 */
import React, { useState } from 'react'
import { useAuth, useClerk } from '@clerk/react'
import { AppShell } from './components/layout/AppShell'
import { Button } from './components/ui/Button'
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext'
import { useHealthMonitor } from './hooks/useHealthMonitor'
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
  const { orgId, workspaceId, workspaceName } = useWorkspace()
  const [activePage, setActivePage] = useState('overview')
  const backendStatus = useHealthMonitor()

  // Not loaded yet — show loading shell
  if (!isLoaded) {
    return (
      <AppShell
        workspace={{ id: '', name: 'Loading…' }}
        backendStatus={backendStatus}
        header={{ activeItem: activePage, onNavChange: setActivePage }}
      >
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          Signing in…
        </div>
      </AppShell>
    )
  }

  // Not signed in — show sign-in
  if (!isSignedIn) {
    return (
      <AppShell
        workspace={{ id: '', name: 'Sign in' }}
        backendStatus={backendStatus}
        header={{ activeItem: activePage, onNavChange: setActivePage }}
      >
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <p className="mb-4 text-text-primary">Sign in to continue</p>
            <div className="flex gap-3">
              <Button variant="primary" onClick={() => { if (!isSignedIn) clerk.openSignIn() }}>
                Sign in
              </Button>
              <Button variant="ghost" onClick={() => clerk.openSignUp()}>
                Sign up
              </Button>
            </div>
        </div>
      </AppShell>
    )
  }

  // Signed in but no active org — show org selection
  if (!orgId) {
    return (
      <AppShell
        workspace={{ id: '', name: 'No organization' }}
        backendStatus={backendStatus}
        header={{ activeItem: activePage, onNavChange: setActivePage }}
      >
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <p className="mb-4 text-text-primary">No active organization</p>
          <p className="text-sm text-slate-500 mb-4">
            Please select an organization from the account menu to continue.
          </p>
        </div>
      </AppShell>
    )
  }

  // Signed in but no workspace mapped — show workspace onboarding
  if (!workspaceId) {
    return (
      <AppShell
        workspace={{ id: '', name: 'Workspace Setup' }}
        backendStatus={backendStatus}
        header={{ activeItem: activePage, onNavChange: setActivePage }}
      >
        <WorkspaceOnboarding orgId={orgId} />
      </AppShell>
    )
  }

  // Authenticated with workspace — show the app
  const PageComponent = PAGE_COMPONENTS[activePage]

  return (
    <AppShell
      workspace={{ id: workspaceId, name: workspaceName || 'Workspace' }}
      backendStatus={backendStatus}
      header={{ activeItem: activePage, onNavChange: setActivePage }}
    >
      {PageComponent ? <PageComponent /> : null}
    </AppShell>
  )
}

export default function App() {
  return (
    <WorkspaceProvider>
      <AppWithAuth />
    </WorkspaceProvider>
  )
}
