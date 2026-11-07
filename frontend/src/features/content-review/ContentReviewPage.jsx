
import { useEffect, useState } from 'react'
import { useWorkspace } from '../../context/WorkspaceContext.jsx'
import ContentSubmissionForm from './ContentSubmissionForm.jsx'
import FindingsPanel from './FindingsPanel.jsx'
import ReviewDecisionForm from './ReviewDecisionForm.jsx'
import VersionHistory from './VersionHistory.jsx'
import {
  analyzeContent,
  getContentVersions,
  submitReview,
  submitContent,
  TITLE_MAX,
  BODY_MAX,
} from './contentReviewApi.js'

export default function ContentReviewPage() {
  const { workspaceId, authStatus } = useWorkspace()

  const [submission, setSubmission] = useState(null)
  const [findings, setFindings] = useState([])
  const [versions, setVersions] = useState([])
  const [state, setState] = useState({ loading: false, error: null })
  const [reviewResult, setReviewResult] = useState(null)
  const [reviewError, setReviewError] = useState(null)
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    if (!submission || !workspaceId) return undefined

    let active = true
    setState({ loading: true, error: null })

    Promise.all([
      analyzeContent(workspaceId, submission.content_version_id),
      getContentVersions(workspaceId, submission.content_item_id),
    ])
      .then(([analysis, history]) => {
        if (!active) return

        setFindings(analysis.findings || [])
        setVersions(history.versions || [])
        setState({ loading: false, error: null })
      })
      .catch((error) => {
        if (active) {
          setState({
            loading: false,
            error: error.message || 'Content analysis failed.',
          })
        }
      })

    return () => {
      active = false
    }
  }, [submission, workspaceId])

  function handleSubmitted(result) {
    setSubmission(result)
    setReviewResult(null)
    setReviewError(null)
  }

  async function handleReview(decision) {
    if (!submission || !workspaceId) return

    setReviewing(true)
    setReviewError(null)

    try {
      const result = await submitReview(
        workspaceId,
        submission.content_version_id,
        decision
      )

      setReviewResult(result)

      const history = await getContentVersions(
        workspaceId,
        submission.content_item_id
      )

      setVersions(history.versions || [])
    } catch (error) {
      setReviewError(
        error.message || 'The review decision could not be recorded.'
      )
    } finally {
      setReviewing(false)
    }
  }

  if (authStatus !== 'ready' || !workspaceId) {
    return (
      <section
        aria-labelledby="content-review-heading"
        className="rounded-lg border border-border bg-surface p-6"
      >
        <h2
          id="content-review-heading"
          className="text-lg font-semibold text-text-primary"
        >
          Content Review
        </h2>
        <p role="status" className="mt-2 text-sm text-slate-600">
          Select an authenticated workspace to review content.
        </p>
      </section>
    )
  }

  return (
    <div className="max-w-3xl space-y-4">
      <section
        aria-labelledby="submit-content-heading"
        className="rounded-lg border border-border bg-surface p-6"
      >
        <h2
          id="submit-content-heading"
          className="text-lg font-semibold text-text-primary"
        >
          Submit content for review
        </h2>

        <p className="mt-1 mb-4 text-sm text-slate-600">
          Paste copy to check against approved facts, evidence, and terminology.
        </p>

        <ContentSubmissionForm
          workspaceId={workspaceId}
          onSubmitted={handleSubmitted}
          submitContent={submitContent}
          titleMax={TITLE_MAX}
          bodyMax={BODY_MAX}
        />
      </section>

      {submission && (
        <>
          <FindingsPanel
            findings={findings}
            loading={state.loading}
            error={state.error}
          />

          <ReviewDecisionForm
            onSubmit={handleReview}
            disabled={reviewing || !!state.error}
            result={reviewResult}
          />

          {reviewError && (
            <p
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
            >
              {reviewError}
            </p>
          )}

          <VersionHistory
            versions={versions}
            loading={state.loading}
            error={state.error}
          />
        </>
      )}
    </div>
  )
}

