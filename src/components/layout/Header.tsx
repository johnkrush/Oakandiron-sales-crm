import { useApp } from '../../contexts/AppContext'
import { MapPin, LogOut } from 'lucide-react'

export default function Header() {
  const { user, logout } = useApp()

  return (
    <header
      className="shrink-0 flex items-center justify-between px-4 h-14 z-30"
      style={{
        background: 'rgba(8,11,18,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo — mobile only (desktop sidebar has it) */}
      <div className="flex items-center gap-2 md:hidden">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          <MapPin size={14} className="text-white" />
        </div>
        <span className="font-bold text-white text-xs tracking-tight leading-tight">OakandIron<br/>Sales</span>
      </div>

      {/* Spacer on desktop */}
      <div className="hidden md:block" />

      {/* User info + logout */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-white leading-none">{user?.name}</p>
          <p className="text-xs text-dim mt-0.5">{user?.role}</p>
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          {user?.name.slice(0, 2).toUpperCase()}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
          title="Sign out"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
