/**
 * BRANDCORE — Sidebar Navigation
 * Navigation sidebar rendered as a CSS Grid column on desktop,
 * and as an overlay drawer on mobile controlled by the topbar hamburger.
 *
 * Desktop:
 * - Expanded: full width with icons + text labels
 * - Collapsed: compact icon-only navigation with accessible tooltips
 * Mobile:
 * - Hidden from grid; overlay drawer controlled by topbar hamburger
 * - Escape-to-close, backdrop click to close, body scroll lock
 */
import { useEffect, useCallback } from 'react'

const COLLAPSED_WIDTH = 'w-20'   // 72px — icon only
const EXPANDED_WIDTH = 'w-64'    // 256px — icons + labels

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'O' },
  { id: 'facts', label: 'Approved Facts', icon: 'F' },
  { id: 'content', label: 'Content Review', icon: 'C' },
  { id: 'releases', label: 'Releases', icon: 'R' },
  { id: 'evidence', label: 'Evidence Library', icon: 'E' },
]

export function Sidebar({ activeItem, onItemClick, isCollapsed, isOpen, onClose, className }) {
  const handleCloseMobile = useCallback(() => {
    onClose?.()
  }, [onClose])

  // Close mobile drawer on escape
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') handleCloseMobile()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleCloseMobile])

  const sidebarClasses = [
    'flex flex-col transition-all duration-300 ease-in-out',
    'border-r border-border bg-surface',
    isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
    'min-w-0',
  ].join(' ')

  return (
    <>
      {/* Desktop sidebar — CSS Grid column */}
      <aside
        className={['hidden md:flex', sidebarClasses, className || ''].join(' ').trim()}
        id="brandcore-sidebar"
        aria-label="Main navigation"
      >
        <div className="flex-1 overflow-y-auto">
          <nav className="px-3 py-5">
            {NAV_ITEMS.map((item) => {
              const isActive = activeItem === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onItemClick(item.id)
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={isCollapsed ? item.label : undefined}
                  className={
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ' +
                    (isActive
                      ? 'bg-accent/10 dark:bg-accent/10 border border-accent/20 text-accent dark:text-accent'
                      : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground')
                  }
                >
                  <span
                    className={
                      'w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs transition-all ' +
                      (isActive
                        ? 'bg-accent text-on-accent'
                        : 'bg-surface-muted text-muted-foreground border border-border')
                    }
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && <span className="text-foreground dark:text-foreground-dark">{item.label}</span>}
                </button>
              )
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={handleCloseMobile}
            aria-hidden="true"
          />
          <aside
            id="brandcore-sidebar-mobile"
            className={
              'fixed inset-y-0 left-0 z-50 w-[256px] max-w-full bg-surface border-r border-border flex flex-col md:hidden transition-transform duration-300 ease-in-out' +
              (isOpen ? ' translate-x-0' : ' -translate-x-full')
            }
            aria-label="Main navigation"
          >
            <div className="flex-1 overflow-y-auto">
              <nav className="px-4 py-6">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeItem === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onItemClick(item.id)
                        handleCloseMobile()
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        'w-full flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ' +
                        (isActive
                          ? 'bg-accent/10 dark:bg-accent/10 text-accent dark:text-accent'
                          : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground')
                      }
                    >
                      <span
                        className={
                          'w-7 h-7 rounded-md flex items-center justify-center font-bold text-sm transition-colors ' +
                          (isActive
                            ? 'bg-accent text-on-accent'
                            : 'bg-surface-muted text-muted-foreground border border-border')
                        }
                      >
                        {item.icon}
                      </span>
                      <span className="text-foreground dark:text-foreground-dark">{item.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
            <div className="border-t border-border p-4 bg-surface/90 backdrop-blur backdrop-blur-md">
              <button
                onClick={handleCloseMobile}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-surface-muted hover:text-foreground focus-ring"
              >
                <span>Close navigation</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-4 h-4"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
