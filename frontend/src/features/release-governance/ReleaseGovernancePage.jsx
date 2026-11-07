/**
 * BRANDCORE — Release Governance Page
 * Release passport list with status badges, stale impact explanations,
 * and detailed passport views showing approval history and dependencies.
 *
 * Demo mode: When backend endpoints are unavailable but auth is valid, displays
 * clearly labeled demo fixtures. Auth failures (401/403) are never silently
 * replaced with demo data.
 */
import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { api } from '@/services/api'
import {
  Card, CardHeader, CardTitle, CardBody, CardFooter,
  Button, StatusBadge, EmptyState, ErrorState, Skeleton, SkeletonRow,
  FormField, FormInput, FormSelect,
} from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { DEMO_RELEASES, DEMO_STALE_IMPACT } from '../brand-governance/__mocks__/demo-data'

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatDateTime(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ReleaseGovernancePage() {
  const { workspaceId, authStatus } = useWorkspace()
  const [releases, setReleases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [demoMode, setDemoMode] = useState(false)
  const [selectedRelease, setSelectedRelease] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchReleases = useCallback(async () => {
    if (!workspaceId || authStatus !== 'ready') {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await api.getReleases(workspaceId)
      setReleases((data.releases || []).map((release) => ({
        ...release,
        status: String(release.status || '').toUpperCase(),
      })))
      setDemoMode(false)
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setError(err.status === 401
          ? 'Session expired. Please sign in again.'
          : 'You do not have access to this workspace.')
        setDemoMode(false)
      } else if (err.status === 404) {
        setError('Workspace not found.')
        setDemoMode(false)
        } else {
          setDemoMode(false)
          setError(err.message || 'Unable to load releases.')
        }
    } finally {
      setLoading(false)
    }
  }, [workspaceId, authStatus])

  useEffect(() => {
    fetchReleases()
  }, [fetchReleases])

  const filteredReleases = releases.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesStatus
  })

  const summary = {
    total: releases.length,
    valid: releases.filter((r) => r.status === 'VALID').length,
    stale: releases.filter((r) => r.status === 'STALE').length,
    revoked: releases.filter((r) => r.status === 'REVOKED').length,
  }

  const openStaleImpact = (releaseId) => {
    const release = releases.find((r) => r.id === releaseId)
    if (release && release.status === 'STALE') {
      api.getStaleImpact(workspaceId, releaseId)
        .then((impact) => setSelectedRelease(impact))
        .catch((error) => setError(error.message || 'Unable to load stale impact.'))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Release Governance" description="Monitor release passports, track stale status, and manage revalidation." />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} padding="p-4">
              <SkeletonRow className="mb-4" />
              <Skeleton width="60%" height="16px" />
              <Skeleton width="40%" height="16px" className="mt-2" />
            </Card>
          ))}
        </div>
        <div className="h-64">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (authStatus !== 'ready' && !demoMode) {
    return (
      <div className="space-y-6">
        <PageHeader title="Release Governance" description="Monitor release passports, track stale status after fact changes, and manage revalidation workflows." />
        <ErrorState message={error || 'Unable to load releases'} onRetry={fetchReleases} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Release Governance"
        description="Monitor release passports, track stale status after fact changes, and manage revalidation workflows."
        breadcrumbs={[{ label: 'Releases', href: '#' }]}
      />

      {demoMode && (
        <Card padding="p-4" className="border-amber-700/20 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-amber-700 flex items-center justify-center text-white text-xs">
              !
            </div>
            <div>
              <p className="text-sm font-medium text-amber-700">Demo mode — release endpoints not yet implemented</p>
              <p className="text-xs text-amber-600 mt-1">
                Displaying fictional demo data. No changes are persisted to the backend.
              </p>
            </div>
          </div>
        </Card>
      )}

      {!demoMode && error && (
        <ErrorState message="Unable to load releases" onRetry={fetchReleases} />
      )}

      {!error && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <Card padding="p-4">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total releases</div>
            <div className="text-2xl font-bold text-text-primary">{summary.total}</div>
          </Card>
          <Card padding="p-4" className="border-green-700/20 bg-green-50/30 dark:bg-green-900/20">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Valid</div>
            <div className="text-2xl font-bold text-green-700">{summary.valid}</div>
          </Card>
          <Card padding="p-4" className="border-amber-700/20 bg-amber-50/30 dark:bg-amber-900/20">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Stale</div>
            <div className="text-2xl font-bold text-amber-700">{summary.stale}</div>
          </Card>
          <Card padding="p-4" className="border-red-700/20 bg-red-50/30 dark:bg-red-900/20">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Revoked</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{summary.revoked}</div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="w-full lg:w-64">
            <FormField label="Filter by status">
              <FormSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="VALID">Valid</option>
                <option value="STALE">Stale</option>
                <option value="REVOKED">Revoked</option>
              </FormSelect>
            </FormField>
          </div>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-muted text-xs font-semibold text-text-secondary uppercase tracking-wider">
                <th className="px-4 py-3 border-b border-border" scope="col">Release</th>
                <th className="px-4 py-3 border-b border-border" scope="col">Status</th>
                <th className="px-4 py-3 border-b border-border" scope="col">Content Version</th>
                <th className="px-4 py-3 border-b border-border" scope="col">Approved</th>
                <th className="px-4 py-3 border-b border-border text-right" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReleases.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <EmptyState
                      title="No releases found"
                      description={searchPlaceholder(statusFilter)}
                    />
                  </td>
                </tr>
              ) : (
                filteredReleases.map((release) => (
                  <tr
                    key={release.id}
                    className="bg-surface dark:bg-surface-dark hover:bg-surface-muted transition-colors group cursor-pointer"
                    onClick={() => setSelectedRelease(release)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm text-text-primary font-medium">{release.id}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Content hash: {release.content_sha256 || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={release.status.toLowerCase()} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-text-primary">{release.content_version_id || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-text-secondary">
                        {formatDateTime(release.approved_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {release.status === 'STALE' ? (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            openStaleImpact(release.id)
                          }}
                        >
                          Review Impact
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </>
      )}
      {selectedRelease && (
        <ReleasePassportDrawer
          release={selectedRelease}
          onClose={() => setSelectedRelease(null)}
          demoMode={demoMode}
        />
      )}
    </div>
  )
}

function searchPlaceholder(filter) {
  const labels = { all: '', VALID: 'valid releases', STALE: 'stale releases', REVOKED: 'revoked releases' }
  return labels[filter] || 'Try adjusting your filters.'
}

function ReleasePassportDrawer({ release, onClose, demoMode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Release passport details"
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border-t border-border rounded-t-lg shadow-2xl w-full max-w-2xl p-6 mx-4 animate-slide-in">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Release Passport</h2>
            <p className="text-text-secondary text-sm mt-1">
              Release ID: <span className="font-mono text-text-primary">{release.id}</span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </Button>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval Summary</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</p>
                  <StatusBadge status={release.status.toLowerCase()} className="mt-1" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Content hash</p>
                  <p className="text-sm font-mono text-text-primary truncate">{release.content_sha256}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved at</p>
                  <p className="text-sm text-text-primary">{formatDateTime(release.approved_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved by</p>
                  <p className="text-sm text-text-primary">{release.approved_by || '—'}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {release.status === 'STALE' && (
            <Card className="border-amber-700/30 bg-amber-50/30 dark:bg-amber-900/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-700" />
                  <CardTitle className="text-amber-700">Stale Impact — Revalidation Required</CardTitle>
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-text-primary mb-3">
                  This release is <span className="font-semibold text-amber-700">STALE</span> because an underlying
                  approved fact has changed since approval. The content should be revalidated before further use.
                </p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</p>
                    <p className="text-sm text-text-primary">{release.stale_reason || 'Dependent fact was updated'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stale since</p>
                    <p className="text-sm text-text-primary">{formatDateTime(release.stale_since)}</p>
                  </div>
                  {release.changed_facts && release.changed_facts.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Changed facts</p>
                      <ul className="list-disc list-inside text-sm text-text-secondary mt-1 space-y-1">
                        {release.changed_facts.map((cf, i) => (
                          <li key={i}>
                            Fact <span className="font-mono">{cf.fact_id}</span>: version{' '}
                            <span className="font-medium">{cf.old_version}</span> →{' '}
                            <span className="font-medium">{cf.new_version}</span>
                            {cf.change ? ` — ${cf.change}` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <CardFooter className="pt-4">
                  <Button variant="danger" size="sm" onClick={() => {}}>
                    Request Revalidation
                  </Button>
                </CardFooter>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Version Details</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Content version ID</span>
                  <span className="font-mono text-text-primary">{release.content_version_id || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Policy version</span>
                  <span className="font-mono text-text-primary">{release.policy_version_id || '—'}</span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <CardFooter className="justify-end pt-0 mt-6 border-t border-border">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </CardFooter>
      </div>
    </div>
  )
}
