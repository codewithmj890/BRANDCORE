
/**
 * BRANDCORE — Finding Card
 * Displays content review findings with severity and suggested corrections.
 * Supports the canonical design system and light/dark themes.
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

const FINDING_STYLES = {
  unsupported_claim: 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400',
  numeric_mismatch: 'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  claim_stronger_than_evidence: 'border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  missing_qualifier: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  scope_mismatch: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  expired_offer: 'border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400',
  unapproved_terminology: 'border-purple-300 bg-purple-50 text-purple-800 dark:border-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
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

  const findingStyle =
    FINDING_STYLES[finding.finding_type] ||
    'border-border bg-surface-muted text-text-primary dark:bg-surface-muted-dark dark:text-text-primary-dark'

  return (
    <article
      className="rounded-lg border border-border bg-surface dark:bg-surface-dark p-4"
      aria-labelledby={`finding-${finding.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id={`finding-${finding.id}`}
          className="font-semibold text-text-primary dark:text-text-primary-dark"
        >
          {label}
        </h3>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${findingStyle}`}
          >
            {severity}
          </span>

          <StatusBadge status={badgeStatus} size="sm" />
        </div>
      </div>

      <p className="mt-2 text-sm text-text-secondary dark:text-slate-400">
        {finding.explanation}
      </p>

      {finding.suggested_correction && (
        <p className="mt-2 border-l-2 border-l-green-700 dark:border-l-green-400 pl-3 text-sm text-text-secondary dark:text-slate-400 bg-green-50 dark:bg-green-900/20 p-2">
          <strong className="text-text-primary dark:text-text-primary-dark">
            Suggested correction:
          </strong>{' '}
          {finding.suggested_correction}
        </p>
      )}
    </article>
  )
}

