/**
 * BRANDCORE — Evidence Library Page
 * Evidence management interface showing sources, types, validity,
 * linked facts, and freshness status. All data comes from the real
 * backend API — no demo data is ever shown as live workspace data.
 */
import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { api } from '@/services/api'
import {
  Card, CardFooter, StatusBadge, EmptyState, ErrorState, Skeleton, SkeletonRow,
  FormField, FormInput, FormSelect, FormTextarea, Button,
} from '@/components/ui'
import { PageHeader } from '@/components/layout'

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
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [openCreate, setOpenCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)

  const fetchEvidence = useCallback(async () => {
    if (!workspaceId || authStatus !== 'ready') {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await api.getEvidence(workspaceId)
      setEvidence(data.evidence || [])
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setError(err.status === 401
          ? 'Session expired. Please sign in again.'
          : 'You do not have access to this workspace.')
      } else if (err.status === 404) {
        setError('Workspace not found.')
      } else {
        setError('Unable to load evidence library. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId, authStatus])

  const handleCreateEvidence = async (evidenceData) => {
    if (!workspaceId) return
    setCreating(true)
    setCreateError(null)
    try {
      const result = await api.createEvidence(workspaceId, evidenceData)
      setEvidence(prev => [result, ...prev])
      setOpenCreate(false)
      setCreateError(null)
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setError(err.status === 401
          ? 'Session expired. Please sign in again.'
          : 'You do not have access to this workspace.')
      } else {
        setCreateError(err.message || 'Failed to create evidence source.')
      }
    } finally {
      setCreating(false)
    }
  }

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

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Evidence Library" description="Manage evidence sources that support approved brand facts." />
        <ErrorState message={error} onRetry={fetchEvidence} />
      </div>
    )
  }

  const hasEvidence = filteredEvidence.length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidence Library"
        description="Manage evidence sources that support approved brand facts. Each evidence record links to one or more approved facts."
        breadcrumbs={[{ label: 'Evidence', href: '#' }]}
      />

      {!hasEvidence && !loading && !error && (
        <EmptyState
          title="No evidence sources yet"
          description="Add your first evidence source to begin linking evidence to approved facts."
          action="Add Evidence Source"
          onAction={() => setOpenCreate(true)}
        />
      )}

      {hasEvidence && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            <Card padding="p-4">
              <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Total evidence</div>
              <div className="text-2xl font-bold text-foreground">{summary.total}</div>
            </Card>
            <Card padding="p-4">
              <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Active</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.active}</div>
            </Card>
            <Card padding="p-4">
              <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Linked to facts</div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">{summary.linked}</div>
            </Card>
            <Card padding="p-4">
              <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Unlinked</div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summary.unlinked}</div>
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
                {filteredEvidence.map((item) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {openCreate && (
        <EvidenceCreateDialog
          workspaceId={workspaceId}
          onSave={handleCreateEvidence}
          onClose={() => setOpenCreate(false)}
        />
      )}
    </div>
  )
}

function EvidenceCreateDialog({ workspaceId, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    source_type: 'internal_study',
    summary: '',
    source_url: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const validate = useCallback(() => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.source_type) newErrors.source_type = 'Source type is required'
    if (!formData.summary.trim()) newErrors.summary = 'Summary is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    const payload = {
      title: formData.title.trim(),
      source_type: formData.source_type,
      summary: formData.summary.trim(),
      source_url: formData.source_url.trim() || null,
    }
    onSave(payload)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Add evidence source"
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-lg shadow-lg w-full max-w-2xl p-6 mx-4 md:mx-0">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Add Evidence Source</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Register a new evidence source to link to approved facts.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField
            label="Title"
            required
            error={errors.title}
            helperText="A descriptive name for this evidence source"
          >
            <FormInput
              id="evidence-title"
              placeholder="e.g. Q3 Energy Efficiency Study"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </FormField>

          <FormField
            label="Source Type"
            required
            error={errors.source_type}
          >
            <FormSelect
              id="evidence-source-type"
              value={formData.source_type}
              onChange={(e) => setFormData({ ...formData, source_type: e.target.value })}
            >
              <option value="internal_study">Internal Study</option>
              <option value="third_party_report">Third-Party Report</option>
              <option value="internal_monitoring">Internal Monitoring</option>
              <option value="customer_survey">Customer Survey</option>
              <option value="regulatory_filing">Regulatory Filing</option>
            </FormSelect>
          </FormField>

          <FormField
            label="Summary"
            required
            error={errors.summary}
            helperText="Brief description of what this evidence establishes"
          >
            <FormTextarea
              id="evidence-summary"
              rows={3}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            />
          </FormField>

          <FormField
            label="Source URL"
            error={null}
            helperText="Optional URL or reference to the evidence source"
          >
            <FormInput
              id="evidence-source-url"
              placeholder="https://example.com/evidence-source"
              value={formData.source_url}
              onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
            />
          </FormField>

          <CardFooter className="justify-between pt-0 mt-6 border-t border-border">
            <span className="text-xs text-muted-foreground-dark">
              {saving ? 'Saving…' : ''}
            </span>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" disabled={saving} onClick={handleSubmit}>
                {saving ? 'Saving…' : 'Add Evidence Source'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </div>
    </div>
  )
}
