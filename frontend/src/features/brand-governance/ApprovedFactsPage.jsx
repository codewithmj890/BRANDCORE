/**
 * BRANDCORE — Approved Facts Page
 * Brand governance workspace for managing approved facts with scope, qualifier,
 * evidence relationships, and validity information.
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
  FormField, FormInput, FormTextarea, FormSelect,
} from '@/components/ui'
import { PageHeader } from '@/components/layout'
import { DEMO_FACTS, DEMO_WORKSPACE } from './__mocks__/demo-data'

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function ApprovedFactsPage() {
  const { workspaceId, authStatus } = useWorkspace()
  const [facts, setFacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [demoMode, setDemoMode] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [editingFact, setEditingFact] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchFacts = useCallback(async () => {
    if (!workspaceId || authStatus !== 'ready') {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await api.getFacts(workspaceId)
      setFacts(data.facts || [])
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
        // Backend endpoint not yet implemented — fall back to clearly labeled demo data
        setDemoMode(true)
        setFacts(DEMO_FACTS)
        setError(null)
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId, authStatus])

  useEffect(() => {
    fetchFacts()
  }, [fetchFacts])

  const filteredFacts = facts.filter((fact) => {
    const matchesSearch = fact.text.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || fact.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreate = () => {
    setEditingFact(null)
    setOpenForm(true)
  }

  const handleEdit = (fact) => {
    setEditingFact(fact)
    setOpenForm(true)
  }

  const handleCloseForm = () => {
    setOpenForm(false)
    setEditingFact(null)
  }

  const handleSaveFact = async (factData) => {
    if (!workspaceId) return

    try {
      if (editingFact) {
        setDemoMode(true)
      } else {
        const result = await api.createFact(workspaceId, factData)
        setFacts([result, ...facts])
      }
      handleCloseForm()
      fetchFacts()
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setError(err.status === 401
          ? 'Session expired. Please sign in again.'
          : 'You do not have access to this workspace.')
      } else {
        setDemoMode(true)
      }
      handleCloseForm()
      fetchFacts()
    }
  }

  const factSummary = {
    total: facts.length,
    active: facts.filter((f) => f.status === 'active').length,
    withoutEvidence: facts.filter((f) => !f.evidence_id).length,
    expiring: facts.filter((f) => f.scope?.valid_until && new Date(f.scope.valid_until) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).length,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Approved Facts" description="Manage approved brand facts with scope, qualifier, and evidence references." />
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
        <PageHeader title="Approved Facts" description="Manage approved brand facts with scope, qualifier, and evidence references." />
        <ErrorState message={error || 'Unable to load facts'} onRetry={fetchFacts} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approved Facts"
        description="Manage approved brand facts with scope, qualifier, and evidence references."
        breadcrumbs={[{ label: 'Facts', href: '#' }]}
        actions={[
          <Button key="create" variant="primary" onClick={handleCreate}>
            Create Fact
          </Button>,
        ]}
      />

      {demoMode && (
        <Card padding="p-4" className="border-amber-700/20 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-amber-700 flex items-center justify-center text-white text-xs">
              !
            </div>
            <div>
              <p className="text-sm font-medium text-amber-700">Demo mode — backend facts endpoint not yet implemented</p>
              <p className="text-xs text-amber-600 mt-1">
                Displaying fictional demo data. No changes are persisted to the backend.
              </p>
            </div>
          </div>
        </Card>
      )}

      {!demoMode && error && (
        <ErrorState message="Unable to load approved facts" onRetry={fetchFacts} />
      )}

      {!error && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <Card padding="p-4">
            <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Total facts</div>
            <div className="text-2xl font-bold text-foreground">{factSummary.total}</div>
          </Card>
          <Card padding="p-4">
            <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Active</div>
            <div className="text-2xl font-bold text-green-700">{factSummary.active}</div>
          </Card>
          <Card padding="p-4">
            <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Expiring soon</div>
            <div className="text-2xl font-bold text-amber-700">{factSummary.expiring}</div>
          </Card>
          <Card padding="p-4">
            <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Without evidence</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{factSummary.withoutEvidence}</div>
          </Card>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-[320px]">
            <FormField
              label="Search facts"
              helperText="Search by claim text"
            >
              <FormInput
                placeholder="Search claims…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </FormField>
          </div>
          <div className="w-full lg:w-64">
            <FormField label="Filter by status">
              <FormSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="superseded">Superseded</option>
                <option value="retracted">Retracted</option>
              </FormSelect>
            </FormField>
          </div>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-muted text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3 border-b border-border" scope="col">Claim</th>
                <th className="px-4 py-3 border-b border-border" scope="col">Value &amp; Qualifier</th>
                <th className="px-4 py-3 border-b border-border" scope="col">Scope</th>
                <th className="px-4 py-3 border-b border-border" scope="col">Evidence</th>
                <th className="px-4 py-3 border-b border-border text-right" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredFacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <EmptyState
                      title="No facts found"
                      description={search ? 'Try adjusting your search or filters.' : 'Create your first approved fact to get started.'}
                      action={search ? null : 'Create Fact'}
                      onAction={handleCreate}
                    />
                  </td>
                </tr>
              ) : (
                filteredFacts.map((fact) => (
                  <tr key={fact.id} className="bg-surface hover:bg-surface-muted transition-colors group">
                    <td className="px-4 py-3">
                      <div className="text-sm text-foreground font-medium">{fact.text}</div>
                      <div className="text-xs text-muted-foreground-dark mt-1">
                        v{fact.version} • {formatDate(fact.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-foreground">
                        {fact.text.match(/\d+(\.\d+)?%?/)?.[0] || '—'}
                        {fact.qualifier ? ` <span className="text-muted-foreground-dark font-normal">({fact.qualifier})</span>` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-foreground">
                        {fact.scope?.product || '—'}
                      </div>
                      {fact.scope?.region && (
                        <span className="text-xs text-muted-foreground-dark block mt-0.5">{fact.scope.region}</span>
                      )}
                      {fact.scope?.valid_until && (
                        <span className="text-xs text-red-600 dark:text-red-400 block mt-0.5">Expires {formatDate(fact.scope.valid_until)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {fact.evidence_count ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-surface-muted text-xs text-muted-foreground">
                          #{fact.evidence_id?.slice(-3) || '—'}
                          <span className="w-1.5 h-1.5 rounded-full bg-green-700" />
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground-dark">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(fact)}
                        className="w-8 h-8 p-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </Button>
                      <StatusBadge status={fact.status} size="sm" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </>
      )}
      {openForm && (
        <FactFormDialog
          fact={editingFact}
          onSave={handleSaveFact}
          onClose={handleCloseForm}
          demoMode={demoMode}
          workspaceId={workspaceId}
        />
      )}
    </div>
  )
}

function FactFormDialog({ fact, onSave, onClose, demoMode, workspaceId }) {
  const [formData, setFormData] = useState({
    text: fact?.text || '',
    qualifier: fact?.qualifier || '',
    scope: {
      product: fact?.scope?.product || '',
      region: fact?.scope?.region || '',
      valid_until: fact?.scope?.valid_until || '',
    },
    evidence_id: fact?.evidence_id || '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const initialFact = fact

  useEffect(() => {
    if (fact) {
      setFormData({
        text: fact.text || '',
        qualifier: fact.qualifier || '',
        scope: {
          product: fact.scope?.product || '',
          region: fact.scope?.region || '',
          valid_until: fact.scope?.valid_until || '',
        },
        evidence_id: fact.evidence_id || '',
      })
    }
  }, [fact])

  const validate = useCallback(() => {
    const newErrors = {}
    if (!formData.text.trim()) newErrors.text = 'Claim text is required'
    if (formData.text.length > 2000) newErrors.text = 'Claim text must be under 2000 characters'
    if (!formData.evidence_id) newErrors.evidence_id = 'Evidence reference is required'
    if (formData.scope.valid_until && new Date(formData.scope.valid_until) < new Date()) {
      newErrors.scope = 'Valid until date cannot be in the past'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)

    const payload = {
      text: formData.text.trim(),
      qualifier: formData.qualifier || null,
      evidence_id: formData.evidence_id,
      scope: {
        product: formData.scope.product || null,
        region: formData.scope.region || null,
        valid_until: formData.scope.valid_until || null,
      },
    }

    setTimeout(() => {
      setSaving(false)
      onSave(payload)
      setErrors({})
    }, 500)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={initialFact ? 'Edit approved fact' : 'Create approved fact'}
    >
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface border border-border rounded-lg shadow-lg w-full max-w-2xl p-6 mx-4 md:mx-0 animate-slide-in">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {initialFact ? 'Edit Approved Fact' : 'Create Approved Fact'}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {initialFact ? 'Modify claim details and evidence references.' : 'Define a new approved brand fact.'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Claim text"
              required
              error={errors.text}
              helperText="The approved brand claim statement (max 2000 characters)"
            >
              <FormTextarea
                id="fact-text"
                rows={3}
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
              />
            </FormField>

            <div className="flex flex-col">
              <label className="block text-sm font-medium text-foreground mb-1">Numeric value &amp; unit</label>
              <div className="flex gap-2">
                <FormField label="Value" className="mb-0">
                  <FormInput
                    id="fact-value"
                    placeholder="e.g. 30"
                    value={formData.scope.product || ''}
                    onChange={(e) => setFormData({ ...formData, scope: { ...formData.scope, product: e.target.value } })}
                  />
                </FormField>
                <FormField label="Unit" className="mb-0">
                  <FormSelect
                    id="fact-unit"
                    value={formData.scope.region || ''}
                    onChange={(e) => setFormData({ ...formData, scope: { ...formData.scope, region: e.target.value } })}
                  >
                    <option value="">—</option>
                    <option value="percent">%</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </FormSelect>
                </FormField>
              </div>
              {errors.scope && <p className="text-xs text-red-700 dark:text-red-400 mt-1">{errors.scope}</p>}
            </div>
          </div>

          <FormField
            label="Qualifier"
            error={errors.qualifier}
            helperText="Qualifier such as 'up to', 'approximately', 'at least'"
          >
            <FormInput
              id="fact-qualifier"
              placeholder="e.g. up to"
              value={formData.qualifier}
              onChange={(e) => setFormData({ ...formData, qualifier: e.target.value })}
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Valid until"
              error={errors.scope}
              helperText="Optional expiration date for this fact"
            >
              <FormInput
                id="fact-valid-until"
                type="date"
                value={formData.scope.valid_until}
                onChange={(e) => setFormData({ ...formData, scope: { ...formData.scope, valid_until: e.target.value } })}
              />
            </FormField>

            <FormField
              label="Evidence reference"
              required
              error={errors.evidence_id}
              helperText="Select or enter the supporting evidence ID"
            >
              <FormInput
                id="fact-evidence"
                placeholder="e.g. ev_001"
                value={formData.evidence_id}
                onChange={(e) => setFormData({ ...formData, evidence_id: e.target.value })}
              />
            </FormField>
          </div>

          <CardFooter className="justify-between pt-0 mt-6 border-t border-border">
            <span className="text-xs text-muted-foreground-dark">
              {demoMode ? 'Demo mode — changes not persisted' : ''}
            </span>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" disabled={saving} onClick={(e) => { e.preventDefault(); handleSubmit(e) }}>
                {saving ? 'Saving…' : initialFact ? 'Update Fact' : 'Create Fact'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </div>
    </div>
  )
}
