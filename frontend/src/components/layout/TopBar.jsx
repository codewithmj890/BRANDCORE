/**
 * BRANDCORE — Top Bar
 * Application header with circular hamburger menu, brand, workspace context,
 * backend status, theme toggle, and user controls. Uses Clerk for authentication.
 *
 * The circular hamburger button (44px) sits immediately before the BRANDCORE
 * logo and controls sidebar collapse on desktop and drawer open/close on mobile.
 */
import { UserButton, OrganizationSwitcher, useAuth } from '@clerk/react'
import { ThemeToggle } from '../ui/theme/ThemeToggle'

export function TopBar({ workspace, backendStatus, onSidebarToggle, isDrawerOpen, isSidebarCollapsed, isDesktop }) {
  const { isSignedIn } = useAuth()

  const statusColors = {
    connected: 'bg-success text-white',
    connecting: 'bg-warning text-white',
    offline: 'bg-destructive text-white',
  }

  const statusLabels = {
    connected: 'Backend connected',
    connecting: 'Connecting…',
    offline: 'Backend offline',
  }

  const HAMBURGER_ICON = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
    >
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )

  const CLOSE_ICON = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-6 h-6"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )

  return (
    <header
      className="sticky top-0 z-[60] border-b border-border bg-surface"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Circular hamburger menu button — controls sidebar (desktop) and drawer (mobile) */}
          <button
            type="button"
            onClick={onSidebarToggle}
            aria-label={isDesktop
              ? (isSidebarCollapsed ? 'Open navigation' : 'Close navigation')
              : (isDrawerOpen ? 'Close navigation' : 'Open navigation')}
            aria-expanded={isDesktop ? !isSidebarCollapsed : !isDrawerOpen}
            className="
              inline-flex items-center justify-center
              w-11 h-11 rounded-full
              bg-surface border border-border
              text-muted-foreground hover:text-foreground hover:bg-surface-muted
              focus-ring
              transition-colors
            "
          >
            <span className="sr-only">Toggle navigation sidebar</span>
            {isDrawerOpen ? CLOSE_ICON : HAMBURGER_ICON}
          </button>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-on-accent font-bold text-xl">
                B
              </div>
              <span className="font-bold text-lg text-foreground dark:text-foreground-dark tracking-tight">
                BRANDCORE
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-muted dark:bg-surface-muted-dark border border-border text-xs font-medium text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-success" />
              <span className="text-muted-foreground-dark">Workspace:</span>
              <span className="text-foreground dark:text-foreground-dark ml-1">{workspace?.name || '—'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${statusColors[backendStatus] || statusColors.offline}`}
            />
            <span className="text-muted-foreground-dark">
              {statusLabels[backendStatus] || statusLabels.offline}
            </span>
          </div>

          <ThemeToggle />

          {isSignedIn ? (
            <>
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-muted dark:bg-surface-muted-dark border border-border text-xs font-medium text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                <span className="text-muted-foreground-dark">Organization:</span>
                <OrganizationSwitcher
                  appearance={{
                    elements: {
                      organizationSwitcherTrigger: 'bg-transparent border-none text-foreground dark:text-foreground-dark hover:text-accent focus:ring-0 p-0',
                      organizationSwitcherMenu: 'bg-surface border border-border shadow-lg',
                      organizationSwitcherMenuItem: 'text-muted-foreground hover:text-accent dark:hover:text-accent hover:bg-accent/10 dark:hover:bg-accent/10',
                    },
                  }}
                />
              </div>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    userButtonTrigger: 'bg-surface border border-border text-foreground dark:text-foreground-dark hover:text-accent hover:bg-surface-muted focus-ring-ring focus:ring-2 rounded-md px-2 py-1',
                    userButtonMenu: 'bg-surface border border-border shadow-lg',
                    userButtonMenuItem: 'text-muted-foreground hover:text-accent dark:hover:text-accent hover:bg-accent/10 dark:hover:bg-accent/10',
                    userButtonMenuButton: 'text-muted-foreground hover:text-accent',
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
