/**
 * BRANDCORE — AppShell
 * Main application layout shell combining Sidebar, TopBar, and content area.
 *
 * Layout:
 * - Desktop: fixed sidebar (256px expanded / 80px collapsed) + main content with offset
 * - Mobile: hamburger toggle opens overlay drawer
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

  return (
    <div className="min-h-screen bg-canvas dark:bg-canvas-dark flex flex-col overflow-x-hidden">
      <TopBar
        workspace={workspace}
        backendStatus={backendStatus}
        onSidebarToggle={() => setSidebarOpen((prev) => !prev)}
        isSidebarOpen={sidebarOpen}
      />

      <div className="flex-1 relative min-w-0">
        {/* Desktop sidebar (fixed, always present on md+) */}
        <Sidebar
          activeItem={header?.activeItem || 'content'}
          onItemClick={(id) => {
            setSidebarOpen(false)
            if (header?.onNavChange) {
              header.onNavChange(id)
            }
          }}
          isCollapsed={sidebarCollapsed}
          onCollapseChange={setSidebarCollapsed}
        />

        {/* Main content — single scroll container, offset for sidebar width */}
        <main
          className={
            'flex-1 min-w-0 transition-all duration-300 ease-in-out overflow-y-auto pl-4 ' +
            (sidebarCollapsed ? 'md:pl-20' : 'md:pl-64') +
            ' md:p-6 lg:p-8'
          }
        >
          {children}
        </main>

        {/* Mobile hamburger toggle — sits above top bar z-index */}
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={sidebarOpen}
          className="
            fixed inset-y-0 left-0 z-50 w-14 flex items-center pl-3 pr-1 md:hidden
            text-text-secondary hover:text-text-primary hover:bg-surface/50
            focus:ring-focus focus:ring-2 rounded-r-md
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="w-5 h-5"
          >
            {sidebarOpen
              ? <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              : <>
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </>
            }
          </svg>
        </button>
      </div>
    </div>
  )
}
