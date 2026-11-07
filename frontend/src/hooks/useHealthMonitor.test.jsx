/**
 * BRANDCORE — useHealthMonitor regression tests
 *
 * Covers:
 *   1. Initial health check on mount
 *   2. Successful response → 'connected'
 *   3. Backend unavailable → 'offline' → 'unavailable' after 3 failures
 *   4. Sequential polling (no overlapping requests)
 *   5. Hanging request — no retry while in flight
 *   6. Cleanup on unmount (no state updates after unmount)
 *   7. Rerender does not create additional polling loops
 *   8. Backoff on failure (60s vs 30s success interval)
 *   9. 401/403 treated as connected (auth errors, not backend offline)
 *   10. Polling stops on unmount — no timers pending
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHealthMonitor } from './useHealthMonitor'

vi.mock('../services/api.js', () => ({
  api: {
    health: vi.fn(),
  },
  onBackendStatusChange: vi.fn(() => vi.fn()),
}))

import { api, onBackendStatusChange } from '../services/api.js'

const mockHealth = vi.mocked(api.health)
const mockOnBackendStatusChange = vi.mocked(onBackendStatusChange)

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('useHealthMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockHealth.mockReset()
    mockOnBackendStatusChange.mockReset()
    mockOnBackendStatusChange.mockReturnValue(vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('1. performs an initial health check on mount', () => {
    mockHealth.mockResolvedValue({ status: 'ok' })
    renderHook(() => useHealthMonitor())
    expect(mockHealth).toHaveBeenCalledTimes(1)
  })

  it('2. sets status to connected on successful response', async () => {
    mockHealth.mockResolvedValue({ status: 'ok' })
    const { result } = renderHook(() => useHealthMonitor())

    expect(result.current).toBe('checking')

    await flush()
    expect(result.current).toBe('connected')
  })

  it('3. sets status to offline on backend failure', async () => {
    mockHealth.mockRejectedValue({ status: 500, message: 'Internal server error' })
    const { result } = renderHook(() => useHealthMonitor())

    await flush()
    expect(result.current).toBe('offline')
  })

  it('3b. marks status as unavailable after 3 consecutive failures', async () => {
    mockHealth.mockRejectedValue({ status: 500, message: 'Internal server error' })
    const { result } = renderHook(() => useHealthMonitor())

    await flush()
    expect(result.current).toBe('offline')
    expect(mockHealth).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(60000)
    })
    await flush()
    expect(result.current).toBe('offline')
    expect(mockHealth).toHaveBeenCalledTimes(2)

    act(() => {
      vi.advanceTimersByTime(60000)
    })
    await flush()
    expect(result.current).toBe('unavailable')
    expect(mockHealth).toHaveBeenCalledTimes(3)
  })

  it('4. does not create overlapping requests (sequential polling)', async () => {
    let firstResolve
    mockHealth.mockImplementation(() => new Promise((resolve) => { firstResolve = resolve }))

    const { result } = renderHook(() => useHealthMonitor())

    expect(mockHealth).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(mockHealth).toHaveBeenCalledTimes(1)

    act(() => {
      firstResolve({ status: 'ok' })
    })
    await flush()
    expect(result.current).toBe('connected')

    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(mockHealth).toHaveBeenCalledTimes(2)
  })

  it('5. handles hanging request — no retry while in flight', () => {
    mockHealth.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useHealthMonitor())

    expect(mockHealth).toHaveBeenCalledTimes(1)
    expect(result.current).toBe('checking')

    act(() => {
      vi.advanceTimersByTime(60000)
    })
    expect(mockHealth).toHaveBeenCalledTimes(1)
    expect(result.current).toBe('checking')
  })

  it('6. cleans up on unmount — no state updates after unmount', () => {
    let firstResolve
    mockHealth.mockImplementation(() => new Promise((resolve) => { firstResolve = resolve }))

    const { result, unmount } = renderHook(() => useHealthMonitor())

    unmount()

    act(() => {
      firstResolve({ status: 'ok' })
    })

    expect(result.current).toBe('checking')
    expect(mockHealth).toHaveBeenCalledTimes(1)
  })

  it('7. rerender does not create additional polling loops', () => {
    mockHealth.mockResolvedValue({ status: 'ok' })
    const { result, rerender } = renderHook(() => useHealthMonitor())

    expect(mockHealth).toHaveBeenCalledTimes(1)

    rerender()
    rerender()
    rerender()

    expect(mockHealth).toHaveBeenCalledTimes(1)
  })

  it('8. backoff on failure: 60s delay vs 30s success delay', async () => {
    mockHealth.mockRejectedValue({ status: 500, message: 'Error' })
    const { result } = renderHook(() => useHealthMonitor())

    await flush()
    expect(result.current).toBe('offline')
    expect(mockHealth).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(mockHealth).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(30000)
    })
    await flush()
    expect(mockHealth).toHaveBeenCalledTimes(2)
  })

  it('8b. success interval is 30s', async () => {
    mockHealth.mockResolvedValue({ status: 'ok' })
    const { result } = renderHook(() => useHealthMonitor())

    await flush()
    expect(result.current).toBe('connected')

    act(() => {
      vi.advanceTimersByTime(30000)
    })
    expect(mockHealth).toHaveBeenCalledTimes(2)
  })

  it('9. treats 401/403 as connected (auth errors, not backend offline)', async () => {
    mockHealth.mockRejectedValue({ status: 401, message: 'Unauthorized' })
    const { result } = renderHook(() => useHealthMonitor())

    await flush()
    expect(result.current).toBe('connected')
  })

  it('10. polling stops on unmount — no timers pending', () => {
    mockHealth.mockResolvedValue({ status: 'ok' })
    const { unmount } = renderHook(() => useHealthMonitor())

    unmount()

    expect(vi.getTimerCount()).toBe(0)
  })
})
