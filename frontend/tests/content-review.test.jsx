import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ContentSubmissionForm from '../src/features/content-review/ContentSubmissionForm.jsx'
import ReviewDecisionForm from '../src/features/content-review/ReviewDecisionForm.jsx'

const submitContent = vi.hoisted(() => vi.fn())

vi.mock('../src/features/content-review/contentReviewApi.js', async () => {
  const actual = await vi.importActual('../src/features/content-review/contentReviewApi.js')
  return { ...actual, submitContent }
})

describe('content submission workflow', () => {
  it('shows validation errors and focuses the invalid title', () => {
    render(<ContentSubmissionForm workspaceId="ws-1" />)
    fireEvent.submit(screen.getByRole('textbox', { name: /title/i }).closest('form'))
    expect(screen.getByText('Enter a title.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^Title \(required\)$/ })).toHaveFocus()
  })

  it('shows loading and then success states', async () => {
    let resolve
    submitContent.mockImplementationOnce(() => new Promise((r) => { resolve = r }))
    render(<ContentSubmissionForm workspaceId="ws-1" onSubmitted={vi.fn()} />)
    fireEvent.change(screen.getByRole('textbox', { name: /^Title \(required\)$/ }), { target: { value: 'Launch' } })
    fireEvent.change(screen.getByRole('textbox', { name: /^Content \(required/ }), { target: { value: 'Approved copy' } })
    fireEvent.click(screen.getByRole('button', { name: /submit for review/i }))
    expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled()
    resolve({
      content_item_id: 'ci-1',
      content_version_id: 'cv-1',
      sha256_hash: 'hash',
      created_at: '2026-01-01T00:00:00Z',
    })
    await waitFor(() => expect(screen.getByRole('heading', { name: /content submitted/i })).toBeInTheDocument())
  })

  it('shows submission errors and preserves the form', async () => {
    submitContent.mockRejectedValueOnce(new Error('Backend unavailable'))
    render(<ContentSubmissionForm workspaceId="ws-1" />)
    fireEvent.change(screen.getByRole('textbox', { name: /^Title \(required\)$/ }), { target: { value: 'Launch' } })
    fireEvent.change(screen.getByRole('textbox', { name: /^Content \(required/ }), { target: { value: 'Approved copy' } })
    fireEvent.click(screen.getByRole('button', { name: /submit for review/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Backend unavailable')
    expect(screen.getByRole('textbox', { name: /^Title \(required\)$/ })).toHaveValue('Launch')
  })
})

describe('review decision workflow', () => {
  it('requires a decision and exposes all choices', () => {
    const onSubmit = vi.fn()
    render(<ReviewDecisionForm onSubmit={onSubmit} />)
    expect(screen.getByLabelText('Approve')).toBeInTheDocument()
    expect(screen.getByLabelText('Request changes')).toBeInTheDocument()
    expect(screen.getByLabelText('Reject')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /record decision/i }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a review decision.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the selected decision and displays confirmation', () => {
    const onSubmit = vi.fn()
    const { rerender } = render(<ReviewDecisionForm onSubmit={onSubmit} />)
    fireEvent.click(screen.getByLabelText('Approve'))
    fireEvent.click(screen.getByRole('button', { name: /record decision/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ decision: 'APPROVED' }))
    rerender(<ReviewDecisionForm onSubmit={onSubmit} result={{ decision: 'APPROVED', created_at: '2026-01-01T00:00:00Z' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('Decision recorded: APPROVED')
  })
})
