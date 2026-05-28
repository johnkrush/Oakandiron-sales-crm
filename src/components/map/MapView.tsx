import { useState, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L, { type LatLngBounds } from 'leaflet'
import { useApp } from '../../contexts/AppContext'
import { Lead, STATUS_CONFIG } from '../../types'
import { saveMapPosition } from '../../utils/storage'
import SearchBar from './SearchBar'
import FilterBar from './FilterBar'
import AreaSummary from './AreaSummary'
import PinForm from './PinForm'
import { Locate, Plus } from 'lucide-react'

// ── Custom teardrop icon ──────────────────────────────────────────
function createTeardropIcon(color: string, selected = false) {
  const w = selected ? 34 : 28
  const h = Math.round(w * 1.45)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 28 41">
    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 41 14 41C14 41 28 24.5 28 14C28 6.268 21.732 0 14 0Z"
      fill="${color}" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/>
    <circle cx="14" cy="14" r="5.5" fill="rgba(255,255,255,0.95)"/>
    ${selected ? `<circle cx="14" cy="14" r="9" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-dasharray="3 2"/>` : ''}
  </svg>`
  return L.divIcon({
    html: svg,
    className: 'canvass-pin',
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h],
  })
}

// ── Map controller: fly to target programmatically ────────────────
interface MapControllerProps {
  flyToTarget: { lat: number; lng: number; zoom?: number } | null
  onDone: () => void
}
function MapController({ flyToTarget, onDone }: MapControllerProps) {
  const map = useMap()
  useEffect(() => {
    if (!flyToTarget) return
    map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom ?? 16, { duration: 1.0 })
    onDone()
  }, [flyToTarget, map, onDone])
  return null
}

// ── Map events: click to drop pin + track bounds ──────────────────
interface MapEventsProps {
  onMapClick: (lat: number, lng: number) => void
  onBoundsChange: (b: LatLngBounds) => void
  onPositionChange: (lat: number, lng: number, zoom: number) => void
}
function MapEvents({ onMapClick, onBoundsChange, onPositionChange }: MapEventsProps) {
  const map = useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
    moveend() {
      const c = map.getCenter()
      const z = map.getZoom()
      onBoundsChange(map.getBounds())
      onPositionChange(c.lat, c.lng, z)
    },
    zoomend() {
      const c = map.getCenter()
      const z = map.getZoom()
      onBoundsChange(map.getBounds())
      onPositionChange(c.lat, c.lng, z)
    },
  })
  // Report initial bounds
  useEffect(() => {
    onBoundsChange(map.getBounds())
  }, [map, onBoundsChange])
  return null
}

// ── Main map view ─────────────────────────────────────────────────
export default function MapView() {
  const {
    leads,
    user,
    isAdmin,
    canEditLead,
    mapPosition,
    setMapPosition,
    flyToTarget,
    clearFlyTo,
    activeFilters,
    selectedLeadId,
    selectLead,
    setCurrentView,
  } = useApp()

  const [bounds, setBounds] = useState<LatLngBounds | null>(null)
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [lockedLead, setLockedLead] = useState<Lead | null>(null)

  // Jump to selected lead from list view
  useEffect(() => {
    if (!selectedLeadId) return
    const lead = leads.find((l) => l.id === selectedLeadId)
    if (lead && canEditLead(lead)) {
      setEditLead(lead)
      setShowForm(true)
    }
    selectLead(null)
  }, [selectedLeadId, leads, selectLead, canEditLead])

  // Also open form if flyToTarget has a leadId
  useEffect(() => {
    if (flyToTarget && flyToTarget.leadId) {
      const lead = leads.find((l) => l.id === flyToTarget.leadId)
      if (lead) { setEditLead(lead); setShowForm(true) }
    }
  }, [flyToTarget, leads])

  const visibleLeads = activeFilters.length === 0
    ? leads
    : leads.filter((l) => activeFilters.includes(l.status))

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (showForm) return
    setPendingPin({ lat, lng })
    setEditLead(null)
    setShowForm(true)
  }, [showForm])

  const handleMarkerClick = useCallback((lead: Lead) => {
    if (!canEditLead(lead)) {
      // Show brief locked notice for rep clicking another rep's pin
      setLockedLead(lead)
      setTimeout(() => setLockedLead(null), 2200)
      return
    }
    setPendingPin(null)
    setEditLead(lead)
    setShowForm(true)
  }, [canEditLead])

  const handleClose = useCallback(() => {
    setShowForm(false)
    setPendingPin(null)
    setEditLead(null)
  }, [])

  const handleBoundsChange = useCallback((b: LatLngBounds) => {
    setBounds(b)
  }, [])

  const handlePositionChange = useCallback((lat: number, lng: number, zoom: number) => {
    setMapPosition({ lat, lng, zoom })
    saveMapPosition({ lat, lng, zoom })
  }, [setMapPosition])

  const handleLocate = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 16 })
      },
      () => {}
    )
  }

  const handleSearchSelect = useCallback((lat: number, lng: number) => {
    setMapPosition({ lat, lng, zoom: 15 })
  }, [setMapPosition])

  return (
    <div className="relative w-full flex-1 overflow-hidden">
      <MapContainer
        center={[mapPosition.lat, mapPosition.lng]}
        zoom={mapPosition.zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
          subdomains="abcd"
        />

        <MapController flyToTarget={flyToTarget} onDone={clearFlyTo} />
        <MapEvents
          onMapClick={handleMapClick}
          onBoundsChange={handleBoundsChange}
          onPositionChange={handlePositionChange}
        />

        {visibleLeads.map((lead) => {
          const editable = canEditLead(lead)
          return (
            <Marker
              key={lead.id}
              position={[lead.lat, lead.lng]}
              icon={createTeardropIcon(
                editable ? STATUS_CONFIG[lead.status].color : STATUS_CONFIG[lead.status].color + '88',
                editLead?.id === lead.id
              )}
              eventHandlers={{ click: () => handleMarkerClick(lead) }}
            />
          )
        })}
      </MapContainer>

      {/* ── Top overlays ── */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col items-center gap-2 pointer-events-none">
        {/* Search bar */}
        <div className="w-full max-w-md pointer-events-auto">
          <SearchBar onSelect={handleSearchSelect} />
        </div>
        {/* Filter bar */}
        <div className="pointer-events-auto">
          <FilterBar />
        </div>
      </div>

      {/* ── Area summary (top-right) ── */}
      <div className="absolute top-3 right-3 z-[1000] pointer-events-none" style={{ top: '168px' }}>
        <AreaSummary leads={visibleLeads} bounds={bounds} />
      </div>

      {/* ── FAB controls (bottom right) ── */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
        {/* Add pin button */}
        <button
          onClick={() => {
            // Prompt user to click the map
            setCurrentView('map')
          }}
          title="Click the map to drop a pin"
          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
          }}
        >
          <Plus size={20} className="text-white" />
        </button>

        {/* Locate me */}
        <button
          onClick={handleLocate}
          title="My location"
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={{
            background: 'rgba(10,14,28,0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <Locate size={18} className="text-white/70" />
        </button>
      </div>

      {/* ── Locked lead notice (rep clicked another rep's pin) ── */}
      {lockedLead && !isAdmin && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1200]
            flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in pointer-events-none"
          style={{
            background: 'rgba(8,11,24,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(240,244,255,0.7)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <span className="text-base">🔒</span>
          <span>
            Assigned to <strong className="text-white">{lockedLead.assignedRep || 'another rep'}</strong>
          </span>
        </div>
      )}

      {/* ── Rep indicator badge ── */}
      {!isAdmin && user && (
        <div
          className="absolute top-3 left-3 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
          style={{
            background: 'rgba(8,18,36,0.88)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(29,158,117,0.3)',
            color: '#1D9E75',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
          {user.name} — your leads only
        </div>
      )}

      {/* ── Pin form modal ── */}
      {showForm && (
        <PinForm
          pendingPin={pendingPin}
          existingLead={editLead}
          onClose={handleClose}
        />
      )}
    </div>
  )
}
