/**
 * CrowdWidget — compact live crowd status bar shown above the chat.
 *
 * Shows the busiest zone with an animated density bar and a LIVE badge.
 * Collapses gracefully when data is unavailable.
 */
import type { StadiumPulse, ZoneStatus } from '../../types'
import type { Strings } from '../../i18n/strings'

const STATUS_COLOR: Record<ZoneStatus, string> = {
  normal:   'var(--green-400)',
  crowded:  '#fbbf24',
  critical: '#f87171',
  closed:   'var(--text-muted)',
}

const STATUS_BG: Record<ZoneStatus, string> = {
  normal:   'rgba(0, 230, 118, 0.12)',
  crowded:  'rgba(251, 191, 36, 0.12)',
  critical: 'rgba(248, 113, 113, 0.12)',
  closed:   'rgba(74, 99, 136, 0.12)',
}

interface Props {
  pulse: StadiumPulse | null
  isLoading: boolean
  error: string | null
  strings: Strings
}

export default function CrowdWidget({ pulse, isLoading, error, strings }: Props) {
  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--navy-700)' }}
        aria-live="polite"
        aria-label={strings.crowdLoading}
      >
        <div className="shimmer h-3 rounded-full w-24" style={{ background: 'var(--navy-700)' }} />
        <div className="shimmer h-3 rounded-full w-16" style={{ background: 'var(--navy-700)' }} />
      </div>
    )
  }

  if (error || !pulse) {
    return (
      <div
        className="px-3 py-2 text-xs"
        style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--navy-700)' }}
        role="status"
      >
        {strings.crowdError}
      </div>
    )
  }

  // Show the busiest zone prominently + sparklines for all 6
  const sorted = [...pulse.zones].sort((a, b) => b.density_percent - a.density_percent)
  const busiest = sorted[0]

  const statusLabel: Record<ZoneStatus, string> = {
    normal:   strings.zoneNormal,
    crowded:  strings.zoneCrowded,
    critical: strings.zoneCritical,
    closed:   'Closed',
  }

  return (
    <div
      className="px-3 py-2"
      style={{ borderBottom: '1px solid var(--navy-700)' }}
      role="region"
      aria-label={strings.crowdWidget}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          {strings.crowdWidget}
        </span>

        {/* LIVE badge with pulsing ring */}
        <span className="relative flex items-center gap-1.5" aria-label="Live data">
          <span className="relative flex h-2 w-2">
            <span
              className="live-ring absolute inline-flex h-full w-full rounded-full"
              style={{ background: 'var(--green-400)' }}
              aria-hidden="true"
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: 'var(--green-400)' }}
              aria-hidden="true"
            />
          </span>
          <span
            className="text-[10px] font-bold tracking-widest"
            style={{ color: 'var(--green-400)' }}
          >
            {strings.liveLabel}
          </span>
        </span>
      </div>

      {/* Zone sparklines */}
      <div className="flex flex-col gap-1">
        {sorted.map((zone) => (
          <div key={zone.zone_id} className="flex items-center gap-2">
            <span
              className="text-[10px] w-24 truncate shrink-0"
              style={{ color: 'var(--text-secondary)' }}
              title={zone.name}
            >
              {zone.name}
            </span>
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--navy-700)' }}
              role="progressbar"
              aria-valuenow={zone.density_percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${zone.name}: ${zone.density_percent.toFixed(0)}%`}
            >
              <div
                className="h-full rounded-full density-bar"
                style={{
                  width: `${zone.density_percent}%`,
                  background: STATUS_COLOR[zone.status],
                  boxShadow: zone.status === 'critical'
                    ? '0 0 6px rgba(248, 113, 113, 0.6)'
                    : zone.status === 'crowded'
                      ? '0 0 6px rgba(251, 191, 36, 0.5)'
                      : 'none',
                }}
              />
            </div>
            <span
              className="text-[10px] font-semibold w-8 text-right shrink-0"
              style={{ color: STATUS_COLOR[zone.status] }}
            >
              {zone.density_percent.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Busiest zone call-out */}
      {busiest && busiest.status !== 'normal' && (
        <div
          className="mt-2 flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] font-medium"
          style={{
            background: STATUS_BG[busiest.status],
            border: `1px solid ${STATUS_COLOR[busiest.status]}33`,
            color: STATUS_COLOR[busiest.status],
          }}
          role="alert"
          aria-live="polite"
        >
          {busiest.status === 'critical' ? '🔴' : '🟡'} {busiest.name} — {statusLabel[busiest.status]}
          &nbsp;({busiest.density_percent.toFixed(0)}%)
        </div>
      )}
    </div>
  )
}
