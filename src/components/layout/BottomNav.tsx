import { useApp } from '../../contexts/AppContext'
import { View } from '../../types'
import { MapPin, List, LayoutDashboard, Settings } from 'lucide-react'

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

export default function BottomNav() {
  const { currentView, setCurrentView, isAdmin } = useApp()

  const visibleNav = NAV.filter((item) => !item.adminOnly || isAdmin)

  return (
    <nav
      className="md:hidden flex items-center shrink-0 z-30"
      style={{
        height: 'calc(64px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'rgba(8,11,18,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {visibleNav.map(({ view, label, icon: Icon }) => {
        const active = currentView === view
        return (
          <button
            key={view}
            onClick={() => setCurrentView(view)}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all active:scale-95"
            style={{ color: active ? '#a5b4fc' : 'rgba(240,244,255,0.35)' }}
            aria-label={label}
          >
            <div
              className="flex items-center justify-center w-11 h-7 rounded-xl transition-all"
              style={{ background: active ? 'rgba(99,102,241,0.2)' : 'transparent' }}
            >
              <Icon size={19} />
            </div>
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
