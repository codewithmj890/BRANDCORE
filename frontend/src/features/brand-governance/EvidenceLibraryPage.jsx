/**
 * BRANDCORE — Evidence Library Page
 * First-class evidence management interface showing sources, types, validity,
 * linked facts, and freshness status.
 *
 * Demo mode: When backend endpoints are unavailable but auth is valid, displays
 * clearly labeled demo fixtures. Auth failures (401/403) are never silently
 * replaced with demo data.
 */
import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { api } from '@/services/api'
import {
  Card, CardHeader, CardTitle, CardBody,
  Button, StatusBadge, EmptyState, ErrorState, Skeleton, SkeletonRow,
  FormField, FormInput, FormSelect,
} from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { DEMO_EVIDENCE, DEMO_WORKSPACE } from './__mocks__/demo-data'

const SOURCE_TYPE_LABELS = {
  internal_study: 'Internal Study',
  third_party_report: 'Third-Party Report',
  internal_monitoring: 'Internal Monitoring',
  customer_survey: 'Customer Survey',
  regulatory_filing: 'Regulatory Filing',
}

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function EvidenceLibraryPage() {
  const { workspaceId, authStatus } = useWorkspace()
  const [evidence, setEvidence] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [demoMode, setDemoMode] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const fetchEvidence = useCallback(async () => {
    if (!workspaceId || authStatus !== 'ready') {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      // Evidence listing endpoint not yet implemented — will fall back to demo
      const data = await api.getWorkspace(workspaceId)
      setDemoMode(true)
      setEvidence(DEMO_EVIDENCE)
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
        setDemoMode(true)
        setEvidence(DEMO_EVIDENCE)
        setError(null)
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId, authStatus])

  useEffect(() => {
    fetchEvidence()
  }, [fetchEvidence])

  const filteredEvidence = evidence.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.summary || '').toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || item.source_type === typeFilter
    return matchesSearch && matchesType
  })

  const summary = {
    total: evidence.length,
    active: evidence.filter((e) => e.status === 'active').length,
    linked: evidence.filter((e) => e.linked_fact_ids && e.linked_fact_ids.length > 0).length,
    unlinked: evidence.filter((e) => !e.linked_fact_ids || e.linked_fact_ids.length === 0).length,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Evidence Library" description="Manage evidence sources that support approved brand facts." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
        <PageHeader title="Evidence Library" description="Manage evidence sources that support approved brand facts. Each evidence record links to one or more approved facts." />
        <ErrorState message={error || 'Unable to load evidence library'} onRetry={fetchEvidence} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Library"
        description="Manage evidence sources that support approved brand facts. Each evidence record links to one or more approved facts."
        breadcrumbs={[{ label: 'Evidence', href: '#' }]}
      />

      {demoMode && (
        <Card padding="p-4" className="border-amber-700/20 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-amber-700 flex items-center justify-center text-white text-xs">
              !
            </div>
            <div>
              <p className="text-sm font-medium text-amber-700">Demo mode — evidence endpoints not yet implemented</p>
              <p className="text-xs text-amber-600 mt-1">
                Displaying fictional demo data. No changes are persisted to the backend.
              </p>
            </div>
          </div>
        </Card>
      )}

      {!demoMode && error && (
        <ErrorState message="Unable to load evidence library" onRetry={fetchEvidence} />
      )}

      {!error && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <Card padding="p-4">
            <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Total evidence</div>
            <div className="text-2xl font-bold text-foreground">{summary.total}</div>
          </Card>
          <Card padding="p-4">
            <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Active</div>
            <div className="text-2xl font-bold text-green-700">{summary.active}</div>
          </Card>
          <Card padding="p-4">
            <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Linked to facts</div>
            <div className="text-2xl font-bold text-green-700">{summary.linked}</div>
          </Card>
          <Card padding="p-4">
            <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Unlinked</div>
            <div className="text-2xl font-bold text-amber-700">{summary.unlinked}</div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-[320px]">
            <FormField label="Search evidence" helperText="Search by title, source, or summary">
              <FormInput
                placeholder="Search evidence…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </FormField>
          </div>
          <div className="w-full lg:w-64">
            <FormField label="Filter by source type">
              <FormSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All types</option>
                <option value="internal_study">Internal Study</option>
                <option value="third_party_report">Third-Party Report</option>
                <option value="internal_monitoring">Internal Monitoring</option>
                <option value="customer_survey">Customer Survey</option>
              </FormSelect>
            </FormField>
          </div>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 border-b border-border" scope="col">Title</th>
                <th className="px-4 py-3 border-b border-border" scope="col">Type</th>
                <th className="px-4 py-3 border-b border-border" scope="col">Status</th>
                <th className="px-4 py-3 border-b border-border" scope="col">Linked Facts</th>
                <th className="px-4 py-3 border-b border-border text-right" scope="col">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEvidence.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <EmptyState
                      title="No evidence found"
                      description={search ? 'Try adjusting your search or filters.' : 'Add your first evidence source to get started.'}
                    />
                  </td>
                </tr>
              ) : (
                filteredEvidence.map((item) => (
                  <tr key={item.id} className="bg-surface hover:bg-surface-muted transition-colors group">
                    <td className="px-4 py-3">
                      <div className="text-sm text-foreground font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground-dark mt-1 truncate max-w-xs">{item.source_url || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-muted text-xs text-muted-foreground">
                        {SOURCE_TYPE_LABELS[item.source_type] || item.source_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-foreground">
                        {item.linked_fact_ids?.length || 0}
                      </div>
                      {item.linked_fact_ids && item.linked_fact_ids.length > 0 && (
                        <span className="text-xs text-muted-foreground-dark block mt-0.5">
                          {item.linked_fact_ids.map((fid) => fid.slice(-3)).join(', ')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  )
}
