import { Lead, User, MapPosition, RepCredential } from '../types'

const KEYS = {
  leads: 'canvass_leads',
  user: 'canvass_user',
  mapPosition: 'canvass_map_position',
  initialized: 'canvass_initialized',
  teamMembers: 'canvass_team_members',
  teamInitialized: 'canvass_team_initialized',
  repCredentials: 'canvass_rep_credentials',
  repCredsInitialized: 'canvass_rep_creds_initialized',
  mapStyle: 'canvass_map_style',
  pendingLeads: 'canvass_pending_lead_ids',
} as const

export type MapStyle = 'street' | 'satellite' | 'hybrid'

export function getMapStyle(): MapStyle {
  const raw = localStorage.getItem(KEYS.mapStyle)
  return (raw as MapStyle) || 'street'
}

export function saveMapStyle(style: MapStyle): void {
  localStorage.setItem(KEYS.mapStyle, style)
}

export function getLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(KEYS.leads)
    return raw ? (JSON.parse(raw) as Lead[]) : []
  } catch {
    return []
  }
}

export function saveLeads(leads: Lead[]): void {
  localStorage.setItem(KEYS.leads, JSON.stringify(leads))
}

export function getUser(): User | null {
  try {
    const raw = localStorage.getItem(KEYS.user)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function saveUser(user: User | null): void {
  if (user) {
    localStorage.setItem(KEYS.user, JSON.stringify(user))
  } else {
    localStorage.removeItem(KEYS.user)
  }
}

const DEFAULT_POSITION: MapPosition = {
  lat: 43.7417,
  lng: -79.3733,
  zoom: 11,
}

export function getMapPosition(): MapPosition {
  try {
    const raw = localStorage.getItem(KEYS.mapPosition)
    return raw ? (JSON.parse(raw) as MapPosition) : DEFAULT_POSITION
  } catch {
    return DEFAULT_POSITION
  }
}

export function saveMapPosition(pos: MapPosition): void {
  localStorage.setItem(KEYS.mapPosition, JSON.stringify(pos))
}

// Returns true only when this exact key has never been written.
// An existing key containing [] is still "has data" — the user cleared it intentionally.
export function hasStoredLeads(): boolean {
  return localStorage.getItem(KEYS.leads) !== null
}

export function hasStoredTeamMembers(): boolean {
  return localStorage.getItem(KEYS.teamMembers) !== null
}

export function hasStoredRepCredentials(): boolean {
  return localStorage.getItem(KEYS.repCredentials) !== null
}

export function getRepCredentials(): RepCredential[] {
  try {
    const raw = localStorage.getItem(KEYS.repCredentials)
    return raw ? (JSON.parse(raw) as RepCredential[]) : []
  } catch {
    return []
  }
}

export function saveRepCredentials(creds: RepCredential[]): void {
  localStorage.setItem(KEYS.repCredentials, JSON.stringify(creds))
}

export function getTeamMembers(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.teamMembers)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function saveTeamMembers(members: string[]): void {
  localStorage.setItem(KEYS.teamMembers, JSON.stringify(members))
}

// ── Pending lead inserts ──────────────────────────────────────────
// IDs of leads created locally whose Supabase insert hasn't been confirmed yet.
// Only these may be re-pushed on sync — anything else missing from Supabase was
// deleted on purpose and must NOT be resurrected.
export function getPendingLeadIds(): string[] {
  try {
    const raw = localStorage.getItem(KEYS.pendingLeads)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

export function savePendingLeadIds(ids: string[]): void {
  localStorage.setItem(KEYS.pendingLeads, JSON.stringify([...new Set(ids)]))
}

export function addPendingLeadId(id: string): void {
  savePendingLeadIds([...getPendingLeadIds(), id])
}

export function removePendingLeadId(id: string): void {
  savePendingLeadIds(getPendingLeadIds().filter((x) => x !== id))
}

export function clearAllData(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
}
