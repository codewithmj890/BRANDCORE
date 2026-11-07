
import React, { useEffect, useId, useRef, useState } from 'react'
import {
  BODY_MAX,
  TITLE_MAX,
  USE_MOCK_API,
  submitContent,
} from './contentReviewApi.js'

/**
 * BRANDCORE — Content Submission Form (M4-01)
 *
 * States: idle → submitting → success | error.
 * Client-side validation is a convenience only;
 * the server remains authoritative.
 */

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'

export function validateContent({ title, body_text }) {
  const errors = {}
  const t = title.trim()
  const b = body_text.trim()

  if (!t) {
    errors.title = 'Enter a title.'
  } else if (t.length > TITLE_MAX) {
    errors.title = `Title must be ${TITLE_MAX} characters or fewer.`
  }

  if (!b) {
    errors.body_text = 'Enter the content to review.'
  } else if (b.length > BODY_MAX) {
    errors.body_text = `Content must be ${BODY_MAX.toLocaleString()} characters or fewer.`
  }

  return errors
}

function CharCount({ id, value, max }) {
  const over = value.length > max

  return (
    <p
      id={id}
      className={`text-xs mt-1 ${
        over
          ? 'text-red-700 dark:text-red-400 font-medium'
          : 'text-slate-600 dark:text-slate-400'
      }`}
    >
      {value.length.toLocaleString()} / {max.toLocaleString()} characters
    </p>
  )
}

function FieldError({ id, message }) {
  if (!message) return null

  return (
    <p
      id={id}
      className="text-xs mt-1 text-red-700 dark:text-red-400 font-medium"
      role="alert"
    >
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
        <span aria-hidden="true">✓ </span>
        Content submitted — version 1 created
      </h2>

      <p className="text-sm text-text-primary dark:text-text-primary-dark mt-1">
        This content version is now immutable. Any edits will create a new version.
      </p>

      <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
        <dt className="text-slate-600 dark:text-slate-400">
          Content item
        </dt>
        <dd className="font-mono text-text-primary dark:text-text-primary-dark break-all">
          {result.content_item_id}
        </dd>

        <dt className="text-slate-600 dark:text-slate-400">
          Content version
        </dt>
        <dd className="font-mono text-text-primary dark:text-text-primary-dark break-all">
          {result.content_version_id}
        </dd>

        <dt className="text-slate-600 dark:text-slate-400">
          SHA-256
        </dt>
        <dd className="font-mono text-text-primary dark:text-text-primary-dark break-all">
          {result.sha256_hash}
        </dd>

        <dt className="text-slate-600 dark:text-slate-400">
          Submitted
        </dt>
        <dd className="text-text-primary dark:text-text-primary-dark">
          <time dateTime={result.created_at}>
            {new Date(result.created_at).toLocaleString()}
          </time>
        </dd>
      </dl>

      <button
        type="button"
        onClick={onReset}
        className={`mt-4 rounded-md border border-border bg-surface dark:bg-surface-dark px-3 py-2 text-sm font-medium text-text-primary dark:text-text-primary-dark hover:bg-surface-muted dark:hover:bg-surface-muted-dark ${FOCUS_RING}`}
      >
        Submit another content item
      </button>
    </section>
  )
}

