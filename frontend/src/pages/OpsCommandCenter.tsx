/**
 * OpsCommandCenter — control-room dashboard for FIFA World Cup 2026 organizers.
 *
 * Layout (responsive grid):
 * ┌──────────────────────┬──────────────────┐
 * │  Header + status bar │                  │
 * ├──────────┬───────────┤                  │
 * │ Heatmap  │  Alerts   │  Ask AI panel    │
 * ├──────────┴───────────┤  (right column   │
 * │  Sustainability      │   on desktop)    │
 * └──────────────────────┴──────────────────┘
 *
 * Auto-refreshes every 7 seconds via useOpsData.
 * No full page reload — all state managed in React.
 */
import { useState } from 'react'
import { RefreshCw, Radio } from 'lucide-react'

import { useOpsData } from '../hooks/useOpsData'
import StadiumHeatmap from '../components/ops/StadiumHeatmap'
import AlertFeed from '../components/ops/AlertFeed'
import SustainabilityPanel from '../components/ops/SustainabilityPanel'
import AskAIPanel from '../components/ops/AskAIPanel'
// import AboutCard from '../components/shared/AboutCard'  // temporarily disabled

const STADIUM_ID = 'wc2026-stadium-1'

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  badge,
  badgeColor = 'var(--text-muted)',
}: {
  title: string
  badge?: string
  badgeColor?: string
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <h2
        className="text-[11px] font-extrabold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        {title}
      </h2>
      {badge && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{
            background: `${badgeColor}22`,
            color: badgeColor,
          }}
        >
          {badge}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stat pill in the header bar
// ---------------------------------------------------------------------------

function HeaderStat({
  label,
  value,
  color = 'var(--text-secondary)',
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="text-base font-extrabold leading-none"
        style={{ color }}
      >
        {value}
      </span>
      <span
        className="text-[10px] leading-none uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OpsCommandCenter() {
  const { pulse, alerts, sustainability, isLoading, lastUpdated, error, resolveAlert, refresh } =
    useOpsData()

  const [selectedZone, setSelectedZone] = useState<string | null>(null)

  // Compute header stats from live pulse
  const criticalCount = pulse?.zones.filter((z) => z.status === 'critical').length ?? 0
  const crowdedCount = pulse?.zones.filter((z) => z.status === 'crowded').length ?? 0
  const totalFans = pulse?.zones.reduce((s, z) => s + z.current_occupancy, 0) ?? 0
  const activeAlerts = alerts.length

  const lastUpdatedStr = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—'

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--navy-950)', color: 'var(--text-primary)' }}
    >
      {/* ── Top status bar ──────────────────────────────── */}
      <div
        className="px-4 py-3 shrink-0"
        style={{
          background: 'var(--navy-900)',
          borderBottom: '1px solid var(--navy-700)',
        }}
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: title */}
          <div>
            <h1
              className="font-extrabold text-base tracking-tight leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              🎛️ Ops Command Center
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {STADIUM_ID} &mdash; FIFA World Cup 2026
            </p>
          </div>

          {/* Centre: live KPIs */}
          <div className="flex items-center gap-5">
            <HeaderStat label="Total Fans" value={totalFans.toLocaleString()} />
            <div
              className="w-px h-6 shrink-0"
              style={{ background: 'var(--navy-700)' }}
              aria-hidden="true"
            />
            <HeaderStat
              label="Critical Zones"
              value={String(criticalCount)}
              color={criticalCount > 0 ? '#f87171' : 'var(--green-400)'}
            />
            <HeaderStat
              label="Busy Zones"
              value={String(crowdedCount)}
              color={crowdedCount > 0 ? '#fbbf24' : 'var(--text-secondary)'}
            />
            <HeaderStat
              label="Active Alerts"
              value={String(activeAlerts)}
              color={activeAlerts > 0 ? '#fbbf24' : 'var(--green-400)'}
            />
          </div>

          {/* Right: refresh + LIVE badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-label="Live data">
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
                LIVE
              </span>
            </div>

            <span
              className="text-[10px] font-mono"
              style={{ color: 'var(--text-muted)' }}
              aria-label={`Last updated at ${lastUpdatedStr}`}
            >
              {lastUpdatedStr}
            </span>

            <button
              type="button"
              onClick={refresh}
              aria-label="Refresh data"
              disabled={isLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-95 disabled:opacity-40"
              style={{
                background: 'var(--chip-bg)',
                border: '1px solid var(--chip-border)',
                color: 'var(--green-400)',
              }}
            >
              <RefreshCw
                size={12}
                aria-hidden="true"
                className={isLoading ? 'animate-spin' : ''}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Error banner ────────────────────────────────── */}
      {error && (
        <div
          className="mx-4 mt-3 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2"
          style={{
            background: 'rgba(248, 113, 113, 0.1)',
            border: '1px solid rgba(248, 113, 113, 0.3)',
            color: '#fca5a5',
          }}
          role="alert"
        >
          <Radio size={13} aria-hidden="true" />
          Backend connection error — data may be stale. {error}
        </div>
      )}

      {/* ── Main grid ───────────────────────────────────── */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* Left + centre column (spans 2/3 on desktop) */}
          <div className="lg:col-span-2 flex flex-col gap-4">

            {/* Heatmap + Alerts row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* SVG Heatmap */}
              <section
                className="rounded-2xl p-4"
                style={{
                  background: 'var(--navy-800)',
                  border: '1px solid var(--navy-700)',
                }}
                aria-labelledby="heatmap-heading"
              >
                <SectionHeader
                  title="Stadium Density Map"
                  badge={pulse ? 'LIVE' : undefined}
                  badgeColor="var(--green-400)"
                />
                {isLoading && !pulse ? (
                  <div className="h-64 rounded-xl shimmer" />
                ) : pulse ? (
                  <StadiumHeatmap
                    zones={pulse.zones}
                    onZoneClick={setSelectedZone}
                    selectedZoneId={selectedZone}
                  />
                ) : (
                  <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No zone data
                  </p>
                )}
              </section>

              {/* Alert feed */}
              <section
                className="rounded-2xl p-4"
                style={{
                  background: 'var(--navy-800)',
                  border: '1px solid var(--navy-700)',
                }}
                aria-labelledby="alerts-heading"
              >
                <SectionHeader
                  title="Active Alerts"
                  badge={activeAlerts > 0 ? String(activeAlerts) : undefined}
                  badgeColor={
                    alerts.some((a) => a.severity === 'critical')
                      ? '#f87171'
                      : '#fbbf24'
                  }
                />
                <AlertFeed
                  alerts={alerts}
                  onResolve={resolveAlert}
                  isLoading={isLoading && alerts.length === 0}
                />
              </section>
            </div>

            {/* Sustainability panel */}
            <section
              className="rounded-2xl p-4"
              style={{
                background: 'var(--navy-800)',
                border: '1px solid var(--navy-700)',
              }}
              aria-labelledby="sustainability-heading"
            >
              <SectionHeader
                title="Sustainability Metrics"
                badge="Session"
                badgeColor="var(--green-400)"
              />
              {isLoading && !sustainability ? (
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-20 rounded-xl shimmer" />
                  ))}
                </div>
              ) : sustainability ? (
                <SustainabilityPanel metrics={sustainability} />
              ) : (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                  No sustainability data
                </p>
              )}
            </section>
          </div>

          {/* Right column — Ask AI */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-4">
            <section aria-labelledby="ask-ai-heading">
              <SectionHeader
                title="Ask AI"
                badge="Powered by Gemini"
                badgeColor="var(--green-400)"
              />
              <AskAIPanel />
            </section>

            {/* Zone detail card — shown when a zone is selected on the map */}
            {selectedZone && pulse && (() => {
              const zone = pulse.zones.find((z) => z.zone_id === selectedZone)
              if (!zone) return null
              const statusColor =
                zone.status === 'critical' ? '#f87171'
                : zone.status === 'crowded' ? '#fbbf24'
                : 'var(--green-400)'
              return (
                <div
                  className="rounded-2xl p-4 msg-enter"
                  style={{
                    background: 'var(--navy-800)',
                    border: `1px solid ${statusColor}44`,
                  }}
                  aria-live="polite"
                  aria-label={`Zone detail for ${zone.name}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-sm font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {zone.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedZone(null)}
                      aria-label="Close zone detail"
                      className="text-[11px] px-2 py-0.5 rounded"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      ✕
                    </button>
                  </div>
                  {/* Density bar */}
                  <div
                    className="w-full h-2 rounded-full overflow-hidden mb-2"
                    style={{ background: 'var(--navy-700)' }}
                    role="progressbar"
                    aria-valuenow={zone.density_percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${zone.name} density`}
                  >
                    <div
                      className="h-full rounded-full density-bar"
                      style={{ width: `${zone.density_percent}%`, background: statusColor }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {zone.current_occupancy.toLocaleString()} /{' '}
                      {zone.capacity.toLocaleString()} fans
                    </span>
                    <span style={{ color: statusColor, fontWeight: 700 }}>
                      {zone.density_percent.toFixed(0)}% &mdash;{' '}
                      {zone.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* ── About / attribution footer ───────────────────── */}
      {/* <AboutCard /> temporarily disabled */}
    </div>
  )
}
