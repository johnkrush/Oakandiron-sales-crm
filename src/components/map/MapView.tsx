import { useState, useCallback, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import L, { type LatLngBounds } from 'leaflet'
import { useApp } from '../../contexts/AppContext'
import { Lead, STATUS_CONFIG } from '../../types'
import { saveMapPosition, getMapStyle, saveMapStyle, type MapStyle } from '../../utils/storage'
import SearchBar from './SearchBar'
import FilterBar from './FilterBar'
import AreaSummary from './AreaSummary'
import PinForm from './PinForm'
import { Locate, Plus, Layers } from 'lucide-react'

// ── Mapbox tile configs ───────────────────────────────────────────
const MB_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string
const MB_ATTR = '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

const TILES: Record<MapStyle, { url: string; attribution: string }> = {
  street: {
    url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/{z}/{x}/{y}?access_token=${MB_TOKEN}`,
    attribution: MB_ATTR,
  },
  satellite: {
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/{z}/{x}/{y}?access_token=${MB_TOKEN}`,
    attribution: MB_ATTR,
  },
  // satellite-streets already includes road labels + house numbers over imagery
  hybrid: {
    url: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/{z}/{x}/{y}?access_token=${MB_TOKEN}`,
    attribution: MB_ATTR,
  },
}

const MAP_STYLE_LABELS: Record<MapStyle, string> = {
  street: 'Street',
  satellite: 'Satellite',
  hybrid: 'Hybrid',
}

// ── Custom teardrop pin ───────────────────────────────────────────
function createTeardropIcon(color: string, selected = false) {
  const w = selected ? 34 : 28
  const h = Math.round(w * 1.45)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 28 41">
    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 41 14 41C14 41 28 24.5 28 14C28 6.268 21.732 0 14 0Z"
      fill="${color}" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5.5" fill="rgba(255,255,255,0.95)"/>
    ${selected ? `<circle cx="14" cy="14" r="9" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-dasharray="3 2"/>` : ''}
  </svg>`
  return L.divIcon({
    html: svg,
    className: 'canvass-pin',
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h],
  })
}

// ── Pulsing blue location dot ─────────────────────────────────────
const LOCATION_ICON = L.divIcon({
  html: `<div class="location-dot-wrapper">
    <div class="location-dot-ring"></div>
    <div class="location-dot-ring-2"></div>
    <div class="location-dot-core"></div>
  </div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

// ── Map controller ────────────────────────────────────────────────
interface MapControllerProps {
  flyToTarget: { lat: number; lng: number; zoom?: number } | null
  onDone: () => void
}
function MapController({ flyToTarget, onDone }: MapControllerProps) {
  const map = useMap()
  useEffect(() => {
    if (!flyToTarget) return
    map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom ?? 16, { duration: 0.9 })
    onDone()
  }, [flyToTarget, map, onDone])
  return null
}

// ── Map events ────────────────────────────────────────────────────
interface MapEventsProps {
  onMapClick: (lat: number, lng: number) => void
  onBoundsChange: (b: LatLngBounds) => void
  onPositionChange: (lat: number, lng: number, zoom: number) => void
}
function MapEvents({ onMapClick, onBoundsChange, onPositionChange }: MapEventsProps) {
  const map = useMapEvents({
    click(e) { onMapClick(e.latlng.lat, e.latlng.lng) },
    moveend() {
      const c = map.getCenter(); const z = map.getZoom()
      onBoundsChange(map.getBounds()); onPositionChange(c.lat, c.lng, z)
    },
    zoomend() {
      const c = map.getCenter(); const z = map.getZoom()
      onBoundsChange(map.getBounds()); onPositionChange(c.lat, c.lng, z)
    },
  })
  useEffect(() => { onBoundsChange(map.getBounds()) }, [map, onBoundsChange])
  return null
}

// ── Main MapView ──────────────────────────────────────────────────
export default function MapView() {
  const {
    leads,
    user,
    isAdmin,
    canEditLead,
    mapPosition,
    setMapPosition,
    flyToTarget,
    flyTo,
    clearFlyTo,
    activeFilters,
    selectedLeadId,
    selectLead,
    setCurrentView,
  } = useApp()

  const [mapStyle, setMapStyleState] = useState<MapStyle>(() => getMapStyle())
  const [bounds, setBounds] = useState<LatLngBounds | null>(null)
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null)
  const [clickHighlight, setClickHighlight] = useState<{ lat: number; lng: number } | null>(null)
  const clickDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [lockedLead, setLockedLead] = useState<Lead | null>(null)
  const [showStylePicker, setShowStylePicker] = useState(false)

  const handleSetMapStyle = useCallback((style: MapStyle) => {
    setMapStyleState(style)
    saveMapStyle(style)
    setShowStylePicker(false)
  }, [])

  // ── Live GPS location ─────────────────────────────────────────
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationToast, setLocationToast] = useState('')
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showLocToast = useCallback((msg: string) => {
    setLocationToast(msg)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setLocationToast(''), 3500)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    const fetchLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            showLocToast('Enable location for live tracking')
            if (locationIntervalRef.current) clearInterval(locationIntervalRef.current)
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      )
    }
    fetchLocation()
    locationIntervalRef.current = setInterval(fetchLocation, 10000)
    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current)
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [showLocToast])

  // ── List → map jump ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedLeadId) return
    const lead = leads.find((l) => l.id === selectedLeadId)
    if (lead && canEditLead(lead)) { setEditLead(lead); setShowForm(true) }
    selectLead(null)
  }, [selectedLeadId, leads, selectLead, canEditLead])

  useEffect(() => {
    if (flyToTarget?.leadId) {
      const lead = leads.find((l) => l.id === flyToTarget.leadId)
      if (lead) { setEditLead(lead); setShowForm(true) }
    }
  }, [flyToTarget, leads])

  const visibleLeads = activeFilters.length === 0
    ? leads
    : leads.filter((l) => activeFilters.includes(l.status))

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (showForm) return
    setShowStylePicker(false)

    // Show highlight ring immediately at click location
    setClickHighlight({ lat, lng })

    // Fly to zoom 19 so house numbers are visible before the form opens
    flyTo({ lat, lng, zoom: 19 })

    // Wait for the fly animation (~900ms) then open the form
    if (clickDelayRef.current) clearTimeout(clickDelayRef.current)
    clickDelayRef.current = setTimeout(() => {
      setPendingPin({ lat, lng })
      setEditLead(null)
      setShowForm(true)
    }, 1100)
  }, [showForm, flyTo])

  const handleMarkerClick = useCallback((lead: Lead) => {
    if (!canEditLead(lead)) {
      setLockedLead(lead)
      setTimeout(() => setLockedLead(null), 2200)
      return
    }
    setClickHighlight(null)
    setPendingPin(null); setEditLead(lead); setShowForm(true)
  }, [canEditLead])

  const handleClose = useCallback(() => {
    setShowForm(false)
    setPendingPin(null)
    setEditLead(null)
    setClickHighlight(null)
    if (clickDelayRef.current) clearTimeout(clickDelayRef.current)
  }, [])

  const handleBoundsChange = useCallback((b: LatLngBounds) => setBounds(b), [])

  const handlePositionChange = useCallback((lat: number, lng: number, zoom: number) => {
    setMapPosition({ lat, lng, zoom }); saveMapPosition({ lat, lng, zoom })
  }, [setMapPosition])

  const handleLocate = useCallback(() => {
    if (userLocation) { flyTo({ lat: userLocation.lat, lng: userLocation.lng, zoom: 17 }); return }
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => flyTo({ lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 17 }),
      () => showLocToast('Enable location for live tracking')
    )
  }, [userLocation, flyTo, showLocToast])

  const handleSearchSelect = useCallback((lat: number, lng: number) => {
    setMapPosition({ lat, lng, zoom: 15 })
  }, [setMapPosition])

  const tileConfig = TILES[mapStyle]
  return (
    <div className="relative w-full flex-1 overflow-hidden">
      <MapContainer
        center={[mapPosition.lat, mapPosition.lng]}
        zoom={mapPosition.zoom}
        minZoom={10}
        maxZoom={22}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        attributionControl={true}
      >
        {/* ── Mapbox tile layer — key forces re-mount on style change ── */}
        <TileLayer
          key={`mapbox-${mapStyle}`}
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          tileSize={512}
          zoomOffset={-1}
          maxZoom={22}
          maxNativeZoom={22}
        />

        <MapController flyToTarget={flyToTarget} onDone={clearFlyTo} />
        <MapEvents
          onMapClick={handleMapClick}
          onBoundsChange={handleBoundsChange}
          onPositionChange={handlePositionChange}
        />

        {/* ── Click highlight ring (shows while zooming before form opens) */}
        {clickHighlight && !showForm && (
          <CircleMarker
            center={[clickHighlight.lat, clickHighlight.lng]}
            radius={22}
            pathOptions={{
              color: '#6366f1',
              weight: 2.5,
              dashArray: '6 5',
              fillColor: '#6366f1',
              fillOpacity: 0.1,
            }}
          />
        )}

        {/* ── Lead pins */}
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

        {/* ── Live GPS blue dot */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={LOCATION_ICON}
            zIndexOffset={2000}
            interactive={false}
          />
        )}
      </MapContainer>

      {/* ── Search + filter bar (top-center) ── */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col items-center gap-2 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto">
          <SearchBar onSelect={handleSearchSelect} />
        </div>
        <div className="pointer-events-auto">
          <FilterBar />
        </div>
      </div>

      {/* ── Area summary (top-right, below filter bar) ── */}
      <div className="absolute right-3 z-[1000] pointer-events-none top-[140px] md:top-[168px]">
        <AreaSummary leads={visibleLeads} bounds={bounds} />
      </div>

      {/* ── Map style toggle + rep badge (bottom-left) ── */}
      <div className="absolute bottom-6 left-4 z-[1000] flex flex-col gap-2 items-start">
        {showStylePicker ? (
          <div
            className="flex items-center gap-0.5 p-1 rounded-xl animate-fade-in"
            style={{
              background: 'rgba(8,11,24,0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            {(['street', 'satellite', 'hybrid'] as MapStyle[]).map((style) => {
              const active = mapStyle === style
              return (
                <button
                  key={style}
                  onClick={() => handleSetMapStyle(style)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
                  style={{
                    background: active ? 'rgba(99,102,241,0.35)' : 'transparent',
                    color: active ? '#c7d2fe' : 'rgba(240,244,255,0.5)',
                    border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid transparent',
                  }}
                >
                  {MAP_STYLE_LABELS[style]}
                </button>
              )
            })}
            <button
              onClick={() => setShowStylePicker(false)}
              className="ml-1 w-6 h-6 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowStylePicker(true)}
            title={`Map view: ${MAP_STYLE_LABELS[mapStyle]}`}
            className="flex items-center gap-2 px-3 h-11 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style={{
              background: 'rgba(8,11,24,0.9)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              color: 'rgba(240,244,255,0.7)',
            }}
          >
            <Layers size={15} />
            {MAP_STYLE_LABELS[mapStyle]}
          </button>
        )}

        {/* Rep indicator badge — sits under the map style toggle */}
        {!isAdmin && user && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
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
      </div>

      {/* ── FAB controls (bottom-right) ── */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
        <button
          onClick={() => setCurrentView('map')}
          title="Click anywhere on the map to drop a pin"
          className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 4px 20px rgba(99,102,241,0.45)',
          }}
        >
          <Plus size={20} className="text-white" />
        </button>

        <button
          onClick={handleLocate}
          title="My location"
          className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={{
            background: userLocation ? 'rgba(66,133,244,0.2)' : 'rgba(10,14,28,0.9)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${userLocation ? 'rgba(66,133,244,0.5)' : 'rgba(255,255,255,0.12)'}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <Locate size={18} style={{ color: userLocation ? '#4285F4' : 'rgba(240,244,255,0.7)' }} />
        </button>
      </div>

      {/* ── Location toast ── */}
      {locationToast && (
        <div
          className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1200]
            flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium
            animate-slide-up pointer-events-none whitespace-nowrap"
          style={{
            background: 'rgba(8,11,24,0.95)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(240,244,255,0.75)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <Locate size={13} style={{ color: '#4285F4' }} />
          {locationToast}
        </div>
      )}

      {/* ── Locked lead notice ── */}
      {lockedLead && !isAdmin && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1200]
            flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium
            animate-fade-in pointer-events-none"
          style={{
            background: 'rgba(8,11,24,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(240,244,255,0.7)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <span className="text-base">🔒</span>
          Assigned to <strong className="text-white ml-1">{lockedLead.assignedRep || 'another rep'}</strong>
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
