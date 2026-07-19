import type { OpsAlert, AlertSeverity } from '../../types'
import { AlertTriangle, Info, AlertOctagon } from 'lucide-react'

const severityStyles: Record<AlertSeverity, { bg: string; icon: React.ReactNode }> = {
  info: { bg: 'bg-blue-50 border-blue-300 text-blue-800', icon: <Info size={16} /> },
  warning: { bg: 'bg-yellow-50 border-yellow-300 text-yellow-800', icon: <AlertTriangle size={16} /> },
  critical: { bg: 'bg-red-50 border-red-400 text-red-900', icon: <AlertOctagon size={16} /> },
}

interface Props {
  alert: OpsAlert
}

export default function AlertBanner({ alert }: Props) {
  const { bg, icon } = severityStyles[alert.severity]
  return (
    <div className={`flex gap-3 border rounded-lg p-3 text-sm ${bg}`} role="alert">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="font-semibold">{alert.message}</p>
        {alert.ai_recommendation && (
          <p className="mt-1 text-xs opacity-80">💡 {alert.ai_recommendation}</p>
        )}
      </div>
    </div>
  )
}
