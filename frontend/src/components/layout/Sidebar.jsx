/**
 * BRANDCORE — Sidebar Navigation
 * Collapsible sidebar with active state indicators and user section.
 *
 * Desktop:
 * - Expanded: full width with icons + text labels
 * - Collapsed: compact icon-only sidebar with tooltips
 * - Collapse preference persisted in localStorage (via AppShell)
 *
 * Mobile:
 * - Hidden; overlay drawer controlled by AppShell
 * - Escape-to-close, backdrop click to close, body scroll lock
 */
import { useEffect, useCallback } from 'react'

const COLLAPSED_WIDTH = 'w-20'   // 80px — icon only
const EXPANDED_WIDTH = 'w-64'    // 256px — icons + labels

const NAV_ITEMS = [
  { id: 'facts', label: 'Approved Facts', icon: 'F' },
  { id: 'content', label: 'Content Review', icon: 'C' },
  { id: 'releases', label: 'Releases', icon: 'R' },
  { id: 'evidence', label: 'Evidence Library', icon: 'E' },
]

export function Sidebar({ activeItem, onItemClick, isCollapsed, onCollapseChange, isOpen, onClose }) {
  const handleToggleCollapse = useCallback(() => {
    onCollapseChange((prev) => !prev)
  }, [onCollapseChange])

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
    'fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ease-in-out',
    'border-r border-border bg-surface dark:bg-surface-dark',
    isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
    'transform',
  ].join(' ')

  return (
    <>
      {/* Desktop sidebar (fixed, always present on md+) */}
      <aside
        className={['hidden md:flex', sidebarClasses].join(' ')}
        id="brandcore-sidebar"
        aria-label="Main navigation"
      >
        <div className="flex-1 overflow-y-auto">
          <nav className="px-2 py-4">
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
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ' +
                    (isActive
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-700/20 dark:border-green-700/30'
                      : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary')
                  }
                >
                  <span
                    className={
                      'w-6 h-6 rounded flex items-center justify-center font-bold text-xs ' +
                      (isActive
                        ? 'bg-green-700 dark:bg-green-600 text-white'
                        : 'bg-surface-muted text-text-secondary border border-border')
                    }
                  >
                    {item.icon}
                  </span>
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-border p-2 bg-surface/95 backdrop-blur backdrop-blur-md">
          <button
            onClick={handleToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-controls="brandcore-sidebar"
            aria-expanded={!isCollapsed}
            className="w-full flex items-center justify-center px-2 py-2 rounded-md text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-ring transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5"
            >
              {isCollapsed
                ? <line x1="18" y1="12" x2="6" y2="12" />
                : <line x1="6" y1="12" x2="18" y2="12" />}
            </svg>
            {!isCollapsed && (
              <span className="ml-2 text-xs text-text-secondary">Collapse</span>
            )}
            {isCollapsed && (
              <span className="ml-2 text-xs text-text-secondary">Expand</span>
            )}
          </button>
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
            className="fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-border flex flex-col md:hidden transform transition-transform duration-300 ease-in-out"
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
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary')
                      }
                    >
                      <span
                        className={
                          'w-7 h-7 rounded flex items-center justify-center font-bold text-sm ' +
                          (isActive
                            ? 'bg-green-700 dark:bg-green-600 text-white'
                            : 'bg-surface-muted text-text-secondary border border-border')
                        }
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
            <div className="border-t border-border p-4 bg-surface/95 backdrop-blur backdrop-blur-md">
              <button
                onClick={handleCloseMobile}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary focus-ring"
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
