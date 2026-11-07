/**
 * BRANDCORE — Status Badge
 * Colored status indicator with text label. Never color-only.
 * Uses CSS variables for light/dark theme support.
 */
export function StatusBadge({ status, size = 'md' }) {
  const styles = {
    valid: 'bg-success-light text-success border border-success/30 dark:bg-success/10 dark:text-success-dark dark:border-success/30',
    stale: 'bg-warning-light text-warning border border-warning/30 dark:bg-warning/10 dark:text-warning-dark dark:border-warning/30',
    revoked: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700/50',
    invalid: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700/50',
    pending: 'bg-surface-muted text-muted-foreground border border-border',
    approved: 'bg-success-light text-success border border-success/30 dark:bg-success/10 dark:text-success-dark dark:border-success/30',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700/50',
    'changes-requested': 'bg-warning-light text-warning border border-warning/30 dark:bg-warning/10 dark:text-warning-dark dark:border-warning/30',
  }

  const base =
    'status-badge'

  const labels = {
    valid: 'Valid',
    stale: 'Stale',
    revoked: 'Revoked',
    invalid: 'Invalid',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    'changes-requested': 'Changes Requested',
  }

  return (
    <span className={`${base} ${styles[status] ?? styles.pending}`}>
      {labels[status] ?? status}
    </span>
  )
}
