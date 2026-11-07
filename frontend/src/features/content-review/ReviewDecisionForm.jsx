/**
 * BRANDCORE — Review Decision Form
 * Integrated from Rahul's Content Review work, adapted to the canonical
 * design system with light/dark theme support.
 */
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui'

const DECISIONS = [
  ['APPROVED', 'Approve'],
  ['CHANGES_REQUESTED', 'Request changes'],
  ['REJECTED', 'Reject'],
]

export default function ReviewDecisionForm({ onSubmit, disabled = false, result }) {
  const [decision, setDecision] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const confirmationRef = useRef(null)

  useEffect(() => {
    if (result) confirmationRef.current?.focus()
  }, [result])

  function handleSubmit(event) {
    event.preventDefault()
    if (!decision) {
      setError('Choose a review decision.')
      return
    }
    setError('')
    onSubmit({ decision, reviewer_role: 'reviewer', notes: notes.trim() || null })
  }

  if (result) {
    return (
      <section className="rounded-lg border border-green-700/30 bg-green-50 dark:bg-green-900/20 p-4" role="status">
        <h2 ref={confirmationRef} tabIndex={-1} className={`font-semibold text-green-700 dark:text-green-400 focus-ring`}>
          Decision recorded: {result.decision}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground-dark">Recorded at {new Date(result.timestamp).toLocaleString()}.</p>
      </section>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border bg-surface p-4" noValidate>
      <h2 className="text-lg font-semibold text-foreground dark:text-foreground-dark">Reviewer decision</h2>
      <fieldset disabled={disabled} aria-describedby={error ? 'decision-error' : undefined}>
        <legend className="mb-2 text-sm text-muted-foreground dark:text-muted-foreground-dark">Select one decision</legend>
        <div className="flex flex-wrap gap-3">
          {DECISIONS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-foreground dark:text-foreground-dark">
              <input type="radio" name="decision" value={value} checked={decision === value} onChange={(event) => setDecision(event.target.value)} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor="review-notes" className="block text-sm font-medium text-foreground dark:text-foreground-dark">Notes <span className="font-normal text-muted-foreground-dark dark:text-muted-foreground-dark">(optional, max 1000 characters)</span></label>
      <textarea id="review-notes" value={notes} maxLength={1000} disabled={disabled} onChange={(event) => setNotes(event.target.value)} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground dark:text-foreground-dark focus-ring transition-colors" rows={3} />
      {error && <p id="decision-error" role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <Button type="submit" disabled={disabled} variant="primary" size="md">
        Record decision
      </Button>
    </form>
  )
}
