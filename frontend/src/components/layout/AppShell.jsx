/**
 * BRANDCORE — AppShell
 * Main application layout shell combining Sidebar, TopBar, and content area.
 *
 * Layout:
 * - Desktop: CSS Grid with sidebar column (232px expanded / 72px collapsed) + main content
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
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth >= 1024
  })

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

  // Detect desktop breakpoint (lg = 1024px) for hamburger behavior:
  // desktop toggles sidebar collapse, mobile/tablet opens/closes drawer
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setIsDesktop(window.innerWidth >= 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const sidebarWidth = sidebarCollapsed ? '72px' : '232px'

  const handleHamburgerClick = () => {
    if (sidebarOpen) {
      setSidebarOpen(false)
    } else if (isDesktop) {
      setSidebarCollapsed((prev) => !prev)
    } else {
      setSidebarOpen(true)
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-foreground dark:text-foreground-dark flex flex-col overflow-x-hidden">
      <TopBar
        workspace={workspace}
        backendStatus={backendStatus}
        onSidebarToggle={handleHamburgerClick}
        isDrawerOpen={sidebarOpen}
        isSidebarCollapsed={sidebarCollapsed}
        isDesktop={isDesktop}
      />

      <div
        className="flex-1 min-w-0 grid overflow-hidden"
        style={{ gridTemplateColumns: isDesktop ? `${sidebarWidth} 1fr` : '1fr' }}
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
          className="hidden lg:block"
        />

        {/* Main content — scroll container, fills remaining grid space */}
        <main
          className="flex-1 min-w-0 overflow-y-auto md:pt-6 lg:pt-8 px-6 md:px-8 lg:px-10"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
