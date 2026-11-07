/**
 * BRANDCORE — Finding Card
 * Integrated from Rahul's Content Review work, adapted to the canonical
 * design system with light/dark theme support.
 */
import { StatusBadge } from '@/components/ui'

const FINDING_LABELS = {
  unsupported_claim: 'Unsupported claim',
  numeric_mismatch: 'Numeric mismatch',
  claim_stronger_than_evidence: 'Claim stronger than evidence',
  missing_qualifier: 'Missing qualifier',
  scope_mismatch: 'Scope mismatch',
  expired_offer: 'Expired offer',
  unapproved_terminology: 'Unapproved terminology',
}

const FINDING_SEVERITY_STATUS = {
  high: 'invalid',
  medium: 'stale',
  low: 'pending',
}

export default function FindingCard({ finding }) {
  const label = FINDING_LABELS[finding.finding_type] || 'Finding'
  const severity = finding.severity || 'medium'
  const badgeStatus = FINDING_SEVERITY_STATUS[severity] || 'pending'

  return (
    <article className="rounded-lg border border-border bg-surface p-4" aria-labelledby={`finding-${finding.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`finding-${finding.id}`} className="font-semibold text-foreground dark:text-foreground-dark">{label}</h3>
        <StatusBadge status={badgeStatus} size="sm" />
      </div>
      <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground-dark">{finding.explanation}</p>
      {finding.suggested_correction && (
        <p className="mt-2 border-l-2 border-l-green-700 dark:border-l-green-400 pl-3 text-sm text-muted-foreground dark:text-muted-foreground-dark bg-green-50 dark:bg-green-900/20 p-2">
          <strong className="text-foreground dark:text-foreground-dark">Suggested correction:</strong> {finding.suggested_correction}
        </p>
      )}
    </article>
  )
}
