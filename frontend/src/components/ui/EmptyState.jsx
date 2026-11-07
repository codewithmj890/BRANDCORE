/**
 * BRANDCORE — Empty State
 * Consistent empty state with illustration-like icon, title, description and optional action.
 */
import { Button } from './Button'

export function EmptyState({ icon, title, description, action, onAction, className = '' }) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center py-12 text-center ' + className
      }
    >
      <div className="w-16 h-16 rounded-lg bg-surface-muted dark:bg-surface-muted-dark flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground dark:text-foreground-dark mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-xs mb-6">{description}</p>
      )}
      {action && (
        typeof action === 'string' ? (
          <Button variant="secondary" size="sm" onClick={onAction}>
            {action}
          </Button>
        ) : (
          action
        )
      )}
    </div>
  )
}

export function EmptyStateIcon({ children }) {
  return <span className="text-muted-foreground">{children}</span>
}
