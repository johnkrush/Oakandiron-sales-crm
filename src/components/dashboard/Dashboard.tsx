import { useMemo } from 'react'
import { useApp } from '../../contexts/AppContext'
import { ALL_STATUSES, STATUS_CONFIG, LeadStatus } from '../../types'
import { TrendingUp, Users, MapPin, Calendar, Activity, Target } from 'lucide-react'

// ── Stat card ─────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  accent?: string
  sub?: string
}) {
  return (
    <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-dim">{label}</p>
          <p className="text-3xl font-bold mt-2 tabular-nums" style={{ color: accent ?? '#f0f4ff' }}>
            {value}
          </p>
          {sub && <p className="text-xs text-dim mt-1">{sub}</p>}
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: accent ? `${accent}20` : 'rgba(255,255,255,0.06)' }}
        >
          <Icon size={18} style={{ color: accent ?? 'rgba(240,244,255,0.5)' }} />
        </div>
      </div>
    </div>
  )
}

// ── Status breakdown card ─────────────────────────────────────────
function StatusCard({ status, total }: { status: LeadStatus; total: number }) {
  const { leads, isAdmin, user } = useApp()
  const cfg = STATUS_CONFIG[status]

  const count = leads.filter(
    (l) => l.status === status && (isAdmin || l.assignedRep === user?.name)
  ).length
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div className="glass rounded-2xl p-4 flex items-center gap-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bgStyle }}>
        <span className="w-3 h-3 rounded-full" style={{ background: cfg.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium" style={{ color: 'rgba(240,244,255,0.8)' }}>{cfg.label}</p>
          <p className="text-sm font-bold tabular-nums" style={{ color: cfg.color }}>{count}</p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: cfg.color }}
          />
        </div>
        <p className="text-[10px] text-dim mt-1">{pct}% of total</p>
      </div>
    </div>
  )
}

// ── Close rate bar chart ──────────────────────────────────────────
interface RepStat {
  name: string
  total: number
  interested: number
  rate: number
}

