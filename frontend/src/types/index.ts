// ---------------------------------------------------------------------------
// Shared TypeScript types — mirrors backend Pydantic models
// ---------------------------------------------------------------------------

// --- Fan Companion ---

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  /** AI-classified intent, present on assistant messages */
  intent?: string
  /** Short suggested follow-up action */
  suggested_action?: string
}

export interface FanChatRequest {
  message: string
  language: string
  session_id?: string
  history: { role: 'user' | 'assistant'; content: string }[]
  // Context fields for AI personalisation
  location_zone?: string
  accessibility_needs?: string
  crowd_density?: 'low' | 'moderate' | 'high' | 'critical'
}

export interface FanChatResponse {
  reply: string
  session_id: string
  language: string
  intent: string
  suggested_action: string
  suggestions: string[]
}

// --- Ops Command Center ---

export type ZoneStatus = 'normal' | 'crowded' | 'critical' | 'closed'
export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface ZonePulse {
  zone_id: string
  name: string
  capacity: number
  current_occupancy: number
  status: ZoneStatus
  density_percent: number
}

export interface StadiumPulse {
  stadium_id: string
  snapshot_time: string
  zones: ZonePulse[]
  overall_status: ZoneStatus
}

export interface OpsAlert {
  alert_id: string
  severity: AlertSeverity
  zone_id: string | null
  message: string
  ai_recommendation: string
  created_at: string
  resolved: boolean
}

export interface SustainabilityMetrics {
  stadium_id: string
  snapshot_time: string
  energy_kwh: number
  water_liters: number
  waste_kg: number
  carbon_kg_co2e: number
  recycling_percent: number
  /** CO₂e saved by fans who took public transit (from pulse model) */
  carbon_saved_transit_kg?: number
  /** zone_id → bin fill level 0–100% (from pulse model) */
  bin_fill_levels?: Record<string, number>
}

/** AI recommendation response from /api/v1/ops/alerts/generate */
export interface OpsAIResponse {
  alert_id: string
  severity: AlertSeverity
  zone_id: string | null
  message: string
  ai_recommendation: string
  created_at: string
  resolved: boolean
}
