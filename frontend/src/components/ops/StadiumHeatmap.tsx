/**
 * StadiumHeatmap — SVG stadium map color-coded by crowd density.
 *
 * Six zones are laid out in a top-down stadium schematic:
 *
 *   ┌──────────────────────────────────┐
 *   │          Main Gate               │   (bottom entry arch)
 *   │   Fan Zone          Parking      │   (large flanking areas)
 *   │        Food Court                │   (center concourse)
 *   │   Metro Hub     VIP Entrance     │   (upper flanks)
 *   └──────────────────────────────────┘
 *
 * Colors:
 *   normal   → #00e676 (electric green)
 *   crowded  → #fbbf24 (amber)
 *   critical → #f87171 (red) + pulsing glow
 *   closed   → #4a6388 (muted)
 *
 * Clicking a zone calls onZoneClick(zone_id).
 */
import type { ZonePulse, ZoneStatus } from '../../types'

const ZONE_COLORS: Record<ZoneStatus, { fill: string; stroke: string; label: string }> = {
  normal:   { fill: 'rgba(0, 230, 118, 0.22)',  stroke: '#00e676', label: '#00e676' },
  crowded:  { fill: 'rgba(251, 191, 36, 0.22)', stroke: '#fbbf24', label: '#fbbf24' },
  critical: { fill: 'rgba(248, 113, 113, 0.3)', stroke: '#f87171', label: '#f87171' },
  closed:   { fill: 'rgba(74, 99, 136, 0.18)',  stroke: '#4a6388', label: '#4a6388' },
}

// SVG zone layout — [id, x, y, w, h, rx, label_x, label_y]
// Coordinate space: 400 × 320 viewBox
type ZoneLayout = {
  id: string
  x: number; y: number; w: number; h: number; rx: number
  lx: number; ly: number
  shortLabel: string
}

const LAYOUT: ZoneLayout[] = [
  // Main Gate — wide arch at the bottom centre
  { id: 'zone-main-gate', x: 110, y: 250, w: 180, h: 56, rx: 28, lx: 200, ly: 278, shortLabel: 'Main Gate' },
  // Fan Zone — large left block
  { id: 'zone-fan-zone',  x: 20,  y: 130, w: 150, h: 105, rx: 14, lx: 95,  ly: 183, shortLabel: 'Fan Zone' },
  // Parking — large right block
  { id: 'zone-parking',   x: 230, y: 130, w: 150, h: 105, rx: 14, lx: 305, ly: 183, shortLabel: 'Parking' },
  // Food Court — center concourse
  { id: 'zone-food-court', x: 120, y: 145, w: 160, h: 75, rx: 12, lx: 200, ly: 183, shortLabel: 'Food Court' },
  // Metro — upper left
  { id: 'zone-metro',     x: 20,  y: 20,  w: 160, h: 95,  rx: 14, lx: 100, ly: 68,  shortLabel: 'Metro Hub' },
  // VIP — upper right
  { id: 'zone-vip',       x: 220, y: 20,  w: 160, h: 95,  rx: 14, lx: 300, ly: 68,  shortLabel: 'VIP Entry' },
]

interface Props {
  zones: ZonePulse[]
  onZoneClick?: (zoneId: string) => void
  selectedZoneId?: string | null
}

export default function StadiumHeatmap({ zones, onZoneClick, selectedZoneId }: Props) {
  const byId = Object.fromEntries(zones.map((z) => [z.zone_id, z]))

  return (
    <div
      className="relative w-full"
      style={{ maxWidth: 420 }}
      role="img"
      aria-label="Stadium crowd density heatmap — 6 zones"
    >
      {/* SVG defs for the critical pulse glow filter */}
      <svg
        viewBox="0 0 400 320"
        className="w-full h-auto"
        aria-hidden="true"
      >
        <defs>
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-amber">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Stadium outer ring */}
        <ellipse
          cx="200" cy="165" rx="195" ry="155"
          fill="none"
          stroke="#0f2a55"
          strokeWidth="2"
        />

        {/* Pitch outline in centre */}
        <rect
          x="140" y="120" width="120" height="80" rx="8"
          fill="rgba(0,230,118,0.04)"
          stroke="#0f2a55"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
        <text x="200" y="161" textAnchor="middle" fontSize="9" fill="#1a3d6e" fontWeight="700">
          ⚽ PITCH
        </text>

        {/* Zone rects */}
        {LAYOUT.map((zone) => {
          const data = byId[zone.id]
          const status: ZoneStatus = data?.status ?? 'closed'
          const pct = data?.density_percent ?? 0
          const colors = ZONE_COLORS[status]
          const isSelected = selectedZoneId === zone.id
          const isCritical = status === 'critical'

          return (
            <g
              key={zone.id}
              onClick={() => onZoneClick?.(zone.id)}
              style={{ cursor: onZoneClick ? 'pointer' : 'default' }}
              role="button"
              aria-label={`${data?.name ?? zone.id}: ${pct.toFixed(0)}% — ${status}`}
              tabIndex={onZoneClick ? 0 : -1}
              onKeyDown={(e) => e.key === 'Enter' && onZoneClick?.(zone.id)}
            >
              {/* Zone background rect */}
              <rect
                x={zone.x}
                y={zone.y}
                width={zone.w}
                height={zone.h}
                rx={zone.rx}
                fill={colors.fill}
                stroke={isSelected ? '#ffffff' : colors.stroke}
                strokeWidth={isSelected ? 2.5 : 1.5}
                filter={isCritical ? 'url(#glow-red)' : status === 'crowded' ? 'url(#glow-amber)' : undefined}
                className={isCritical ? 'critical-zone-pulse' : ''}
              />

              {/* Density fill bar — horizontal strip at bottom of zone */}
              <rect
                x={zone.x + 4}
                y={zone.y + zone.h - 10}
                width={Math.max(0, (zone.w - 8) * pct / 100)}
                height={6}
                rx={3}
                fill={colors.stroke}
                opacity={0.7}
                className="density-bar"
              />

              {/* Zone label */}
              <text
                x={zone.lx}
                y={zone.ly - 8}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill={colors.label}
              >
                {zone.shortLabel}
              </text>

              {/* Density % */}
              <text
                x={zone.lx}
                y={zone.ly + 7}
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fill={colors.label}
              >
                {pct.toFixed(0)}%
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
        {(
          [
            ['normal', 'Clear'],
            ['crowded', 'Busy'],
            ['critical', 'Packed'],
          ] as [ZoneStatus, string][]
        ).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ background: ZONE_COLORS[status].stroke }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
