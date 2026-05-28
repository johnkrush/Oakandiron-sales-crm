import { useState, type FormEvent } from 'react'
import { useApp } from '../../contexts/AppContext'
import { MapPin, Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@canvass.app', password: 'Oakandiron26', role: 'Team Lead' },
  { label: 'Chris', email: 'chris@canvass.app', password: 'canvass123', role: 'Sales Rep' },
  { label: 'Emma', email: 'emma@canvass.app', password: 'canvass123', role: 'Sales Rep' },
  { label: 'Sarah', email: 'sarah@canvass.app', password: 'canvass123', role: 'Sales Rep' },
  { label: 'Mike', email: 'mike@canvass.app', password: 'canvass123', role: 'Sales Rep' },
  { label: 'Lisa', email: 'lisa@canvass.app', password: 'canvass123', role: 'Sales Rep' },
  { label: 'David', email: 'david@canvass.app', password: 'canvass123', role: 'Sales Rep' },
  { label: 'Tom', email: 'tom@canvass.app', password: 'canvass123', role: 'Sales Rep' },
]

export default function LoginScreen() {
  const { login } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAccounts, setShowAccounts] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 500))
    const ok = login(email.trim(), password)
    if (!ok) setError('Invalid email or password.')
    setLoading(false)
  }

  const fillAccount = (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(acc.email)
    setPassword(acc.password)
    setError('')
    setShowAccounts(false)
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center px-4 overflow-hidden bg-[#080b12]">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="relative z-10 w-full max-w-[400px] animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            <MapPin size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OakandIron Sales</h1>
          <p className="text-sm text-dim mt-1">Door-to-door sales team CRM</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-7 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-5">Sign in to your team</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@canvass.app"
                required
                autoComplete="email"
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="field-input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
                style={{ background: 'rgba(226,75,74,0.12)', border: '1px solid rgba(226,75,74,0.3)', color: '#E24B4A' }}
              >
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo account picker */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button
              type="button"
              onClick={() => setShowAccounts((v) => !v)}
              className="w-full flex items-center justify-between text-xs text-dim hover:text-white/60 transition-colors"
            >
              <span>Demo accounts — click to fill</span>
              <ChevronDown
                size={13}
                className="transition-transform"
                style={{ transform: showAccounts ? 'rotate(180deg)' : 'none' }}
              />
            </button>

            {showAccounts && (
              <div className="mt-2.5 grid grid-cols-2 gap-1.5 animate-slide-up">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillAccount(acc)}
                    className="text-left px-3 py-2 rounded-xl transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                  >
                    <p className="text-xs font-semibold text-white">{acc.label}</p>
                    <p className="text-[10px] text-dim mt-0.5">{acc.role}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-dim mt-6">
          © 2025 OakandIron Sales · All data stored locally
        </p>
      </div>
    </div>
  )
}