function CloseRateChart({ stats }: { stats: RepStat[] }) {
  const maxRate = Math.max(...stats.map((s) => s.rate), 1)

  if (stats.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-dim">No lead data yet</div>
    )
  }

  return (
    <div className="space-y-3">
      {stats.map((stat, i) => (
        <div key={stat.name} className="flex items-center gap-3">
          {/* Rank */}
          <span
            className="w-5 text-center text-xs font-bold shrink-0"
            style={{ color: i === 0 ? '#1D9E75' : 'rgba(240,244,255,0.3)' }}
          >
            {i + 1}
          </span>

          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ background: `hsl(${(i * 47 + 210) % 360}, 55%, 42%)` }}
          >
            {stat.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
          </div>

          {/* Bar + labels */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-white/80 truncate">{stat.name}</span>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-[10px] text-dim">{stat.interested}/{stat.total}</span>
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: stat.rate >= 50 ? '#1D9E75' : stat.rate >= 25 ? '#BA7517' : 'rgba(240,244,255,0.5)' }}
                >
                  {stat.rate}%
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(stat.rate / maxRate) * 100}%`,
                  background: stat.rate >= 50
                    ? 'linear-gradient(90deg, #1D9E75, #25c48a)'
                    : stat.rate >= 25
                    ? 'linear-gradient(90deg, #BA7517, #e8960d)'
                    : 'rgba(255,255,255,0.25)',
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────
export default function Dashboard() {
  const { leads, isAdmin, user, teamMembers } = useApp()

  const myLeads = isAdmin ? leads : leads.filter((l) => l.assignedRep === user?.name)

  const stats = useMemo(() => {
    const now = Date.now()
    const weekAgo = now - 7 * 86400000
    const addedThisWeek = myLeads.filter((l) => new Date(l.createdAt).getTime() >= weekAgo).length
    const interested = myLeads.filter((l) => l.status === 'interested').length
    const conversionPct = myLeads.length ? Math.round((interested / myLeads.length) * 100) : 0
    const activeReps = new Set(leads.map((l) => l.assignedRep).filter(Boolean)).size
    return { total: myLeads.length, addedThisWeek, interested, conversionPct, activeReps }
  }, [myLeads, leads])

  // Close rate chart data
  const closeRateStats = useMemo<RepStat[]>(() => {
    const repsToShow = isAdmin ? teamMembers : (user ? [user.name] : [])
    return repsToShow
      .map((name) => {
        const repLeads = leads.filter((l) => l.assignedRep === name)
        const interested = repLeads.filter((l) => l.status === 'interested').length
        const total = repLeads.length
        return { name, total, interested, rate: total > 0 ? Math.round((interested / total) * 100) : 0 }
      })
      .filter((s) => s.total > 0)
      .sort((a, b) => b.rate - a.rate || b.total - a.total)
  }, [leads, teamMembers, isAdmin, user])

  const recentLeads = useMemo(
    () => [...myLeads].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5),
    [myLeads]
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-dim mt-0.5">
          {isAdmin ? 'Overview of all team activity' : `Your activity — ${user?.name}`}
        </p>
      </div>

      {/* ── Top stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={isAdmin ? 'Total Leads' : 'Your Leads'}
          value={stats.total}
          icon={MapPin}
          accent="#6366f1"
          sub={isAdmin ? 'across all reps' : 'assigned to you'}
        />
        <StatCard
          label="Added This Week"
          value={stats.addedThisWeek}
          icon={Calendar}
          accent="#1D9E75"
        />
        <StatCard
          label="Interested"
          value={stats.interested}
          icon={TrendingUp}
          accent="#1D9E75"
          sub={`${stats.conversionPct}% close rate`}
        />
        {isAdmin ? (
          <StatCard label="Active Reps" value={stats.activeReps} icon={Users} accent="#378ADD" sub="with leads" />
        ) : (
          <StatCard label="Close Rate" value={`${stats.conversionPct}%`} icon={Target} accent="#1D9E75" sub="interested / total" />
        )}
      </div>

      {/* ── Close rate chart ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target size={15} className="text-white/40" />
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            {isAdmin ? 'Team Close Rates' : 'Your Close Rate'}
          </h2>
        </div>
        <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1.5 text-xs text-dim">
              <span className="w-3 h-1.5 rounded-full bg-[#1D9E75]" />
              ≥ 50% excellent
            </div>
            <div className="flex items-center gap-1.5 text-xs text-dim">
              <span className="w-3 h-1.5 rounded-full bg-[#BA7517]" />
              25–49% good
            </div>
            <div className="flex items-center gap-1.5 text-xs text-dim">
              <span className="w-3 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
              &lt; 25% needs work
            </div>
          </div>
          <CloseRateChart stats={closeRateStats} />
          {closeRateStats.length > 0 && (
            <p className="text-[10px] text-dim mt-4">
              Close rate = Interested leads ÷ Total assigned leads × 100
            </p>
          )}
        </div>
      </div>

      {/* ── Status breakdown ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={15} className="text-white/40" />
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Status Breakdown</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {ALL_STATUSES.map((s) => (
            <StatusCard key={s} status={s} total={myLeads.length} />
          ))}
        </div>
      </div>

      {/* ── Recent activity ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={15} className="text-white/40" />
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Recent Activity</h2>
        </div>
        <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          {recentLeads.length === 0 ? (
            <div className="py-8 text-center text-sm text-dim">No leads yet</div>
          ) : (
            recentLeads.map((lead, i) => {
              const cfg = STATUS_CONFIG[lead.status]
              return (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < recentLeads.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{lead.householdName}</p>
                    <p className="text-xs text-dim truncate">{lead.assignedRep}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
                    <p className="text-[10px] text-dim mt-0.5">
                      {new Date(lead.updatedAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* ── Rep breakdown (admin only) ── */}
      {isAdmin && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-white/40" />
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Leads by Rep</h2>
          </div>
          <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            {Array.from(new Set(leads.map((l) => l.assignedRep).filter(Boolean)))
              .sort()
              .map((rep, i, arr) => {
                const repLeads = leads.filter((l) => l.assignedRep === rep)
                const intCount = repLeads.filter((l) => l.status === 'interested').length
                return (
                  <div
                    key={rep}
                    className="flex items-center gap-4 px-4 py-3"
                    style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    >
                      {rep.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{rep}</p>
                      <p className="text-xs text-dim">{repLeads.length} leads</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: '#1D9E75' }}>{intCount}</p>
                      <p className="text-[10px] text-dim">interested</p>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
