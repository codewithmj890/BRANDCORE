/**
 * BRANDCORE — useHealthMonitor hook
 * Centralized, stable health-check monitoring for the application.
 *
 * Design:
 *   - Sequential polling: next check only after the previous one completes
 *   - No overlapping requests (in-flight guard)
 *   - Exponential backoff on failure (30s success, 60s failure)
 *   - Proper cleanup on unmount (no state updates after unmount)
 *   - No effect dependency on backend status (avoids infinite re-run loop)
 *   - Handles React StrictMode mount/unmount correctly
 *
 * Health states: 'checking' | 'connected' | 'offline' | 'unavailable'
 */
import { useEffect, useRef, useState } from 'react'
import { api, onBackendStatusChange } from '../services/api.js'

const HEALTH_INTERVAL_MS = 30000
const HEALTH_BACKOFF_MS = 60000
const UNAVAILABLE_THRESHOLD = 3

export function useHealthMonitor() {
  const [status, setStatus] = useState('checking')
  const timeoutRef = useRef(null)
  const inFlightRef = useRef(false)
  const mountedRef = useRef(false)
  const consecutiveFailuresRef = useRef(0)

  const clearTimeoutRef = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const scheduleNext = (delayMs) => {
    clearTimeoutRef()
    if (!mountedRef.current) return
    timeoutRef.current = setTimeout(checkHealth, delayMs)
  }

  const checkHealth = async () => {
    if (inFlightRef.current || !mountedRef.current) return
    inFlightRef.current = true

    try {
      await api.health()
      if (!mountedRef.current) return
      consecutiveFailuresRef.current = 0
      setStatus('connected')
      scheduleNext(HEALTH_INTERVAL_MS)
    } catch (err) {
      if (!mountedRef.current) return
      // 401/403 are auth errors, not backend offline — backend is reachable
      if (err.status === 401 || err.status === 403) {
        consecutiveFailuresRef.current = 0
        setStatus('connected')
        scheduleNext(HEALTH_INTERVAL_MS)
        return
      }
      consecutiveFailuresRef.current += 1
      if (consecutiveFailuresRef.current >= UNAVAILABLE_THRESHOLD) {
        setStatus('unavailable')
      } else {
        setStatus('offline')
      }
      scheduleNext(HEALTH_BACKOFF_MS)
    } finally {
      inFlightRef.current = false
    }
  }

  // Initial poll + recursive scheduled polling (runs once on mount)
  useEffect(() => {
    mountedRef.current = true
    checkHealth()
    return () => {
      mountedRef.current = false
      inFlightRef.current = false
      clearTimeoutRef()
    }
  }, [])

  // Listen for backend status changes from other API requests (no effect deps)
  useEffect(() => {
    const unsubscribe = onBackendStatusChange((newStatus) => {
      if (!mountedRef.current) return
      if (newStatus === 'connecting') {
        setStatus('checking')
      } else if (newStatus === 'connected') {
        setStatus('connected')
      } else if (newStatus === 'offline') {
        setStatus('offline')
      }
    })
    return unsubscribe
  }, [])

  return status
}
