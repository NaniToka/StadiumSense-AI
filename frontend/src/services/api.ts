/**
 * Centralised API client.
 * Base URL resolves to the Vite proxy (/api) in dev,
 * or VITE_API_BASE_URL in production.
 */
import axios from 'axios'
import type {
  FanChatRequest,
  FanChatResponse,
  OpsAlert,
  StadiumPulse,
  SustainabilityMetrics,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

/** Client for versioned API routes (/api/v1/…) */
const v1 = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
})

/** Client for unversioned pulse routes (/api/…) */
const pulse = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// --- Fan Companion ---

export const fanApi = {
  chat: (body: FanChatRequest): Promise<FanChatResponse> =>
    v1.post<FanChatResponse>('/fan/chat', body).then((r) => r.data),
}

// --- Pulse (new /api/pulse endpoint from Prompt 3) ---

export const pulseApi = {
  getPulse: (stadiumId = 'wc2026-stadium-1'): Promise<StadiumPulse> =>
    pulse.get<StadiumPulse>('/pulse', { params: { stadium_id: stadiumId } }).then((r) => r.data),
}

// --- Ops Command Center ---

export const opsApi = {
  /** Legacy versioned pulse endpoint — kept for compatibility */
  getPulse: (stadiumId: string): Promise<StadiumPulse> =>
    v1.get<StadiumPulse>(`/ops/stadium/${stadiumId}/pulse`).then((r) => r.data),

  getAlerts: (stadiumId: string): Promise<OpsAlert[]> =>
    v1.get<OpsAlert[]>(`/ops/stadium/${stadiumId}/alerts`).then((r) => r.data),

  /** Unversioned alerts endpoint (backed by Firestore via pulse simulator) */
  getAlertsLive: (stadiumId = 'wc2026-stadium-1'): Promise<OpsAlert[]> =>
    pulse.get<OpsAlert[]>('/alerts', { params: { stadium_id: stadiumId } }).then((r) => r.data),

  /** Resolve an alert by ID */
  resolveAlert: (alertId: string, stadiumId = 'wc2026-stadium-1'): Promise<void> =>
    pulse.post('/alerts/resolve', { alert_id: alertId, stadium_id: stadiumId }).then(() => undefined),

  getSustainability: (stadiumId: string): Promise<SustainabilityMetrics> =>
    v1
      .get<SustainabilityMetrics>(`/ops/stadium/${stadiumId}/sustainability`)
      .then((r) => r.data),

  /** Unversioned sustainability endpoint (live Firestore data with bin levels) */
  getSustainabilityLive: (stadiumId = 'wc2026-stadium-1'): Promise<SustainabilityMetrics> =>
    pulse.get<SustainabilityMetrics>('/sustainability', { params: { stadium_id: stadiumId } }).then((r) => r.data),

  /** Ask the AI a free-text operational question */
  askAI: (stadiumId: string, context: string): Promise<OpsAlert> =>
    v1
      .post<OpsAlert>('/ops/alerts/generate', { stadium_id: stadiumId, context })
      .then((r) => r.data),
}
