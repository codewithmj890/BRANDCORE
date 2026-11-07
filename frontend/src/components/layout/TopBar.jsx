/**
 * BRANDCORE — Top Bar
 * Application header with brand, workspace context, backend status, theme toggle,
 * and user controls. Uses Clerk for authentication.
 */
import { UserButton, OrganizationSwitcher, useAuth } from '@clerk/react'
import { ThemeToggle } from '../ui/theme/ThemeToggle'

export function TopBar({ workspace, backendStatus, onSidebarToggle, isSidebarOpen }) {
  const { isSignedIn } = useAuth()

  return (
    <header
      className="sticky top-0 z-50 bg-surface dark:bg-surface-dark/95 backdrop-blur backdrop-blur-md border-b border-border"
    >
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-green-700 flex items-center justify-center text-white font-bold">
              B
            </div>
            <span className="font-bold text-lg text-brand-950 dark:text-brand-dark tracking-tight">
              BRANDCORE
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-muted dark:bg-surface-muted-dark border border-border text-xs font-medium text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-green-700" />
            <span className="hidden sm:inline">Workspace: </span>
            <span>{workspace?.name || '—'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs font-medium">
            <span className="w-2 h-2 rounded-full">
              {backendStatus === 'connected' ? (
                <span className="bg-green-700" />
              ) : backendStatus === 'connecting' || backendStatus === 'checking' ? (
                <span className="bg-amber-700 animate-pulse" />
              ) : (
                <span className="bg-red-700" />
              )}
            </span>
            <span className="text-text-secondary">
              {backendStatus === 'connected'
                ? 'Backend connected'
                : backendStatus === 'connecting' || backendStatus === 'checking'
                  ? 'Checking backend…'
                  : 'Backend offline'}
            </span>
          </div>

          <ThemeToggle />

          {isSignedIn ? (
            <>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonTrigger: 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-muted focus:ring-focus focus:ring-2 rounded-md px-2 py-1',
                    userButtonMenu: 'bg-surface border border-border shadow-lg',
                    userButtonMenuItem: 'text-text-secondary hover:text-green-700 dark:hover:text-green-400 hover:bg-green-50/30 dark:hover:bg-green-900/20',
                    userButtonMenuButton: 'text-text-secondary hover:text-green-700',
                  },
                }}
              />
            </>
          ) : null}
        </div>
      </div>
    </header>
  )
}
