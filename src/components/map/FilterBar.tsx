import { useApp } from '../../contexts/AppContext'
import { ALL_STATUSES, STATUS_CONFIG } from '../../types'

export default function FilterBar() {
  const { activeFilters, toggleFilter, clearFilters, leads } = useApp()

  const countFor = (status: typeof ALL_STATUSES[number]) =>
    leads.filter((l) => l.status === status).length

  return (
    <div className="flex items-center gap-1 md:gap-1.5 flex-wrap justify-center">
      {/* All button */}
      <button
        onClick={clearFilters}
        className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-medium transition-all active:scale-95"
        style={{
          background: activeFilters.length === 0
            ? 'rgba(99,102,241,0.25)'
            : 'rgba(10,14,28,0.8)',
          border: `1px solid ${activeFilters.length === 0 ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
          color: activeFilters.length === 0 ? '#a5b4fc' : 'rgba(240,244,255,0.5)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
        }}
      >
        All
        <span className="opacity-70">{leads.length}</span>
      </button>

      {ALL_STATUSES.map((status) => {
        const cfg = STATUS_CONFIG[status]
        const active = activeFilters.includes(status)
        const count = countFor(status)
        return (
          <button
            key={status}
            onClick={() => toggleFilter(status)}
            className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full text-[10px] md:text-xs font-medium transition-all active:scale-95"
            style={{
              background: active
                ? `${cfg.bgStyle}`
                : 'rgba(10,14,28,0.8)',
              border: `1px solid ${active ? cfg.color + '80' : 'rgba(255,255,255,0.1)'}`,
              color: active ? cfg.color : 'rgba(240,244,255,0.5)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: cfg.color, opacity: active ? 1 : 0.5 }}
            />
            {cfg.label}
            <span style={{ opacity: 0.7 }}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}
