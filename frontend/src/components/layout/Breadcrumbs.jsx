/**
 * BRANDCORE — Breadcrumbs
 * Navigation breadcrumb trail with separators.
 */
import { Fragment } from 'react'

export function Breadcrumbs({ items }) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground-dark mb-5" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <Fragment key={item.label}>
            {!isLast && (
              <>
                <a
                  href={item.href}
                  className="hover:text-accent transition-colors"
                >
                  {item.label}
                </a>
                <span className="mx-1">/</span>
              </>
            )}
            {isLast && <span className="text-foreground dark:text-foreground-dark">{item.label}</span>}
          </Fragment>
        )
      })}
    </nav>
  )
}
