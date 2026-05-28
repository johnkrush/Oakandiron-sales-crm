import { useState, useEffect, useRef } from 'react'
import { useApp } from '../../contexts/AppContext'
import { STATUS_CONFIG, ALL_STATUSES, RepCredential } from '../../types'
import { exportToCSV } from '../../utils/csv'
import {
  Users,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info,
  UserCircle,
  Plus,
  X,
  Save,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Pencil,
} from 'lucide-react'

// ── Toast ─────────────────────────────────────────────────────────
function Toast({ message }: { message: string }) {
  return (
    <div
      className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[9999]
        flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold
        animate-slide-up pointer-events-none whitespace-nowrap"
      style={{
        background: 'rgba(8,18,36,0.97)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(29,158,117,0.45)',
        color: '#1D9E75',
        boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
      }}
    >
      <CheckCircle size={15} className="shrink-0" />
      {message}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────
function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className="text-white/40" />
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        {children}
      </div>
    </div>
  )
}

// ── Rep account row ───────────────────────────────────────────────
function RepAccountRow({
  cred,
  onUpdate,
  onDelete,
  showToast,
}: {
  cred: RepCredential
  onUpdate: (id: string, updates: Partial<RepCredential>) => void
  onDelete: (id: string) => void
  showToast: (msg: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [newPw, setNewPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const handleSavePw = () => {
    if (!newPw.trim()) return
    onUpdate(cred.id, { password: newPw.trim() })
    showToast(`Password updated for ${cred.name}`)
    setEditing(false)
    setNewPw('')
  }

  const handleDelete = () => {
    if (!confirmDel) { setConfirmDel(true); return }
    onDelete(cred.id)
    showToast(`${cred.name}'s account removed`)
  }

  const initials = cred.name.split(' ').map((w) => w[0]).join('').slice(0, 2)

  return (
    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #1D9E75, #16845f)' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{cred.name}</p>
          <p className="text-xs text-dim">{cred.email}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => { setEditing((v) => !v); setConfirmDel(false) }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: editing ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
              color: editing ? '#a5b4fc' : 'rgba(240,244,255,0.5)',
              border: `1px solid ${editing ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            <KeyRound size={12} />
            {editing ? 'Cancel' : 'Password'}
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: confirmDel ? 'rgba(226,75,74,0.15)' : 'transparent',
              color: confirmDel ? '#E24B4A' : 'rgba(240,244,255,0.3)',
              border: `1px solid ${confirmDel ? 'rgba(226,75,74,0.4)' : 'transparent'}`,
            }}
            title="Remove account"
          >
            <Trash2 size={12} />
            {confirmDel && <span>Confirm</span>}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 flex items-center gap-2 animate-slide-up">
          <div className="relative flex-1">
            <input
              type={showPw ? 'text' : 'password'}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password"
              className="field-input pr-9 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSavePw()}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <button
            onClick={handleSavePw}
            disabled={!newPw.trim()}
            className="btn-primary py-2 text-xs disabled:opacity-40"
          >
            <Save size={13} />
            Save
          </button>
        </div>
      )}
    </div>
  )
}

// ── Add account form ──────────────────────────────────────────────
function AddAccountForm({
  teamMembers,
  existingNames,
  onAdd,
  onCancel,
  showToast,
}: {
  teamMembers: string[]
  existingNames: Set<string>
  onAdd: (cred: Omit<RepCredential, 'id'>) => void
  onCancel: () => void
  showToast: (msg: string) => void
}) {
  const available = teamMembers.filter((m) => !existingNames.has(m))
  const [name, setName] = useState(available[0] ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('canvass123')
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email.trim() || !password.trim()) return
    onAdd({ name, email: email.trim().toLowerCase(), password: password.trim() })
    showToast(`Account created for ${name}`)
    onCancel()
  }

  if (available.length === 0) {
    return (
      <div className="px-4 py-4 text-sm text-dim text-center">
        All team members already have accounts.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3 animate-slide-up">
      <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">New Rep Account</p>

      <div>
        <label className="field-label">Team Member</label>
        <select
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field-input"
          style={{ appearance: 'none' }}
        >
          {available.map((m) => (
            <option key={m} value={m} style={{ background: '#0d1426' }}>{m}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="field-label">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="rep@canvass.app"
          required
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
            required
            className="field-input pr-9"
          />
          <button type="button" onClick={() => setShowPw((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" className="btn-primary text-sm py-2">
          <Plus size={14} />
          Create Account
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost text-sm py-2">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────
export default function SettingsPage() {
  const {
    leads,
    clearData,
    user,
    updateUser,
    teamMembers,
    setTeamMembers,
    repCredentials,
    addRepCredential,
    updateRepCredential,
    deleteRepCredential,
  } = useApp()

  // Toast
  const [toast, setToast] = useState('')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = (msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(''), 2800)
  }
  useEffect(() => () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }, [])

  // ── Profile ──────────────────────────────────────────────────
  const [profileName, setProfileName] = useState(user?.name ?? '')
  useEffect(() => { setProfileName(user?.name ?? '') }, [user?.name])

  const handleSaveProfile = () => {
    const trimmed = profileName.trim()
    if (!trimmed || trimmed === user?.name) return
    updateUser({ name: trimmed })
    showToast('Profile updated')
  }

  // ── Team members ─────────────────────────────────────────────
  const [members, setMembers] = useState<string[]>(teamMembers)
  const newMemberRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => { setMembers(teamMembers) }, [teamMembers])

  const handleMemberChange = (i: number, value: string) =>
    setMembers((prev) => prev.map((m, idx) => (idx === i ? value : m)))

  const handleMemberBlur = (i: number) => {
    const value = members[i]?.trim()
    if (!value) {
      const updated = members.filter((_, idx) => idx !== i)
      setMembers(updated)
      setTeamMembers(updated.filter((m) => m.trim()))
      showToast('Empty member removed')
      return
    }
    const updated = members.map((m, idx) => (idx === i ? value : m))
    setTeamMembers(updated.filter((m) => m.trim()))
    showToast('Team updated')
  }

  const handleMemberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === 'Enter') e.currentTarget.blur()
    if (e.key === 'Escape') { setMembers(teamMembers); e.currentTarget.blur() }
  }

  const handleAddMember = () => {
    setMembers((prev) => [...prev, ''])
    setTimeout(() => newMemberRef.current?.focus(), 50)
  }

  const handleRemoveMember = (i: number) => {
    const updated = members.filter((_, idx) => idx !== i).filter((m) => m.trim())
    setMembers(updated)
    setTeamMembers(updated)
    showToast('Member removed')
  }

  // ── Rep accounts ─────────────────────────────────────────────
  const [showAddAccount, setShowAddAccount] = useState(false)
  const existingRepNames = new Set(repCredentials.map((c) => c.name))

  // ── Data ─────────────────────────────────────────────────────
  const [confirmClear, setConfirmClear] = useState(false)
  const [exported, setExported] = useState(false)

  const handleExport = () => {
    exportToCSV(leads)
    setExported(true)
    showToast(`Exported ${leads.length} leads to CSV`)
    setTimeout(() => setExported(false), 2500)
  }

  const handleClear = () => {
    if (!confirmClear) { setConfirmClear(true); return }
    clearData()
    setConfirmClear(false)
    showToast('Data reset to demo leads')
  }

  return (
    <>
      {toast && <Toast message={toast} />}

      <div className="max-w-2xl mx-auto space-y-6 pb-8">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-dim mt-0.5">Manage your profile, team, and data</p>
        </div>

        {/* ── Admin Profile ─────────────────────────────────── */}
        <Section title="Admin Profile" icon={UserCircle}>
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {profileName.trim()
                  ? profileName.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
                  : '?'}
              </div>
              <div>
                <p className="text-white font-semibold">{profileName || user?.name}</p>
                <p className="text-xs text-dim">{user?.email}</p>
                <span
                  className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}
                >
                  <ShieldCheck size={10} />
                  Team Lead
                </span>
              </div>
            </div>

            <div>
              <label className="field-label">Display Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveProfile()}
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Email</label>
              <input type="email" value={user?.email ?? ''} readOnly className="field-input opacity-40 cursor-not-allowed" />
              <p className="text-xs text-dim mt-1.5">Fixed to the admin account</p>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={!profileName.trim() || profileName.trim() === user?.name}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save size={14} />
              Save Profile
            </button>
          </div>
        </Section>

        {/* ── Team Members ──────────────────────────────────── */}
        <Section title="Team Members" icon={Users}>
          <div className="px-5 py-4 space-y-2.5">
            <p className="text-xs text-dim mb-3">
              Names must match the rep's account name so leads link correctly. Changes save on blur.
            </p>
            {members.map((member, i) => (
              <div key={i} className="flex items-center gap-2 group">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: `hsl(${(i * 47 + 210) % 360}, 55%, 42%)` }}
                >
                  {member.trim()
                    ? member.trim().split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
                    : '?'}
                </div>
                <input
                  ref={i === members.length - 1 && member === '' ? newMemberRef : null}
                  type="text"
                  value={member}
                  onChange={(e) => handleMemberChange(i, e.target.value)}
                  onBlur={() => handleMemberBlur(i)}
                  onKeyDown={(e) => handleMemberKeyDown(e, i)}
                  placeholder="Team member name"
                  className="field-input flex-1"
                />
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleRemoveMember(i)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg transition-all
                    opacity-0 group-hover:opacity-100 hover:bg-red-500/15 text-white/30 hover:text-red-400"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddMember}
              className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl text-sm font-medium
                transition-all w-full border border-dashed"
              style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(240,244,255,0.45)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#a5b4fc'; e.currentTarget.style.background = 'rgba(99,102,241,0.07)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(240,244,255,0.45)'; e.currentTarget.style.background = 'transparent' }}
            >
              <Plus size={15} />
              Add team member
            </button>
          </div>
        </Section>

        {/* ── Team Accounts ─────────────────────────────────── */}
        <Section title="Team Accounts" icon={KeyRound}>
          <div>
            {repCredentials.length === 0 && !showAddAccount && (
              <div className="px-5 py-4 text-sm text-dim">No rep accounts yet.</div>
            )}

            {repCredentials.map((cred, i) => (
              <div key={cred.id} style={{ borderBottom: i < repCredentials.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <RepAccountRow
                  cred={cred}
                  onUpdate={updateRepCredential}
                  onDelete={deleteRepCredential}
                  showToast={showToast}
                />
              </div>
            ))}

            {showAddAccount ? (
              <div style={{ borderTop: repCredentials.length > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <AddAccountForm
                  teamMembers={members}
                  existingNames={existingRepNames}
                  onAdd={addRepCredential}
                  onCancel={() => setShowAddAccount(false)}
                  showToast={showToast}
                />
              </div>
            ) : (
              <div className="px-4 py-3" style={{ borderTop: repCredentials.length > 0 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                <button
                  onClick={() => setShowAddAccount(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                    transition-all border border-dashed w-full"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(240,244,255,0.45)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.color = '#a5b4fc'; e.currentTarget.style.background = 'rgba(99,102,241,0.07)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(240,244,255,0.45)'; e.currentTarget.style.background = 'transparent' }}
                >
                  <Plus size={15} />
                  Add rep account
                </button>
              </div>
            )}

            <div className="px-5 pb-4 pt-2 flex items-start gap-2 text-xs text-dim">
              <Info size={11} className="shrink-0 mt-0.5" />
              Reps can only log in with accounts listed here. The name must match a team member name exactly.
            </div>
          </div>
        </Section>

        {/* ── Data Summary ──────────────────────────────────── */}
        <Section title="Data Summary" icon={Info}>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dim">Total leads stored</span>
              <span className="font-semibold text-white tabular-nums">{leads.length}</span>
            </div>
            {ALL_STATUSES.map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: STATUS_CONFIG[s].color }} />
                  <span className="text-dim">{STATUS_CONFIG[s].label}</span>
                </div>
                <span className="font-medium tabular-nums" style={{ color: STATUS_CONFIG[s].color }}>
                  {leads.filter((l) => l.status === s).length}
                </span>
              </div>
            ))}
            <div className="pt-3 flex items-start gap-2 text-xs text-dim" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Info size={12} className="shrink-0 mt-0.5" />
              All data is stored locally in your browser.
            </div>
          </div>
        </Section>

        {/* ── Export ────────────────────────────────────────── */}
        <Section title="Export" icon={Download}>
          <div className="px-5 py-4">
            <p className="text-sm text-mid mb-4">
              Export all {leads.length} leads to CSV (Excel / Google Sheets compatible).
            </p>
            <button onClick={handleExport} className="btn-primary">
              {exported ? <><CheckCircle size={15} />Exported!</> : <><Download size={15} />Export {leads.length} Leads</>}
            </button>
          </div>
        </Section>

        {/* ── Danger Zone ───────────────────────────────────── */}
        <Section title="Danger Zone" icon={Trash2}>
          <div className="px-5 py-4">
            <p className="text-sm text-mid mb-1">Reset all lead data</p>
            <p className="text-xs text-dim mb-4">
              Deletes all leads and restores the 20 demo leads. Rep accounts and team members are preserved.
            </p>
            {confirmClear && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-sm mb-3"
                style={{ background: 'rgba(226,75,74,0.12)', border: '1px solid rgba(226,75,74,0.3)', color: '#E24B4A' }}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Are you sure? All leads will be permanently deleted.
              </div>
            )}
            <div className="flex items-center gap-3">
              <button onClick={handleClear} className="btn-danger">
                <Trash2 size={14} />
                {confirmClear ? 'Yes, Reset Everything' : 'Reset All Data'}
              </button>
              {confirmClear && <button onClick={() => setConfirmClear(false)} className="btn-ghost text-sm">Cancel</button>}
            </div>
          </div>
        </Section>

        <div className="text-center text-xs text-dim pb-4">
          <p>OakandIron Sales v1.0.0 · All data stored locally · No cloud sync</p>
        </div>
      </div>
    </>
  )
}
