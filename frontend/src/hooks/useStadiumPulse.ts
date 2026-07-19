/**
 * useStadiumPulse — polls the backend for live crowd density.
 * TODO: swap polling for Firestore real-time listener or SSE.
 */
import { useState, useEffect } from 'react'
import type { StadiumPulse } from '../types'
import { opsApi } from '../services/api'

const POLL_INTERVAL_MS = 10_000

export function useStadiumPulse(stadiumId: string) {
  const [pulse, setPulse] = useState<StadiumPulse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchPulse = async () => {
      try {
        const data = await opsApi.getPulse(stadiumId)
        if (!cancelled) setPulse(data)
      } catch (err) {
        if (!cancelled) setError(String(err))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchPulse()
    const interval = setInterval(fetchPulse, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [stadiumId])

  return { pulse, isLoading, error }
}
