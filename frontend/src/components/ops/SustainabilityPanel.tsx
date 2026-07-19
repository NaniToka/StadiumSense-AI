/**
 * SustainabilityPanel — dark-themed sustainability metrics grid.
 *
 * Shows 6 stats: energy, water, waste, carbon emitted, carbon saved
 * (transit), and recycling percent.  Bin fill levels are shown as
 * a compact horizontal bar chart when available.
 */
import { Zap, Droplets, Trash2, Wind, Leaf, Recycle } from 'lucide-react'
import type { SustainabilityMetrics } from '../../types'

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

interface StatTileProps {
  icon: React.ReactNode
  label: string
  value: string
  sublabel?: string
  accent?: string
}

function StatTile({ icon, label, value, sublabel, accent = 'var(--green-400)' }: StatTileProps) {
  return (
    <div
      className="flex flex-col items-start gap-1 p-3 rounded-xl"
      style={{
        background: 'var(--navy-800)',
        border: '1px solid var(--navy-700)',
      }}
    >
      <span style={{ color: accent }} aria-hidden="true">
        {icon}
      </span>
      <span
        className="text-lg font-extrabold leading-none tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </span>
      <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      {sublabel && (
        <span className="text-[10px]" style={{ color: accent, opacity: 0.8 }}>
          {sublabel}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Bin fill chart
// ---------------------------------------------------------------------------

const BIN_ZONE_LABELS: Record<string, string> = {
  'zone-main-gate': 'Main Gate',
  'zone-fan-zone':  'Fan Zone',
  'zone-food-court': 'Food Court',
  'zone-parking':   'Parking',
  'zone-metro':     'Metro Hub',
  'zone-vip':       'VIP Entry',
}

function BinFillChart({ bins }: { bins: Record<string, number> }) {
  const entries = Object.entries(bins).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) return null

  return (
    <div
      className="mt-3 p-3 rounded-xl"
      style={{ background: 'var(--navy-800)', border: '1px solid var(--navy-700)' }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: 'var(--text-muted)' }}
      >
        Waste Bin Fill Levels
      </p>
      <div className="space-y-1.5">
        {entries.map(([zoneId, pct]) => {
          const color = pct >= 85 ? '#f87171' : pct >= 65 ? '#fbbf24' : 'var(--green-400)'
          return (
            <div key={zoneId} className="flex items-center gap-2">
              <span
                className="text-[10px] w-20 shrink-0 truncate"
                style={{ color: 'var(--text-secondary)' }}
              >
                {BIN_ZONE_LABELS[zoneId] ?? zoneId}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--navy-700)' }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${BIN_ZONE_LABELS[zoneId] ?? zoneId} bin: ${pct.toFixed(0)}%`}
              >
                <div
                  className="h-full rounded-full density-bar"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
              <span
                className="text-[10px] font-bold w-7 text-right shrink-0"
                style={{ color }}
              >
                {pct.toFixed(0)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

interface Props {
  metrics: SustainabilityMetrics
}

export default function SustainabilityPanel({ metrics }: Props) {
  const carbonSaved = metrics.carbon_saved_transit_kg ?? 0

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <StatTile
          icon={<Zap size={16} />}
          label="Energy (kWh)"
          value={metrics.energy_kwh.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          accent="#fbbf24"
        />
        <StatTile
          icon={<Droplets size={16} />}
          label="Water (L)"
          value={metrics.water_liters.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          accent="#63b3ed"
        />
        <StatTile
          icon={<Trash2 size={16} />}
          label="Waste (kg)"
          value={metrics.waste_kg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          accent="#f87171"
        />
        <StatTile
          icon={<Wind size={16} />}
          label="CO₂e Emitted (kg)"
          value={metrics.carbon_kg_co2e.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          accent="#f87171"
        />
        <StatTile
          icon={<Leaf size={16} />}
          label="CO₂e Saved via Transit"
          value={carbonSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          sublabel="kg CO₂e saved"
          accent="var(--green-400)"
        />
        <StatTile
          icon={<Recycle size={16} />}
          label="Recycling Rate"
          value={`${metrics.recycling_percent.toFixed(1)}%`}
          accent="var(--green-400)"
        />
      </div>

      {metrics.bin_fill_levels && Object.keys(metrics.bin_fill_levels).length > 0 && (
        <BinFillChart bins={metrics.bin_fill_levels} />
      )}
    </div>
  )
}
