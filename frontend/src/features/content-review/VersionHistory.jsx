/**
 * BRANDCORE — Version History
 * Integrated from Rahul's Content Review work, adapted to the canonical
 * design system with light/dark theme support.
 */
import { StatusBadge } from '@/components/ui'

const STATUS_STYLES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  CHANGES_REQUESTED: 'changes-requested',
  REJECTED: 'rejected',
}

export default function VersionHistory({ versions, loading, error }) {
  return (
    <section aria-labelledby="version-history-heading" className="rounded-lg border border-border bg-surface p-4">
      <h2 id="version-history-heading" className="text-lg font-semibold text-foreground dark:text-foreground-dark">Version history</h2>
      <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground-dark">
        Versions are immutable. Edits create a new version instead of changing an existing one.
      </p>
      {loading && <p role="status" className="mt-3 text-sm text-muted-foreground dark:text-muted-foreground-dark">Loading versions…</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
      {!loading && !error && (
        <ol className="mt-3 space-y-2">
          {versions.map((version) => (
            <li key={version.content_version_id || version.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-sm">
              <span>
                <strong className="text-foreground dark:text-foreground-dark">Version {version.version_number}</strong>{' '}
                <time className="text-muted-foreground dark:text-muted-foreground-dark" dateTime={version.created_at}>{new Date(version.created_at).toLocaleString()}</time>
              </span>
              <StatusBadge status={STATUS_STYLES[version.review_status] || 'pending'} size="sm" />
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
