/**
 * BRANDCORE — Sidebar Navigation
 * Minimal, icon-first enterprise navigation with circular interaction boundaries.
 *
 * Desktop:
 * - Collapsed: circular icon buttons (44px) stacked vertically in 72px sidebar
 * - Expanded: circular icon button + text label in 256px sidebar
 * Mobile:
 * - Hidden from grid; overlay drawer controlled by topbar hamburger
 * - Escape-to-close, backdrop click to close, body scroll lock
 */
import { useEffect, useCallback } from 'react'

const COLLAPSED_WIDTH = 'w-20'   // 72px — circular icon buttons only
const EXPANDED_WIDTH = 'w-64'    // 256px — circular icons + labels

const ICON_SIZE = 'w-5 h-5'      // 20px icons
const BTN_SIZE = 'w-11 h-11'     // 44px circular buttons

const ICONS = {
  overview: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON_SIZE}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="2" x2="12" y2="22" /><line x1="2" y1="12" x2="22" y2="12" />
    </svg>
  ),
  facts: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON_SIZE}>
      <path d="M9 11l3-3L21 12l-9 9M7 11h10" />
    </svg>
  ),
  content: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON_SIZE}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="14 16 14 22 10 22" />
    </svg>
  ),
  releases: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON_SIZE}>
      <path d="M15 18V6l3 7-4 3-11-4L2 12Z" />
    </svg>
  ),
  evidence: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={ICON_SIZE}>
      <circle cx="12" cy="12" r="4" /><path d="M7 12h10M12 7v10" />
    </svg>
  ),
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'facts', label: 'Approved Facts' },
  { id: 'content', label: 'Content Review' },
  { id: 'releases', label: 'Releases' },
  { id: 'evidence', label: 'Evidence Library' },
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

  const navItemClasses = (isActive, isCollapsed) =>
    (isCollapsed
      ? 'flex flex-col items-center gap-1.5 py-3 transition-all duration-200 '
      : 'flex items-center gap-3 px-3 py-2 transition-all duration-200 ') +
    (isActive
      ? 'bg-accent/10 dark:bg-accent/10 border-r-2 border-r-accent/40'
      : 'hover:bg-surface-muted dark:hover:bg-surface-muted-dark');

  const iconClasses = (isActive) =>
    BTN_SIZE + ' rounded-full flex items-center justify-center transition-colors duration-200 ' +
    (isActive
      ? 'bg-accent text-on-accent'
      : 'text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground-dark');

  return (
    <>
      {/* Desktop sidebar — CSS Grid column */}
      <aside
        className={['hidden lg:flex', sidebarClasses, className || ''].join(' ').trim()}
        id="brandcore-sidebar"
        aria-label="Main navigation"
      >
        <div className="flex-1 overflow-y-auto">
          <nav className="px-2 py-4">
            {NAV_ITEMS.map((item) => {
              const isActive = activeItem === item.id
              const Icon = ICONS[item.id]
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onItemClick(item.id)
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  className={navItemClasses(isActive, isCollapsed)}
                >
                  <span className={iconClasses(isActive)}>
                    {Icon}
                  </span>
                  {!isCollapsed && (
                    <span className="text-xs font-medium text-foreground dark:text-foreground-dark">
                      {item.label}
                    </span>
                  )}
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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={handleCloseMobile}
            aria-hidden="true"
          />
          <aside
            id="brandcore-sidebar-mobile"
            className={
              'fixed inset-y-0 left-0 z-50 w-[256px] max-w-full bg-surface border-r border-border flex flex-col lg:hidden transition-transform duration-300 ease-in-out' +
              (isOpen ? ' translate-x-0' : ' -translate-x-full')
            }
            aria-label="Main navigation"
          >
            <div className="flex-1 overflow-y-auto">
              <nav className="px-4 py-6">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeItem === item.id
                  const Icon = ICONS[item.id]
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onItemClick(item.id)
                        handleCloseMobile()
                      }}
                      aria-current={isActive ? 'page' : undefined}
                      className={
                        'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ' +
                        (isActive
                          ? 'bg-accent/10 dark:bg-accent/10 text-accent dark:text-accent'
                          : 'text-muted-foreground hover:bg-surface-muted hover:text-foreground')
                      }
                    >
                      <span className={BTN_SIZE + ' rounded-full flex items-center justify-center transition-colors duration-200 ' +
                        (isActive
                          ? 'bg-accent text-on-accent'
                          : 'text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground-dark')}>
                        {Icon}
                      </span>
                      <span className="text-foreground dark:text-foreground-dark">{item.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>
            <div className="border-t border-border p-4 bg-surface/90 backdrop-blur backdrop-blur-md">
              <button
                type="button"
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
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
