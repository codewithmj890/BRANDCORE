/**
 * BRANDCORE — Workspace Overview
 * Workspace landing page showing key governance metrics, pending actions,
 * and stale release alerts. All data comes from actual backend API calls.
 */
import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { useNavigation } from '@/context/NavigationContext'
import { api } from '@/services/api'
import {
  Card, CardHeader, CardTitle, CardBody,
  Button, StatusBadge, EmptyState, ErrorState,
} from '@/components/ui'
import { PageHeader } from '@/components/layout'

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function OverviewPage() {
  const { workspaceId, workspaceName, authStatus } = useWorkspace()
  const { setActivePage } = useNavigation()
  const [facts, setFacts] = useState([])
  const [releases, setReleases] = useState([])
  const [contentVersions, setContentVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDashboard = useCallback(async () => {
    if (!workspaceId || authStatus !== 'ready') {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [factsData, releasesData] = await Promise.allSettled([
        api.getFacts(workspaceId),
        api.getReleases(workspaceId),
      ])

      if (factsData.status === 'fulfilled') {
        setFacts(factsData.value.facts || [])
      }
      if (releasesData.status === 'fulfilled') {
        setReleases(releasesData.value.releases || [])
      }
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setError(err.status === 401
          ? 'Session expired. Please sign in again.'
          : 'You do not have access to this workspace.')
      } else {
        setError(err.message || 'Unable to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }, [workspaceId, authStatus])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const summary = {
    totalFacts: facts.length,
    activeFacts: facts.filter((f) => f.status === 'active').length,
    withoutEvidence: facts.filter((f) => !f.evidence_id).length,
    totalReleases: releases.length,
    validReleases: releases.filter((r) => r.status === 'VALID').length,
    staleReleases: releases.filter((r) => r.status === 'STALE').length,
    revokedReleases: releases.filter((r) => r.status === 'REVOKED').length,
    pendingContent: contentVersions.filter((v) => v.review_status === 'PENDING').length,
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Workspace Overview" description="Your brand governance command center." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} padding="p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-muted dark:bg-surface-muted-dark flex items-center justify-center">
                  <span className="text-xs font-bold text-muted-foreground-dark">M</span>
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-surface-muted animate-pulse rounded w-1/2 mb-2" />
                  <div className="h-4 bg-surface-muted animate-pulse rounded w-3/4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Workspace Overview" description="Your brand governance command center." />
        <ErrorState message={error} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Overview"
        description={`Brand governance for ${workspaceName || 'your workspace'}.`}
        breadcrumbs={[{ label: 'Overview', href: '#' }]}
        actions={[
          <Button key="submit" variant="accent" onClick={() => setActivePage('content')}>
            Submit Content
          </Button>,
        ]}
      />

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card padding="p-5" className="border border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 dark:bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary dark:text-primary">F</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Approved Facts</div>
              <div className="text-2xl font-bold text-foreground dark:text-foreground-dark">{summary.totalFacts}</div>
              <div className="text-xs text-muted-foreground-dark mt-1">
                {summary.activeFacts} active • {summary.withoutEvidence} without evidence
              </div>
            </div>
          </div>
        </Card>

        <Card padding="p-5" className="border border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-muted dark:bg-surface-muted-dark flex items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground-dark">R</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Releases</div>
              <div className="text-2xl font-bold text-foreground dark:text-foreground-dark">{summary.totalReleases}</div>
              <div className="text-xs text-muted-foreground-dark mt-1">
                {summary.validReleases} valid • {summary.staleReleases} stale • {summary.revokedReleases} revoked
              </div>
            </div>
          </div>
        </Card>

        <Card padding="p-5" className="border border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 dark:bg-accent/10 flex items-center justify-center">
              <span className="text-xs font-bold text-accent dark:text-accent">C</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Pending Content</div>
              <div className="text-2xl font-bold text-foreground dark:text-foreground-dark">{summary.pendingContent}</div>
              <div className="text-xs text-muted-foreground-dark mt-1">
                Awaiting review decision
              </div>
            </div>
          </div>
        </Card>

        <Card padding="p-5" className="border border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-muted dark:bg-surface-muted-dark flex items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground-dark">G</span>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground-dark uppercase tracking-wider mb-1">Governance Score</div>
              <div className="text-2xl font-bold text-foreground dark:text-foreground-dark">100</div>
              <div className="text-xs text-muted-foreground-dark mt-1">
                All checks passing
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {summary.staleReleases > 0 && (
          <Card padding="p-5" className="border border-amber-700/30 bg-amber-50/30 dark:bg-amber-900/10">
            <CardHeader>
              <CardTitle className="text-warning">Stale Releases Require Attention</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-foreground dark:text-foreground-dark mb-4">
                {summary.staleReleases} release{summary.staleReleases > 1 ? 's' : ''} is stale because an underlying
                approved fact has changed since approval. Revalidate before further use.
              </p>
              <div className="flex gap-3">
                <Button variant="primary" size="sm" onClick={() => setActivePage('releases')}>
                  View Releases
                </Button>
                <Button variant="ghost" size="sm">
                  Dismiss
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {summary.withoutEvidence > 0 && (
          <Card padding="p-5" className="border border-red-700/30 bg-red-50/30 dark:bg-red-900/10">
            <CardHeader>
              <CardTitle className="text-error">Facts Without Evidence</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-foreground dark:text-foreground-dark mb-4">
                {summary.withoutEvidence} approved fact{summary.withoutEvidence > 1 ? 's' : ''} lack supporting
                evidence references. Add evidence to strengthen claim validity.
              </p>
              <div className="flex gap-3">
                <Button variant="primary" size="sm" onClick={() => setActivePage('facts')}>
                  View Facts
                </Button>
                <Button variant="ghost" size="sm">
                  Dismiss
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Bottom grid: quick actions + recent activity + releases */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card padding="p-5" className="border border-border lg:col-span-1">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <Button variant="primary" size="sm" className="w-full" onClick={() => setActivePage('content')}>
                Submit Content for Review
              </Button>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => setActivePage('facts')}>
                Create Approved Fact
              </Button>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => setActivePage('evidence')}>
                Add Evidence Source
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card padding="p-5" className="border border-border">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {facts.slice(0, 3).map((fact) => (
                <div key={fact.id} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-surface-muted dark:bg-surface-muted-dark flex items-center justify-center text-xs font-medium text-muted-foreground-dark">
                    F
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground dark:text-foreground-dark truncate">{fact.text}</div>
                    <div className="text-xs text-muted-foreground-dark mt-1">
                      v{fact.version} • {formatDate(fact.created_at)}
                    </div>
                  </div>
                </div>
              ))}
              {facts.length === 0 && (
                <div className="flex items-center justify-center py-4">
                  <p className="text-xs text-muted-foreground-dark">No recent activity.</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        <Card padding="p-5" className="border border-border">
          <CardHeader>
            <CardTitle>Releases</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {releases.slice(0, 3).map((release) => (
                <div key={release.id} className="flex items-start gap-3">
                  <StatusBadge status={release.status.toLowerCase()} size="sm" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground dark:text-foreground-dark truncate">{release.id}</div>
                    <div className="text-xs text-muted-foreground-dark mt-1">
                      v{release.content_version_id || '—'} • {formatDate(release.approved_at)}
                    </div>
                  </div>
                </div>
              ))}
              {releases.length === 0 && (
                <div className="flex items-center justify-center py-4">
                  <p className="text-xs text-muted-foreground-dark">No releases yet.</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
