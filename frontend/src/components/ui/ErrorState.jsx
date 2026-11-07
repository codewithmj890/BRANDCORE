/**
 * BRANDCORE — Error State
 * Consistent error display with message and optional retry action.
 */
import { Button } from './Button'

export function ErrorState({ message, detail, onRetry, className = '' }) {
  return (
    <div
      className={
        'flex flex-col items-center justify-center py-8 text-center rounded-lg border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20 ' +
        className
      }
    >
      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-5 h-5 text-red-700 dark:text-red-400"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground dark:text-foreground-dark mb-1">Error</h3>
      <p className="text-muted-foreground text-sm mb-4">{message}</p>
      {detail && <p className="text-xs text-muted-foreground-dark mb-6">{detail}</p>}
      {onRetry && (
        <Button variant="primary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