export default function ContentSubmissionForm({
  workspaceId,
  onSubmitted,
}) {
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

  const [values, setValues] = useState({
    title: '',
    body_text: '',
  })

  const [fieldErrors, setFieldErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [submitError, setSubmitError] = useState(null)
  const [result, setResult] = useState(null)
  const [simulateError, setSimulateError] = useState(false)

  const titleRef = useRef(null)
  const bodyRef = useRef(null)
  const errorRef = useRef(null)
  const successRef = useRef(null)

  useEffect(() => {
    if (status === 'success') {
      successRef.current?.focus()
    }

    if (status === 'error') {
      errorRef.current?.focus()
    }
  }, [status])

  const submitting = status === 'submitting'

  function handleChange(e) {
    const { name, value } = e.target

    setValues((v) => ({
      ...v,
      [name]: value,
    }))

    if (fieldErrors[name]) {
      setFieldErrors((fe) => ({
        ...fe,
        [name]: undefined,
      }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (submitting) return

    const errors = validateContent(values)

    setFieldErrors(errors)

    if (errors.title) {
      return titleRef.current?.focus()
    }

    if (errors.body_text) {
      return bodyRef.current?.focus()
    }

    setStatus('submitting')
    setSubmitError(null)

    try {
      const payload = {
        title: values.title.trim(),
        body_text: values.body_text.trim(),
      }

      const res = await submitContent(
        workspaceId,
        payload,
        { simulateError }
      )

      setResult(res)
      setStatus('success')
      onSubmitted?.(res)
    } catch (err) {
      // Server validation errors may name a field;
      // surface those errors inline.
      if (
        err?.code === 'VALIDATION_ERROR' &&
        (err.field === 'title' || err.field === 'body_text')
      ) {
        setFieldErrors({
          [err.field]: err.message,
        })

        setStatus('idle')

        return (
          err.field === 'title'
            ? titleRef
            : bodyRef
        ).current?.focus()
      }

      setSubmitError(
        err?.message || 'Submission failed. Please try again.'
      )

      setStatus('error')
    }
  }

  function handleReset() {
    setValues({
      title: '',
      body_text: '',
    })

    setFieldErrors({})
    setResult(null)
    setSubmitError(null)
    setStatus('idle')

    // Return focus to the start of the form after re-render.
    setTimeout(() => titleRef.current?.focus(), 0)
  }

  if (status === 'success' && result) {
    return (
      <SuccessPanel
        result={result}
        onReset={handleReset}
        headingRef={successRef}
      />
    )
  }

  const describedBy = (countId, errorId, hasError) =>
    [countId, hasError ? errorId : null]
      .filter(Boolean)
      .join(' ')

  const inputBase =
    `w-full rounded-md border bg-surface dark:bg-surface-dark px-3 py-2 text-sm text-text-primary dark:text-text-primary-dark placeholder:text-slate-500 disabled:bg-surface-muted disabled:text-slate-500 disabled:cursor-not-allowed ${FOCUS_RING}`

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={submitting}
      className="space-y-4"
    >
      {status === 'error' && submitError && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className={`rounded-lg border border-red-700/30 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400 ${FOCUS_RING}`}
        >
          <p className="font-semibold">
            <span aria-hidden="true">⚠ </span>
            Submission failed
          </p>

          <p className="mt-0.5">{submitError}</p>

          <p className="mt-0.5 text-xs dark:text-slate-400">
            Your text has been kept. You can retry when ready.
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor={ids.title}
          className="block text-sm font-medium text-text-primary dark:text-text-primary-dark"
        >
          Title{' '}
          <span className="text-slate-600 dark:text-slate-400 font-normal">
            (required)
          </span>
        </label>

        <input
          ref={titleRef}
          id={ids.title}
          name="title"
          type="text"
          autoComplete="off"
          value={values.title}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={fieldErrors.title ? 'true' : undefined}
          aria-describedby={describedBy(
            ids.titleCount,
            ids.titleError,
            !!fieldErrors.title
          )}
          className={`mt-1 ${inputBase} ${
            fieldErrors.title ? 'border-red-700' : 'border-border'
          }`}
        />

        <FieldError
          id={ids.titleError}
          message={fieldErrors.title}
        />

        <CharCount
          id={ids.titleCount}
          value={values.title}
          max={TITLE_MAX}
        />
      </div>

      <div>
        <label
          htmlFor={ids.body}
          className="block text-sm font-medium text-text-primary dark:text-text-primary-dark"
        >
          Content{' '}
          <span className="text-slate-600 dark:text-slate-400 font-normal">
            (required — plain text)
          </span>
        </label>

        <textarea
          ref={bodyRef}
          id={ids.body}
          name="body_text"
          rows={10}
          value={values.body_text}
          onChange={handleChange}
          disabled={submitting}
          aria-invalid={fieldErrors.body_text ? 'true' : undefined}
          aria-describedby={describedBy(
            ids.bodyCount,
            ids.bodyError,
            !!fieldErrors.body_text
          )}
          className={`mt-1 resize-y ${inputBase} ${
            fieldErrors.body_text ? 'border-red-700' : 'border-border'
          }`}
        />

        <FieldError
          id={ids.bodyError}
          message={fieldErrors.body_text}
        />

        <CharCount
          id={ids.bodyCount}
          value={values.body_text}
          max={BODY_MAX}
        />
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

          <label
            htmlFor={ids.simulate}
            className="text-xs text-amber-700 dark:text-amber-400 font-medium"
          >
            Mock only: simulate an API failure
          </label>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className={`inline-flex items-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:brightness-95 disabled:bg-surface-muted disabled:text-slate-500 disabled:cursor-not-allowed ${FOCUS_RING}`}
        >
          {submitting && <Spinner />}
          {submitting ? 'Submitting…' : 'Submit for review'}
        </button>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Submitted content becomes an immutable version.
        </p>
      </div>

      <p className="sr-only" aria-live="polite">
        {submitting ? 'Submitting content, please wait.' : ''}
      </p>
    </form>
  )
}

