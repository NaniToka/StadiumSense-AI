import type { ZonePulse, ZoneStatus } from '../../types'

const statusColors: Record<ZoneStatus, string> = {
  normal: 'bg-green-100 text-green-800 border-green-300',
  crowded: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  critical: 'bg-red-100 text-red-800 border-red-300',
  closed: 'bg-gray-100 text-gray-500 border-gray-300',
}

const densityBarColor: Record<ZoneStatus, string> = {
  normal: 'bg-green-500',
  crowded: 'bg-yellow-500',
  critical: 'bg-red-500',
  closed: 'bg-gray-400',
}

interface Props {
  zone: ZonePulse
}

export default function ZoneCard({ zone }: Props) {
  return (
    <div className={`rounded-xl border p-4 ${statusColors[zone.status]}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">{zone.name}</h3>
        <span className="text-xs uppercase font-bold tracking-wide">{zone.status}</span>
      </div>
      <div className="w-full bg-white/50 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all ${densityBarColor[zone.status]}`}
          style={{ width: `${zone.density_percent}%` }}
          role="progressbar"
          aria-valuenow={zone.density_percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${zone.name} density`}
        />
      </div>
      <p className="text-xs">
        {zone.current_occupancy.toLocaleString()} / {zone.capacity.toLocaleString()} (
        {zone.density_percent.toFixed(0)}%)
      </p>
    </div>
  )
}
