/**
 * BRANDCORE — Findings Panel
 * Integrated from Rahul's Content Review work, adapted to the canonical
 * design system with light/dark theme support.
 */
import FindingCard from './FindingCard.jsx'

export default function FindingsPanel({ findings, loading, error }) {
  return (
    <section aria-labelledby="findings-heading" className="space-y-3">
      <div>
        <h2 id="findings-heading" className="text-lg font-semibold text-foreground dark:text-foreground-dark">Review findings</h2>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground-dark">
          Deterministic checks and AI extraction are advisory; a reviewer makes the final decision.
        </p>
      </div>
      {loading && <p role="status" className="text-sm text-muted-foreground dark:text-muted-foreground-dark">Analyzing content…</p>}
      {error && <p role="alert" className="rounded-md border border-red-700/30 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
      {!loading && !error && findings.length === 0 && (
        <p className="rounded-md border border-green-700/30 bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400">No findings were returned.</p>
      )}
      {!loading && !error && findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}
    </section>
  )
}
