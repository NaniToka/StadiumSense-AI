/**
 * useLivePulse — polls /api/pulse for live crowd density.
 *
 * Uses the new unversioned pulse endpoint written in Prompt 3.
 * Polls every 8 s; provides the worst zone and overall status for
 * the crowd widget and for injecting density context into AI calls.
 */
import { useState, useEffect, useCallback } from 'react'
import type { StadiumPulse, ZonePulse, ZoneStatus } from '../types'
import { pulseApi } from '../services/api'

const POLL_MS = 8_000

interface UseLivePulseReturn {
  pulse: StadiumPulse | null
  isLoading: boolean
  error: string | null
  worstZone: ZonePulse | null
  overallStatus: ZoneStatus
  refresh: () => void
}

export function useLivePulse(stadiumId = 'wc2026-stadium-1'): UseLivePulseReturn {
  const [pulse, setPulse] = useState<StadiumPulse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPulse = useCallback(async () => {
    try {
      const data = await pulseApi.getPulse(stadiumId)
      setPulse(data)
      setError(null)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }, [stadiumId])

  useEffect(() => {
    let cancelled = false
    const wrappedFetch = async () => { if (!cancelled) await fetchPulse() }

    wrappedFetch()
    const interval = setInterval(wrappedFetch, POLL_MS)
    return () => { cancelled = true; clearInterval(interval) }
  }, [fetchPulse])

  const worstZone = pulse
    ? [...pulse.zones].sort((a, b) => b.density_percent - a.density_percent)[0] ?? null
    : null

  const overallStatus: ZoneStatus = pulse?.overall_status ?? 'normal'

  return { pulse, isLoading, error, worstZone, overallStatus, refresh: fetchPulse }
}
