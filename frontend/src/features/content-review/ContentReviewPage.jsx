/**
 * BRANDCORE — Content Review Page
 * Unified content review workflow: submit → analyze → findings → review → version history.
 * Integrates Rahul's modular Content Review components with the canonical
 * design system, Clerk authentication, WorkspaceContext, and backend API.
 *
 * All API calls are workspace-scoped via WorkspaceContext. Real API mode is the
 * default; mock mode requires explicit VITE_USE_MOCK_API=true. Auth errors
 * (401/403) are never silently replaced with mock data.
 */
import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '@/context/WorkspaceContext'
import { api } from '@/services/api'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  ErrorState,
  Skeleton,
  SkeletonRow,
} from '@/components/ui'
import { PageHeader } from '@/components/layout'
import ContentSubmissionForm from './ContentSubmissionForm.jsx'
import FindingsPanel from './FindingsPanel.jsx'
import ReviewDecisionForm from './ReviewDecisionForm.jsx'
import VersionHistory from './VersionHistory.jsx'
import { USE_MOCK_API } from './contentReviewApi.js'

export default function ContentReviewPage() {
  const { workspaceId, authStatus } = useWorkspace()
  const [contentItemId, setContentItemId] = useState(null)
  const [contentVersions, setContentVersions] = useState([])
  const [submission, setSubmission] = useState(null)
  const [findings, setFindings] = useState([])
  const [reviewResult, setReviewResult] = useState(null)
  const [reviewError, setReviewError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [versionLoading, setVersionLoading] = useState(false)

  const fetchContentVersions = useCallback(async () => {
    if (!workspaceId || !contentItemId || authStatus !== 'ready') {
      setVersionLoading(false)
      setLoading(false)
      return
    }

    setLoading(true)
    setVersionLoading(true)
    try {
      const data = await api.getContentVersions(workspaceId, contentItemId)
      setContentVersions(data.versions || [])
      setError(null)
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setError(err.status === 401
          ? 'Session expired. Please sign in again.'
          : 'You do not have access to this workspace.')
      } else if (err.status === 404) {
        // Content item doesn't exist yet — this is an empty state, not an error
        setContentVersions([])
      } else {
        setError('Unable to load content versions. Please try again.')
      }
    } finally {
      setVersionLoading(false)
      setLoading(false)
    }
  }, [workspaceId, contentItemId, authStatus])

  useEffect(() => {
    fetchContentVersions()
  }, [fetchContentVersions])

  const handleSubmitted = useCallback((result) => {
    setSubmission(result)
    setContentItemId(result.content_item_id)
    setReviewResult(null)
    setReviewError(null)
    setAnalysisLoading(true)
    setVersionLoading(true)

    Promise.all([
      api.analyzeContent(workspaceId, result.content_version_id),
      api.getContentVersions(workspaceId, result.content_item_id),
    ])
      .then(([analysis, versionResponse]) => {
        setFindings(analysis.findings || [])
        setContentVersions(versionResponse.versions || [])
        setAnalysisLoading(false)
        setVersionLoading(false)
      })
      .catch((err) => {
        if (err.status === 401 || err.status === 403) {
          setReviewError(err.status === 401
            ? 'Session expired. Please sign in again.'
            : 'You do not have access to this workspace.')
        } else {
          setReviewError('Analysis failed. Please try again.')
        }
        setAnalysisLoading(false)
        setVersionLoading(false)
      })
  }, [workspaceId])

  const handleReview = async (decision) => {
    if (!submission) return
    setReviewError(null)
    try {
      const result = await api.submitReview(workspaceId, submission.content_version_id, decision)
      setReviewResult(result)
      const updated = await api.getContentVersions(workspaceId, submission.content_item_id)
      setContentVersions(updated.versions || [])
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        setReviewError(err.status === 401
          ? 'Session expired. Please sign in again.'
          : 'You do not have access to this workspace.')
      } else {
        setReviewError('The review decision could not be recorded.')
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Content Review" description="Submit content, review AI-extracted claims, and record review decisions." />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="p-4">
              <SkeletonRow className="mb-4" />
              <Skeleton width="60%" height="16px" />
              <Skeleton width="40%" height="16px" className="mt-2" />
            </Card>
          ))}
        </div>
        <div className="h-80">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (authStatus !== 'ready' && !error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Content Review" description="Submit content for review, examine AI-extracted claims and verification findings, and record review decisions." />
        <ErrorState message={error || 'Unable to load content versions'} onRetry={() => {}} />
      </div>
    )
  }

  const showMockBanner = USE_MOCK_API

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Review"
        description="Submit content for review, examine AI-extracted claims and verification findings, and record review decisions."
        breadcrumbs={[{ label: 'Content Review', href: '#' }]}
        actions={[
          <Button key="submit" variant="primary" onClick={() => setSubmission(null)}>
            Submit Content
          </Button>,
        ]}
      />

      {showMockBanner && (
        <Card className="border-amber-700/20 bg-amber-50 dark:bg-amber-900/20">
          <CardBody className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded bg-amber-700 flex items-center justify-center text-white text-xs">!</div>
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Demo mode — content endpoints not yet implemented</p>
                <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                  Mock API is enabled via VITE_USE_MOCK_API=true. Submissions are not persisted.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {!error && !submission && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Submit Content</CardTitle>
              </CardHeader>
              <CardBody>
                <ContentSubmissionForm
                  workspaceId={workspaceId}
                  onSubmitted={handleSubmitted}
                />
              </CardBody>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <div className="flex flex-col items-center justify-center h-full">
              <EmptyState
                title="No content submitted yet"
                description="Submit your first content item to begin the review workflow. Once submitted, content becomes an immutable version."
                action={
                  <Button variant="primary" size="sm" onClick={() => setSubmission(null)}>
                    Submit your first content
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      )}

      {submission && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Content Versions</CardTitle>
              </CardHeader>
              <CardBody>
                {versionLoading && !contentVersions.length ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <SkeletonRow className="mb-4" />
                    <Skeleton width="60%" height="16px" />
                    <Skeleton width="40%" height="16px" className="mt-2" />
                  </div>
                ) : contentVersions.length === 0 ? (
                  <EmptyState
                    title="No versions yet"
                    description="Submit content to create your first version."
                  />
                ) : (
                  <VersionHistory
                    versions={contentVersions}
                    loading={versionLoading}
                    error={null}
                  />
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analysis Findings</CardTitle>
              </CardHeader>
              <CardBody>
                <FindingsPanel
                  findings={findings}
                  loading={analysisLoading}
                  error={reviewError}
                />
              </CardBody>
            </Card>

            {findings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Reviewer Decision</CardTitle>
                </CardHeader>
                <CardBody>
                  <ReviewDecisionForm
                    onSubmit={handleReview}
                    disabled={!!reviewResult}
                    result={reviewResult}
                  />
                  {reviewError && (
                    <p role="alert" className="mt-3 rounded-md border border-red-700/30 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
                      {reviewError}
                    </p>
                  )}
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}

      {error && !submission && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ErrorState message={error} onRetry={fetchContentVersions} />
        </div>
      )}
    </div>
  )
}
