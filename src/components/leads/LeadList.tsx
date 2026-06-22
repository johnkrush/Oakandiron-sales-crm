import { useState, useMemo } from 'react'
import { useApp } from '../../contexts/AppContext'
import { Lead, LeadStatus, STATUS_CONFIG, ALL_STATUSES } from '../../types'
import { Search, ChevronUp, ChevronDown, MapPin, Phone } from 'lucide-react'

type SortKey = 'notes' | 'address' | 'status' | 'assignedRep' | 'updatedAt'
type SortDir = 'asc' | 'desc'

const STATUS_ORDER: Record<LeadStatus, number> = {
  interested: 0,
  'follow-up': 1,
  'not-home': 2,
  'not-interested': 3,
  'do-not-knock': 4,
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap"
      style={{ background: cfg.bgStyle, color: cfg.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  )
}

export default function LeadList() {
  const { leads, setCurrentView, flyTo, selectLead, activeFilters, toggleFilter, clearFilters, user, isAdmin } = useApp()
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return leads.filter((l) => {
      // Reps only see their own leads in the list; admins see everyone's.
      const mine = isAdmin || l.assignedRep === user?.name
      const matchFilter = activeFilters.length === 0 || activeFilters.includes(l.status)
      const matchQuery =
        !q ||
        l.notes.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q) ||
        l.assignedRep.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        STATUS_CONFIG[l.status].label.toLowerCase().includes(q)
      return mine && matchFilter && matchQuery
    })
  }, [leads, query, activeFilters, isAdmin, user])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'status') {
        cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      } else if (sortKey === 'updatedAt') {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
      } else {
        cmp = (a[sortKey] ?? '').localeCompare(b[sortKey] ?? '')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const handleRowClick = (lead: Lead) => {
    selectLead(lead.id)
    flyTo({ lat: lead.lat, lng: lead.lng, zoom: 17, leadId: lead.id })
    setCurrentView('map')
  }

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? null : sortDir === 'asc'
      ? <ChevronUp size={12} className="shrink-0" />
      : <ChevronDown size={12} className="shrink-0" />

  const thClass = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors"
  const thStyle = { color: 'rgba(240,244,255,0.4)' }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div
        className="shrink-0 px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(8,11,18,0.6)' }}
      >
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 h-9 rounded-xl flex-1 min-w-[200px]"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
        >
          <Search size={14} style={{ color: 'rgba(240,244,255,0.35)' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter leads…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/25 text-white"
          />
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={clearFilters}
            className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: activeFilters.length === 0 ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
              color: activeFilters.length === 0 ? '#a5b4fc' : 'rgba(240,244,255,0.4)',
              border: `1px solid ${activeFilters.length === 0 ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            All
          </button>
          {ALL_STATUSES.map((s) => {
            const cfg = STATUS_CONFIG[s]
            const active = activeFilters.includes(s)
            return (
              <button
                key={s}
                onClick={() => toggleFilter(s)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: active ? cfg.bgStyle : 'rgba(255,255,255,0.05)',
                  color: active ? cfg.color : 'rgba(240,244,255,0.4)',
                  border: `1px solid ${active ? cfg.color + '60' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color, opacity: active ? 1 : 0.5 }} />
                <span className="hidden sm:inline">{cfg.label}</span>
              </button>
            )
          })}
        </div>

        <span className="text-xs text-dim ml-auto">{sorted.length} lead{sorted.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 p-8">
            <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center">
              <Search size={20} className="text-white/20" />
            </div>
            <p className="text-white/30 text-sm">No leads match your filters</p>
          </div>
        ) : (
          <>
          {/* Mobile: tappable card list (no sideways scrolling) */}
          <div className="md:hidden" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {sorted.map((lead) => (
              <div
                key={lead.id}
                onClick={() => handleRowClick(lead)}
                className="px-4 py-3 flex flex-col gap-2 cursor-pointer active:bg-white/5 transition-colors"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{lead.notes || lead.address || '—'}</p>
                    <p className="text-xs text-dim truncate mt-0.5 flex items-center gap-1">
                      <MapPin size={11} className="shrink-0" />
                      {lead.address || '—'}
                    </p>
                  </div>
                  <StatusBadge status={lead.status} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-dim truncate">{lead.assignedRep || '—'}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs font-medium text-indigo-300"
                      >
                        <Phone size={12} /> Call
                      </a>
                    )}
                    <span className="text-xs text-dim">
                      {new Date(lead.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <table className="hidden md:table w-full border-collapse min-w-[640px]">
            <thead
              className="sticky top-0 z-10"
              style={{ background: 'rgba(8,11,18,0.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <tr>
                <th
                  className={thClass}
                  style={thStyle}
                  onClick={() => handleSort('notes')}
                >
                  <span className="flex items-center gap-1">Notes <SortIcon col="notes" /></span>
                </th>
                <th
                  className={`${thClass} hidden md:table-cell`}
                  style={thStyle}
                  onClick={() => handleSort('address')}
                >
                  <span className="flex items-center gap-1">Address <SortIcon col="address" /></span>
                </th>
                <th
                  className={thClass}
                  style={thStyle}
                  onClick={() => handleSort('status')}
                >
                  <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
                </th>
                <th
                  className={`${thClass} hidden sm:table-cell`}
                  style={thStyle}
                  onClick={() => handleSort('assignedRep')}
                >
                  <span className="flex items-center gap-1">Rep <SortIcon col="assignedRep" /></span>
                </th>
                <th
                  className={`${thClass} hidden lg:table-cell`}
                  style={thStyle}
                >
                  Phone
                </th>
                <th
                  className={thClass}
                  style={thStyle}
                  onClick={() => handleSort('updatedAt')}
                >
                  <span className="flex items-center gap-1">Updated <SortIcon col="updatedAt" /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((lead, i) => (
                <tr
                  key={lead.id}
                  onClick={() => handleRowClick(lead)}
                  className="cursor-pointer group transition-colors"
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.07)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'
                  }}
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors max-w-[170px] md:max-w-[280px] truncate">
                        {lead.notes || '—'}
                      </p>
                      {lead.contactName && (
                        <p className="text-xs text-dim mt-0.5">{lead.contactName}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs text-mid max-w-[200px] truncate">{lead.address}</p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-xs text-mid">{lead.assignedRep || '—'}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs text-mid hover:text-white transition-colors"
                      >
                        <Phone size={11} />
                        {lead.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-dim">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-indigo-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-xs text-dim">
                        {new Date(lead.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>
    </div>
  )
}
