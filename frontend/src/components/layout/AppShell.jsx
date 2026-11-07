/**
 * BRANDCORE — AppShell
 * Main application layout shell combining Sidebar, TopBar, and content area.
 *
 * Layout:
 * - Desktop: CSS Grid with sidebar column (256px expanded / 72px collapsed) + main content
 * - Mobile: sidebar hidden from grid, overlay drawer controlled by topbar hamburger
 * - Sidebar collapse preference persisted in localStorage
 * - Single source of truth for sidebar collapsed + mobile open state
 */
import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell({ workspace, backendStatus, children, header }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Persist collapse preference (avoid hydration flash by defaulting to expanded)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('brandcore-sidebar-collapsed')
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('brandcore-sidebar-collapsed', String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const sidebarWidth = sidebarCollapsed ? '72px' : '256px'

  return (
    <div className="min-h-screen bg-canvas text-foreground dark:text-foreground-dark flex flex-col overflow-x-hidden">
      <TopBar
        workspace={workspace}
        backendStatus={backendStatus}
        onSidebarToggle={() => setSidebarCollapsed((prev) => !prev)}
        onDrawerToggle={() => setSidebarOpen((prev) => !prev)}
        isDrawerOpen={sidebarOpen}
        isSidebarCollapsed={sidebarCollapsed}
      />

      <div
        className="flex-1 min-w-0 grid overflow-hidden"
        style={{ gridTemplateColumns: `${sidebarWidth} 1fr` }}
      >
        {/* Desktop sidebar — grid column, hidden on mobile */}
        <Sidebar
          activeItem={header?.activeItem || 'overview'}
          onItemClick={(id) => {
            setSidebarOpen(false)
            if (header?.onNavChange) {
              header.onNavChange(id)
            }
          }}
          isCollapsed={sidebarCollapsed}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          className="hidden md:block"
        />

        {/* Main content — scroll container, fills remaining grid space */}
        <main
          className="flex-1 min-w-0 overflow-y-auto md:pt-6 lg:pt-8"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
