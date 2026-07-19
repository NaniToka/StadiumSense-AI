/**
 * AlertFeed — real-time AI-generated operational alert list.
 *
 * Each row shows:
 *   • Severity badge  (CRITICAL / WARNING / INFO) with color and icon
 *   • Zone tag        (if zone_id present)
 *   • Alert message   (bold)
 *   • AI recommendation (collapsible, shown below message)
 *   • Timestamp       (relative)
 *   • Resolve button  (calls parent handler, animates out)
 */
import { useState } from 'react'
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import type { OpsAlert, AlertSeverity } from '../../types'

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { label: string; icon: React.ReactNode; bg: string; border: string; badge: string; text: string }
> = {
  critical: {
    label: 'CRITICAL',
    icon: <AlertOctagon size={14} aria-hidden="true" />,
    bg: 'rgba(248, 113, 113, 0.08)',
    border: 'rgba(248, 113, 113, 0.35)',
    badge: '#f87171',
    text: '#fca5a5',
  },
  warning: {
    label: 'WARNING',
    icon: <AlertTriangle size={14} aria-hidden="true" />,
    bg: 'rgba(251, 191, 36, 0.08)',
    border: 'rgba(251, 191, 36, 0.3)',
    badge: '#fbbf24',
    text: '#fde68a',
  },
  info: {
    label: 'INFO',
    icon: <Info size={14} aria-hidden="true" />,
    bg: 'rgba(99, 179, 237, 0.08)',
    border: 'rgba(99, 179, 237, 0.25)',
    badge: '#63b3ed',
    text: '#90cdf4',
  },
}

// ---------------------------------------------------------------------------
// Relative time formatter
// ---------------------------------------------------------------------------

function relativeTime(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// ---------------------------------------------------------------------------
// Single alert row
// ---------------------------------------------------------------------------

function AlertRow({
  alert,
  onResolve,
}: {
  alert: OpsAlert
  onResolve: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [resolving, setResolving] = useState(false)
  const cfg = SEVERITY_CONFIG[alert.severity]

  const handleResolve = async () => {
    setResolving(true)
    onResolve(alert.alert_id)
  }

  if (resolving) return null

  return (
    <div
      className="rounded-xl p-3 transition-all duration-200 msg-enter"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Top row */}
      <div className="flex items-start gap-2.5">
        {/* Severity icon */}
        <span
          className="mt-0.5 shrink-0"
          style={{ color: cfg.badge }}
          aria-hidden="true"
        >
          {cfg.icon}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span
              className="text-[10px] font-extrabold tracking-widest uppercase px-1.5 py-0.5 rounded"
              style={{ background: `${cfg.badge}22`, color: cfg.badge }}
            >
              {cfg.label}
            </span>
            {alert.zone_id && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={{
                  background: 'rgba(139, 163, 204, 0.12)',
                  color: 'var(--text-secondary)',
                }}
              >
                {alert.zone_id.replace('zone-', '').replace('-', ' ')}
              </span>
            )}
            <span
              className="text-[10px] ml-auto shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              {relativeTime(alert.created_at)}
            </span>
          </div>

          {/* Message */}
          <p
            className="text-sm font-semibold leading-snug"
            style={{ color: cfg.text }}
          >
            {alert.message}
          </p>

          {/* AI recommendation (collapsible) */}
          {alert.ai_recommendation && (
            <>
              <button
                type="button"
                className="flex items-center gap-1 mt-1.5 text-[11px] font-medium transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-controls={`rec-${alert.alert_id}`}
              >
                {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                AI recommendation
              </button>
              {expanded && (
                <p
                  id={`rec-${alert.alert_id}`}
                  className="mt-1.5 text-xs leading-relaxed px-2 py-1.5 rounded-lg"
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    color: 'var(--text-secondary)',
                    borderLeft: `2px solid ${cfg.badge}`,
                  }}
                >
                  💡 {alert.ai_recommendation}
                </p>
              )}
            </>
          )}
        </div>

        {/* Resolve button */}
        <button
          type="button"
          onClick={handleResolve}
          aria-label={`Resolve alert: ${alert.message}`}
          className="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-all duration-150 active:scale-95"
          style={{
            background: 'rgba(0, 230, 118, 0.1)',
            border: '1px solid rgba(0, 230, 118, 0.25)',
            color: 'var(--green-400)',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,230,118,0.2)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,230,118,0.1)')}
        >
          <CheckCircle2 size={12} aria-hidden="true" />
          Resolve
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Alert feed
// ---------------------------------------------------------------------------

interface Props {
  alerts: OpsAlert[]
  onResolve: (alertId: string) => void
  isLoading: boolean
}

export default function AlertFeed({ alerts, onResolve, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl shimmer" />
        ))}
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div
        className="flex items-center justify-center gap-2 py-6 rounded-xl text-sm"
        style={{
          background: 'rgba(0, 230, 118, 0.05)',
          border: '1px solid rgba(0, 230, 118, 0.1)',
          color: 'var(--green-400)',
        }}
        role="status"
      >
        <CheckCircle2 size={16} aria-hidden="true" />
        All clear — no active alerts
      </div>
    )
  }

  return (
    <div
      className="space-y-2 overflow-y-auto scrollbar-none"
      style={{ maxHeight: 380 }}
      role="list"
      aria-label="Active operational alerts"
    >
      {alerts.map((a) => (
        <div key={a.alert_id} role="listitem">
          <AlertRow alert={a} onResolve={onResolve} />
        </div>
      ))}
    </div>
  )
}
