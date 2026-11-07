
import React, { useEffect, useState } from 'react'
import { mockGetReleases, mockGetStaleImpact } from './__mocks__/releases.js'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'

  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso) {
  if (!iso) return '—'

  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortHash(hash) {
  if (!hash) return '—'
  return hash.slice(0, 10) + '…'
}

// ── Status badge ──────────────────────────────────────────────────────────

function PassportBadge({ status }) {
  const map = {
    valid: {
      dot: 'bg-[#3ecf8e]',
      text: 'text-[#3ecf8e]',
      bg: 'bg-[rgba(62,207,142,0.1)]',
      border: 'border-[rgba(62,207,142,0.2)]',
      label: 'Valid',
    },
    stale: {
      dot: 'bg-[#f5a623]',
      text: 'text-[#f5a623]',
      bg: 'bg-[rgba(245,166,35,0.1)]',
      border: 'border-[rgba(245,166,35,0.2)]',
      label: 'Stale',
    },
    revoked: {
      dot: 'bg-[#f66]',
      text: 'text-[#f66]',
      bg: 'bg-[rgba(255,102,102,0.1)]',
      border: 'border-[rgba(255,102,102,0.2)]',
      label: 'Revoked',
    },
    invalid: {
      dot: 'bg-[#f66]',
      text: 'text-[#f66]',
      bg: 'bg-[rgba(255,102,102,0.1)]',
      border: 'border-[rgba(255,102,102,0.2)]',
      label: 'Invalid',
    },
  }

  const s = map[status] ?? {
    dot: 'bg-[#6b6b6b]',
    text: 'text-white',
    bg: 'bg-[rgba(107,107,107,0.1)]',
    border: 'border-[rgba(107,107,107,0.2)]',
    label: status,
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${s.bg} ${s.text} ${s.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="border border-[#2e2e2e] rounded-lg overflow-hidden">
      <div className="h-9 bg-[#1a1a1a] border-b border-[#2e2e2e]" />

      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className="h-11 border-b border-[#1f1f1f] bg-[#1c1c1c] animate-pulse"
          style={{ animationDelay: `${(n - 1) * 60}ms` }}
        />
      ))}
    </div>
  )
}

