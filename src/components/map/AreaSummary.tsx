import type { LatLngBounds } from 'leaflet'
import { Lead, STATUS_CONFIG, ALL_STATUSES } from '../../types'
import { BarChart3 } from 'lucide-react'

interface Props {
  leads: Lead[]
  bounds: LatLngBounds | null
}

export default function AreaSummary({ leads, bounds }: Props) {
  const visible = bounds
    ? leads.filter((l) => bounds.contains([l.lat, l.lng]))
    : leads

  if (visible.length === 0) return null

  const counts = ALL_STATUSES.map((s) => ({
    status: s,
    count: visible.filter((l) => l.status === s).length,
    cfg: STATUS_CONFIG[s],
  })).filter((x) => x.count > 0)

  return (
    <div
      className="rounded-xl p-2 md:p-3 min-w-[108px] md:min-w-[148px] animate-fade-in"
      style={{
        background: 'rgba(8,11,24,0.88)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5 md:mb-2.5">
        <BarChart3 size={11} style={{ color: 'rgba(240,244,255,0.4)' }} />
        <span className="text-[9px] md:text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(240,244,255,0.4)' }}>
          Area · {visible.length} pin{visible.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-1 md:space-y-1.5">
        {counts.map(({ status, count, cfg }) => (
          <div key={status} className="flex items-center justify-between gap-2.5 md:gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
              <span className="text-[11px] md:text-xs" style={{ color: 'rgba(240,244,255,0.65)' }}>{cfg.label}</span>
            </div>
            <span className="text-[11px] md:text-xs font-semibold tabular-nums" style={{ color: cfg.color }}>
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
