import { useState, useEffect, type FormEvent } from 'react'
import { useApp } from '../../contexts/AppContext'
import { Lead, LeadStatus, STATUS_CONFIG, ALL_STATUSES } from '../../types'
import { reverseGeocode } from '../../utils/geocoding'
import { X, Trash2, Loader2, MapPin } from 'lucide-react'

interface Props {
  pendingPin: { lat: number; lng: number } | null
  existingLead: Lead | null
  onClose: () => void
}

const BASE_EMPTY = {
  householdName: '',
  address: '',
  contactName: '',
  phone: '',
  email: '',
  status: 'interested' as LeadStatus,
  notes: '',
  assignedRep: '',
}

export default function PinForm({ pendingPin, existingLead, onClose }: Props) {
  const { addLead, updateLead, deleteLead, teamMembers, user, isAdmin } = useApp()
  const [form, setForm] = useState<typeof BASE_EMPTY>({ ...BASE_EMPTY })
  const [geocoding, setGeocoding] = useState(false)
  const [missingHouseNumber, setMissingHouseNumber] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  // Initialize form when editing existing lead
  useEffect(() => {
    if (existingLead) {
      setForm({
        householdName: existingLead.householdName,
        address: existingLead.address,
        contactName: existingLead.contactName,
        phone: existingLead.phone,
        email: existingLead.email,
        status: existingLead.status,
        notes: existingLead.notes,
        assignedRep: existingLead.assignedRep,
      })
    } else {
      // Reps always get self-assigned; admin defaults to first team member
      const defaultRep = !isAdmin && user ? user.name : (teamMembers[0] ?? '')
      setForm({ ...BASE_EMPTY, assignedRep: defaultRep })
    }
  }, [existingLead, isAdmin, user, teamMembers])

  // Reverse geocode when a new pin is dropped
  useEffect(() => {
    if (!pendingPin) return
    let cancelled = false
    setGeocoding(true)
    setMissingHouseNumber(false)
    reverseGeocode(pendingPin.lat, pendingPin.lng).then((result) => {
      if (!cancelled) {
        setForm((f) => ({ ...f, address: result.address }))
        setMissingHouseNumber(!result.hasHouseNumber)
        setGeocoding(false)
      }
    })
    return () => { cancelled = true }
  }, [pendingPin])

  const set = <K extends keyof typeof BASE_EMPTY>(k: K, v: (typeof BASE_EMPTY)[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await new Promise((r) => setTimeout(r, 200))

    if (existingLead) {
      updateLead({ ...existingLead, ...form })
    } else if (pendingPin) {
      addLead({ ...form, lat: pendingPin.lat, lng: pendingPin.lng })
    }
    setSaving(false)
    onClose()
  }

  const handleDelete = () => {
    if (!existingLead) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    deleteLead(existingLead.id)
    onClose()
  }

  const isNew = !existingLead
  const lat = pendingPin?.lat ?? existingLead?.lat
  const lng = pendingPin?.lng ?? existingLead?.lng

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-[1100]"
        onClick={onClose}
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
      />

      {/* Panel */}
      <div
        className="absolute bottom-0 left-0 right-0 md:bottom-auto md:top-1/2 md:left-auto md:right-4
          md:-translate-y-1/2 md:w-[380px] z-[1200] animate-slide-up rounded-t-2xl md:rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10,14,28,0.97)',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          maxHeight: '92vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: STATUS_CONFIG[form.status as LeadStatus].bgStyle }}
            >
              <MapPin size={14} style={{ color: STATUS_CONFIG[form.status as LeadStatus].color }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white truncate max-w-[240px]">
                {isNew ? 'New Lead' : (existingLead?.notes || existingLead?.address || 'Edit Lead')}
              </h3>
              {lat && lng && (
                <p className="text-[10px] text-dim mt-0.5">
                  {lat.toFixed(4)}, {lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/8 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto" style={{ maxHeight: 'calc(92vh - 130px)' }}>
          <div className="px-5 py-4 space-y-4">
            {/* Status selector */}
            <div>
              <label className="field-label">Status</label>
              <div className="grid grid-cols-5 gap-1.5">
                {ALL_STATUSES.map((s) => {
                  const cfg = STATUS_CONFIG[s]
                  const active = form.status === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('status', s)}
                      className="flex flex-col items-center gap-1 py-2 rounded-lg text-center transition-all"
                      style={{
                        background: active ? cfg.bgStyle : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${active ? cfg.color + '80' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
                      <span className="text-[9px] leading-tight" style={{ color: active ? cfg.color : 'rgba(240,244,255,0.4)' }}>
                        {cfg.label.split(' ')[0]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="field-label">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                placeholder="Add visit notes, follow-up actions…"
                rows={3}
                className="field-input resize-none"
              />
            </div>

            <div>
              <label className="field-label">
                Address
                {geocoding && (
                  <span className="ml-2 inline-flex items-center gap-1 normal-case text-white/30 font-normal">
                    <Loader2 size={10} className="animate-spin" /> looking up…
                  </span>
                )}
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => { set('address', e.target.value); setMissingHouseNumber(false) }}
                placeholder="Street address"
                className={`field-input ${missingHouseNumber ? 'border-[#BA7517]/60' : ''}`}
              />
              {!geocoding && missingHouseNumber && (
                <p className="mt-1.5 text-[11px] flex items-center gap-1" style={{ color: '#BA7517' }}>
                  <span>⚠</span>
                  No house number detected — add it manually before saving
                </p>
              )}
              {!geocoding && !missingHouseNumber && form.address && (
                <p className="mt-1.5 text-[11px] text-dim">
                  Is this the correct house? Verify the number above before saving.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Contact Name</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => set('contactName', e.target.value)}
                  placeholder="Full name"
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="905-555-0000"
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="contact@email.com"
                className="field-input"
              />
            </div>

            <div>
              <label className="field-label">Assigned Rep</label>
              {isAdmin ? (
                <select
                  value={form.assignedRep}
                  onChange={(e) => set('assignedRep', e.target.value)}
                  className="field-input"
                  style={{ appearance: 'none' }}
                >
                  {teamMembers.map((m) => (
                    <option key={m} value={m} style={{ background: '#0d1426' }}>{m}</option>
                  ))}
                </select>
              ) : (
                <div
                  className="field-input flex items-center gap-2 opacity-60 cursor-not-allowed select-none"
                >
                  <span className="w-2 h-2 rounded-full bg-[#1D9E75]" />
                  {form.assignedRep}
                  <span className="ml-auto text-[10px] text-white/30">auto-assigned</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div
            className="flex items-center gap-2 px-5 py-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            {!isNew && (
              <button
                type="button"
                onClick={handleDelete}
                className={`btn-danger ${confirmDelete ? 'ring-1 ring-red-500/50' : ''}`}
              >
                <Trash2 size={14} />
                {confirmDelete ? 'Confirm?' : 'Delete'}
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                isNew ? 'Save Lead' : 'Update Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