// ── Error banner ───────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 px-4 py-3 rounded-lg bg-[rgba(255,102,102,0.08)] border border-[rgba(255,102,102,0.2)]"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        className="text-[#f66] shrink-0 mt-0.5"
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M7 4.5v3"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <circle cx="7" cy="9.5" r="0.7" fill="currentColor" />
      </svg>

      <span className="text-[12px] text-[#f66] flex-1">
        {message}
      </span>

      {onRetry && (
        <button
          onClick={onRetry}
          className="text-[11px] text-[#f66] underline underline-offset-2 shrink-0 hover:no-underline"
        >
          Retry
        </button>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 border border-dashed border-[#2e2e2e] rounded-lg bg-[#1c1c1c]">
      <div className="w-10 h-10 rounded-lg bg-[#262626] flex items-center justify-center mb-3">
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className="text-[#4a4a4a]"
          aria-hidden="true"
        >
          <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path
            d="M9 6v3.5l2.5 1.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <p className="text-[13px] font-medium text-[#a1a1a1]">
        No release passports
      </p>

      <p className="text-[12px] text-[#4a4a4a] mt-1 text-center max-w-xs">
        Passports are created when a reviewer approves a content version.
      </p>
    </div>
  )
}

// ── Stale impact panel ────────────────────────────────────────────────────

function StaleImpactPanel({ releaseId, onClose }) {
  const [state, setState] = useState('loading')
  const [impact, setImpact] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    setState('loading')
    setError(null)

    mockGetStaleImpact(releaseId)
      .then((data) => {
        if (cancelled) return
        setImpact(data)
        setState('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message ?? 'Failed to load stale impact.')
        setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [releaseId])

  return (
    <div className="mx-4 my-2 border border-[rgba(245,166,35,0.2)] rounded-lg bg-[rgba(245,166,35,0.04)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6.5 1.5L11.5 10.5H1.5L6.5 1.5z"
              stroke="#f5a623"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d="M6.5 5v2.5"
              stroke="#f5a623"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <circle cx="6.5" cy="9" r="0.6" fill="#f5a623" />
          </svg>

          <span className="text-[11px] font-semibold text-[#f5a623] uppercase tracking-[0.08em]">
            Stale Impact
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Close stale impact"
          className="w-6 h-6 flex items-center justify-center rounded text-[#4a4a4a] hover:text-[#a1a1a1] hover:bg-[#262626] transition-colors"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M1 1l8 8M9 1L1 9"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {state === 'loading' && (
        <div className="h-7 rounded bg-[rgba(245,166,35,0.08)] animate-pulse" />
      )}

      {state === 'error' && (
        <p role="alert" className="text-[12px] text-[#f66]">
          {error}
        </p>
      )}

      {state === 'ready' && impact && (
        <dl className="grid grid-cols-[130px_1fr] gap-x-4 gap-y-2">
          <dt className="text-[11px] text-white font-medium self-start pt-0.5">
            Reason
          </dt>
          <dd className="text-[12px] text-[#a1a1a1]">
            {impact.stale_reason}
          </dd>

          <dt className="text-[11px] text-white font-medium">
            Stale since
          </dt>
          <dd className="text-[12px] text-[#a1a1a1]">
            {formatDateTime(impact.stale_since)}
          </dd>

          <dt className="text-[11px] text-white font-medium">
            Revalidation
          </dt>
          <dd className="text-[12px]">
            {impact.revalidation_required ? (
              <span className="inline-flex items-center gap-1.5 text-[#f5a623] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623]" />
                Required
              </span>
            ) : (
              <span className="text-[#4a4a4a]">
                Not required
              </span>
            )}
          </dd>
        </dl>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ReleasePassports() {
  const [releases, setReleases] = useState([])
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  function load() {
    setLoadState('loading')
    setLoadError(null)

    mockGetReleases()
      .then(({ releases: data }) => {
        setReleases(data)
        setLoadState('ready')
      })
      .catch((err) => {
        setLoadError(err.message ?? 'Failed to load releases.')
        setLoadState('error')
      })
  }

  useEffect(() => {
    load()
  }, [])

  function toggleStaleImpact(id) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <section aria-label="Release Passports">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[18px] font-semibold text-white tracking-tight">
            Release Passports
          </h1>

          <p className="text-[12px] text-[#4a4a4a] mt-0.5">
            Lumora Skincare · Demo workspace
          </p>
        </div>
      </div>

      {loadState === 'loading' && <Skeleton />}

      {loadState === 'error' && (
        <ErrorBanner message={loadError} onRetry={load} />
      )}

      {loadState === 'ready' && releases.length === 0 && <EmptyState />}

      {loadState === 'ready' && releases.length > 0 && (
        <div className="border border-[#2e2e2e] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#1a1a1a] border-b border-[#2e2e2e]">
                  <th scope="col" className="text-left px-4 py-2.5 text-[11px] font-medium text-white uppercase tracking-[0.07em]">
                    Passport ID
                  </th>
                  <th scope="col" className="text-left px-4 py-2.5 text-[11px] font-medium text-white uppercase tracking-[0.07em]">
                    Content version
                  </th>
                  <th scope="col" className="text-left px-4 py-2.5 text-[11px] font-medium text-white uppercase tracking-[0.07em]">
                    Hash
                  </th>
                  <th scope="col" className="text-left px-4 py-2.5 text-[11px] font-medium text-white uppercase tracking-[0.07em]">
                    Approved by
                  </th>
                  <th scope="col" className="text-left px-4 py-2.5 text-[11px] font-medium text-white uppercase tracking-[0.07em] whitespace-nowrap">
                    Approved at
                  </th>
                  <th scope="col" className="text-left px-4 py-2.5 text-[11px] font-medium text-white uppercase tracking-[0.07em]">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5 w-28">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {releases.map((release, i) => (
                  <React.Fragment key={release.id}>
                    <tr
                      className={`border-b border-[#1f1f1f] hover:bg-[#1a1a1a] transition-colors duration-75 group ${
                        i === releases.length - 1 && expandedId !== release.id
                          ? 'border-b-0'
                          : ''
                      } ${
                        release.status === 'stale'
                          ? 'bg-[rgba(245,166,35,0.02)]'
                          : 'bg-[#1c1c1c]'
                      }`}
                    >
                      <td className="px-4 py-3 align-middle">
                        <span className="font-mono text-[11px] text-[#a1a1a1] bg-[#262626] px-1.5 py-0.5 rounded border border-[#2e2e2e]">
                          {release.id}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <span className="font-mono text-[12px] text-white">
                          {release.content_version_id}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <span
                          className="font-mono text-[11px] text-[#4a4a4a] bg-[#262626] px-1.5 py-0.5 rounded border border-[#2e2e2e] cursor-default"
                          title={release.content_sha256}
                        >
                          {shortHash(release.content_sha256)}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <span className="block text-[#ededed] text-[13px] font-medium leading-none">
                          {release.approver_id}
                        </span>
                        <span className="text-[11px] text-[#4a4a4a] mt-0.5 block">
                          {release.approver_role}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-middle text-white text-[12px] whitespace-nowrap">
                        {formatDate(release.approved_at)}
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <PassportBadge status={release.status} />
                      </td>

                      <td className="px-4 py-3 align-middle text-right">
                        {release.status === 'stale' && (
                          <button
                            onClick={() => toggleStaleImpact(release.id)}
                            aria-expanded={expandedId === release.id}
                            aria-controls={`stale-panel-${release.id}`}
                            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#f5a623] hover:text-[#e09010] px-2 py-1 rounded hover:bg-[rgba(245,166,35,0.1)] transition-colors"
                          >
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 11 11"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path
                                d="M5.5 1L10 9.5H1L5.5 1z"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M5.5 4.5v2"
                                stroke="currentColor"
                                strokeWidth="1.2"
                                strokeLinecap="round"
                              />
                              <circle cx="5.5" cy="8" r="0.5" fill="currentColor" />
                            </svg>

                            {expandedId === release.id ? 'Hide' : 'View impact'}
                          </button>
                        )}
                      </td>
                    </tr>

                    {expandedId === release.id && (
                      <tr className="bg-[rgba(245,166,35,0.02)] border-b border-[#1f1f1f]">
                        <td
                          colSpan={7}
                          id={`stale-panel-${release.id}`}
                          className="py-1"
                        >
                          <StaleImpactPanel
                            releaseId={release.id}
                            onClose={() => setExpandedId(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-2 bg-[#1a1a1a] border-t border-[#2e2e2e] flex items-center justify-between">
            <span className="text-[11px] text-[#4a4a4a]">
              {releases.length}{' '}
              {releases.length === 1 ? 'passport' : 'passports'}
            </span>

            <span className="text-[11px] text-[#3d3d3d]">
              Lumora Skincare · Demo workspace
            </span>
          </div>
        </div>
      )}
    </section>
  )
}

