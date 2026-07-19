/**
 * useOpsData — single hook driving all auto-refreshing data for the Ops dashboard.
 *
 * Polls three endpoints in parallel every POLL_MS milliseconds:
 *   - /api/pulse          (zone crowd density)
 *   - /api/alerts         (active AI-generated alerts)
 *   - /api/sustainability (energy / water / waste / carbon / bin levels)
 *
 * Exposes a `resolveAlert` action that optimistically removes the alert
 * from local state before confirming with the backend.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import type { StadiumPulse, OpsAlert, SustainabilityMetrics } from '../types'
import { pulseApi, opsApi } from '../services/api'

const POLL_MS = 7_000
const STADIUM_ID = 'wc2026-stadium-1'

export interface OpsDataState {
  pulse: StadiumPulse | null
  alerts: OpsAlert[]
  sustainability: SustainabilityMetrics | null
  isLoading: boolean
  lastUpdated: Date | null
  error: string | null
  resolveAlert: (alertId: string) => Promise<void>
  refresh: () => void
}

export function useOpsData(): OpsDataState {
  const [pulse, setPulse] = useState<StadiumPulse | null>(null)
  const [alerts, setAlerts] = useState<OpsAlert[]>([])
  const [sustainability, setSustainability] = useState<SustainabilityMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const fetchAll = useCallback(async () => {
    try {
      const [pulseData, alertsData, susData] = await Promise.all([
        pulseApi.getPulse(STADIUM_ID),
        opsApi.getAlertsLive(STADIUM_ID),
        opsApi.getSustainabilityLive(STADIUM_ID),
      ])
      if (cancelledRef.current) return
      setPulse(pulseData)
      setAlerts(alertsData)
      setSustainability(susData)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      if (!cancelledRef.current) setError(String(err))
    } finally {
      if (!cancelledRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    fetchAll()
    const interval = setInterval(fetchAll, POLL_MS)
    return () => {
      cancelledRef.current = true
      clearInterval(interval)
    }
  }, [fetchAll])

  /** Optimistically remove alert then confirm with server */
  const resolveAlert = useCallback(async (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.alert_id !== alertId))
    try {
      await opsApi.resolveAlert(alertId, STADIUM_ID)
    } catch (err) {
      // On failure, re-fetch to restore state
      console.error('Resolve alert failed:', err)
      await fetchAll()
    }
  }, [fetchAll])

  return {
    pulse,
    alerts,
    sustainability,
    isLoading,
    lastUpdated,
    error,
    resolveAlert,
    refresh: fetchAll,
  }
}
