import { Lead, User, MapPosition, RepCredential } from '../types'

const KEYS = {
  leads: 'canvass_leads',
  user: 'canvass_user',
  mapPosition: 'canvass_map_position',
  initialized: 'canvass_initialized',
  teamMembers: 'canvass_team_members',
  repCredentials: 'canvass_rep_credentials',
} as const

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
  lat: 43.3255,
  lng: -79.799,
  zoom: 13,
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

export function isInitialized(): boolean {
  return localStorage.getItem(KEYS.initialized) === 'true'
}

export function setInitialized(): void {
  localStorage.setItem(KEYS.initialized, 'true')
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

export function clearAllData(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
}
