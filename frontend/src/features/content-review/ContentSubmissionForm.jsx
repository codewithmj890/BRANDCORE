/**
 * BRANDCORE — Content Submission Form (M4-01)
 * Integrated from Rahul's Content Review work, adapted to the canonical
 * design system. States: idle → submitting (loading) → success | error.
 * Client-side validation is a convenience only; the server is authoritative.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { BODY_MAX, TITLE_MAX, USE_MOCK_API, submitContent } from './contentReviewApi.js'
import {
  Button,
  FormInput,
  FormTextarea,
} from '@/components/ui'

const FOCUS_RING =
  'focus-ring focus-ring'

export function validateContent({ title, body_text }) {
  const errors = {}
  const t = title.trim()
  const b = body_text.trim()
  if (!t) errors.title = 'Enter a title.'
  else if (t.length > TITLE_MAX) errors.title = `Title must be ${TITLE_MAX} characters or fewer.`
  if (!b) errors.body_text = 'Enter the content to review.'
  else if (b.length > BODY_MAX) errors.body_text = `Content must be ${BODY_MAX.toLocaleString()} characters or fewer.`
  return errors
}

function CharCount({ id, value, max }) {
  const over = value.length > max
  return (
    <p id={id} className={`text-xs mt-1 ${over ? 'text-red-700 dark:text-red-400 font-medium' : 'text-muted-foreground-dark dark:text-muted-foreground-dark'}`}>
      {value.length.toLocaleString()} / {max.toLocaleString()} characters
    </p>
  )
}

function FieldError({ id, message }) {
  if (!message) return null
  return (
    <p id={id} className="text-xs mt-1 text-red-700 dark:text-red-400 font-medium" role="alert">
      <span aria-hidden="true">⚠ </span>
      {message}
    </p>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 rounded-full border-2 border-slate-500/40 border-t-slate-700 animate-spin"
    />
  )
}

function SuccessPanel({ result, onReset, headingRef }) {
  return (
    <section
      role="status"
      aria-labelledby="submit-success-heading"
      className="rounded-lg border border-green-700/30 bg-green-50 dark:bg-green-900/20 p-4"
    >
      <h2
        id="submit-success-heading"
        ref={headingRef}
        tabIndex={-1}
        className={`text-base font-semibold text-green-700 dark:text-green-400 ${FOCUS_RING}`}
      >
        <span aria-hidden="true">✓ </span>Content submitted — version 1 created
      </h2>
      <p className="text-sm text-foreground dark:text-foreground-dark mt-1">
        This content version is now immutable. Any edits will create a new version.
      </p>
      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
        <dt className="text-muted-foreground-dark dark:text-muted-foreground-dark">Content item</dt>
        <dd className="font-mono text-foreground dark:text-foreground-dark break-all">{result.content_item_id}</dd>
        <dt className="text-muted-foreground-dark dark:text-muted-foreground-dark">Content version</dt>
        <dd className="font-mono text-foreground dark:text-foreground-dark break-all">{result.content_version_id}</dd>
        <dt className="text-muted-foreground-dark dark:text-muted-foreground-dark">SHA-256</dt>
        <dd className="font-mono text-foreground dark:text-foreground-dark break-all">{result.sha256_hash}</dd>
        <dt className="text-muted-foreground-dark dark:text-muted-foreground-dark">Submitted</dt>
        <dd className="text-foreground dark:text-foreground-dark">
          <time dateTime={result.created_at}>{new Date(result.created_at).toLocaleString()}</time>
        </dd>
      </dl>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground dark:text-foreground-dark hover:bg-surface-muted dark:hover:bg-surface-muted ${FOCUS_RING}"
      >
        Submit another content item
      </button>
    </section>
  )
}

export default function ContentSubmissionForm({ workspaceId, onSubmitted }) {
  const uid = useId()
  const ids = {
    title: `${uid}-title`,
    titleCount: `${uid}-title-count`,
    titleError: `${uid}-title-error`,
    body: `${uid}-body`,
    bodyCount: `${uid}-body-count`,
    bodyError: `${uid}-body-error`,
    simulate: `${uid}-simulate`,
  }

  const [values, setValues] = useState({ title: '', body_text: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [submitError, setSubmitError] = useState(null)
  const [result, setResult] = useState(null)
  const [simulateError, setSimulateError] = useState(false)

  const titleRef = useRef(null)
  const bodyRef = useRef(null)
  const errorRef = useRef(null)
  const successRef = useRef(null)

  useEffect(() => {
    if (status === 'success') successRef.current?.focus()
    if (status === 'error') errorRef.current?.focus()
  }, [status])

  const submitting = status === 'submitting'

  function handleChange(e) {
    const { name, value } = e.target
    setValues((v) => ({ ...v, [name]: value }))
    if (fieldErrors[name]) setFieldErrors((fe) => ({ ...fe, [name]: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (submitting) return

    const errors = validateContent(values)
    setFieldErrors(errors)
    if (errors.title) return titleRef.current?.focus()
    if (errors.body_text) return bodyRef.current?.focus()

    setStatus('submitting')
    setSubmitError(null)
    try {
      const payload = { title: values.title.trim(), body_text: values.body_text.trim() }
      const res = await submitContent(workspaceId, payload, { simulateError })
      setResult(res)
      setStatus('success')
      onSubmitted?.(res)
    } catch (err) {
      if (err?.code === 'VALIDATION_ERROR' && (err.field === 'title' || err.field === 'body_text')) {
        setFieldErrors({ [err.field]: err.message })
        setStatus('idle')
        return (err.field === 'title' ? titleRef : bodyRef).current?.focus()
      }
      setSubmitError(err?.message || 'Submission failed. Please try again.')
      setStatus('error')
    }
  }

  function handleReset() {
    setValues({ title: '', body_text: '' })
    setFieldErrors({})
    setResult(null)
    setSubmitError(null)
    setStatus('idle')
    setTimeout(() => titleRef.current?.focus(), 0)
  }

  if (status === 'success' && result) {
    return <SuccessPanel result={result} onReset={handleReset} headingRef={successRef} />
  }

  const describedBy = (countId, errorId, hasError) => [countId, hasError ? errorId : null].filter(Boolean).join(' ')

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={submitting} className="space-y-4">
      {status === 'error' && submitError && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className={`rounded-lg border border-red-700/30 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 ${FOCUS_RING}`}
        >
          <p className="font-semibold">
            <span aria-hidden="true">⚠ </span>Submission failed
          </p>
          <p className="mt-0.5">{submitError}</p>
          <p className="mt-0.5 text-xs text-muted-foreground-dark dark:text-muted-foreground-dark">Your text has been kept. You can retry when ready.</p>
        </div>
      )}

      <div>
        <label htmlFor={ids.title} className="block text-sm font-medium text-foreground dark:text-foreground-dark">
          Title <span className="text-muted-foreground-dark dark:text-muted-foreground-dark font-normal">(required)</span>
        </label>
        <FormInput
          ref={titleRef}
          id={ids.title}
          name="title"
          type="text"
          autoComplete="off"
          value={values.title}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={fieldErrors.title ? 'true' : undefined}
          aria-describedby={describedBy(ids.titleCount, ids.titleError, !!fieldErrors.title)}
        />
        <FieldError id={ids.titleError} message={fieldErrors.title} />
        <CharCount id={ids.titleCount} value={values.title} max={TITLE_MAX} />
      </div>

      <div>
        <label htmlFor={ids.body} className="block text-sm font-medium text-foreground dark:text-foreground-dark">
          Content <span className="text-muted-foreground-dark dark:text-muted-foreground-dark font-normal">(required — plain text)</span>
        </label>
        <FormTextarea
          ref={bodyRef}
          id={ids.body}
          name="body_text"
          rows={10}
          value={values.body_text}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={fieldErrors.body_text ? 'true' : undefined}
          aria-describedby={describedBy(ids.bodyCount, ids.bodyError, !!fieldErrors.body_text)}
        />
        <FieldError id={ids.bodyError} message={fieldErrors.body_text} />
        <CharCount id={ids.bodyCount} value={values.body_text} max={BODY_MAX} />
      </div>

      {USE_MOCK_API && (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
          <input
            id={ids.simulate}
            type="checkbox"
            checked={simulateError}
            onChange={(e) => setSimulateError(e.target.checked)}
            disabled={submitting}
            className={`h-4 w-4 ${FOCUS_RING}`}
          />
          <label htmlFor={ids.simulate} className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            Mock only: simulate an API failure
          </label>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={submitting}
          variant="primary"
          size="md"
        >
          {submitting && <Spinner />}
          {submitting ? 'Submitting…' : 'Submit for review'}
        </Button>
        <p className="text-xs text-muted-foreground-dark dark:text-muted-foreground-dark">Submitted content becomes an immutable version.</p>
      </div>

      <p className="sr-only" aria-live="polite">
        {submitting ? 'Submitting content, please wait.' : ''}
      </p>
    </form>
  )
}
