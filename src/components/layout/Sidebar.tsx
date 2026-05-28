import { useApp } from '../../contexts/AppContext'
import { View } from '../../types'
import { MapPin, List, LayoutDashboard, Settings, LogOut } from 'lucide-react'

interface NavItem {
  view: View
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const NAV: NavItem[] = [
  { view: 'map', label: 'Map', icon: MapPin },
  { view: 'list', label: 'Leads', icon: List },
  { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { view: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
]

export default function Sidebar() {
  const { currentView, setCurrentView, user, isAdmin, logout } = useApp()

  const visibleNav = NAV.filter((item) => !item.adminOnly || isAdmin)

  const roleLabel = user?.role === 'admin' ? 'Team Lead' : 'Sales Rep'

  return (
    <aside
      className="hidden md:flex flex-col w-56 shrink-0 z-20"
      style={{
        background: 'rgba(8,11,18,0.7)',
        backdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <MapPin size={16} className="text-white" />
        </div>
        <span className="font-bold text-white tracking-tight">Canvass</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map(({ view, label, icon: Icon }) => {
          const active = currentView === view
          return (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: active ? '#a5b4fc' : 'rgba(240,244,255,0.45)',
                border: active ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = 'rgba(240,244,255,0.75)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'rgba(240,244,255,0.45)'
                }
              }}
            >
              <Icon size={17} />
              {label}
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '12px' }}>
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{
              background: isAdmin
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'linear-gradient(135deg, #1D9E75, #16845f)',
            }}
          >
            {user?.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-dim truncate">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all mt-1"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
