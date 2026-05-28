export type LeadStatus =
  | 'interested'
  | 'not-home'
  | 'follow-up'
  | 'not-interested'
  | 'do-not-knock'

export type UserRole = 'admin' | 'rep'

export interface Lead {
  id: string
  householdName: string
  address: string
  lat: number
  lng: number
  contactName: string
  phone: string
  email: string
  status: LeadStatus
  notes: string
  assignedRep: string
  createdAt: string
  updatedAt: string
}

export interface User {
  email: string
  name: string
  role: UserRole
}

export interface RepCredential {
  id: string
  email: string
  password: string
  name: string  // must match a team member name so lead.assignedRep links up
}

export type View = 'map' | 'list' | 'dashboard' | 'settings'

export interface MapPosition {
  lat: number
  lng: number
  zoom: number
}

export interface StatusConfig {
  label: string
  color: string
  bgStyle: string
  textStyle: string
  dotClass: string
}

export const STATUS_CONFIG: Record<LeadStatus, StatusConfig> = {
  interested: {
    label: 'Interested',
    color: '#1D9E75',
    bgStyle: 'rgba(29,158,117,0.18)',
    textStyle: '#1D9E75',
    dotClass: 'bg-[#1D9E75]',
  },
  'not-home': {
    label: 'Not Home',
    color: '#BA7517',
    bgStyle: 'rgba(186,117,23,0.18)',
    textStyle: '#BA7517',
    dotClass: 'bg-[#BA7517]',
  },
  'follow-up': {
    label: 'Follow Up',
    color: '#378ADD',
    bgStyle: 'rgba(55,138,221,0.18)',
    textStyle: '#378ADD',
    dotClass: 'bg-[#378ADD]',
  },
  'not-interested': {
    label: 'Not Interested',
    color: '#E24B4A',
    bgStyle: 'rgba(226,75,74,0.18)',
    textStyle: '#E24B4A',
    dotClass: 'bg-[#E24B4A]',
  },
  'do-not-knock': {
    label: 'Do Not Knock',
    color: '#888780',
    bgStyle: 'rgba(136,135,128,0.18)',
    textStyle: '#888780',
    dotClass: 'bg-[#888780]',
  },
}

export const ALL_STATUSES: LeadStatus[] = [
  'interested',
  'not-home',
  'follow-up',
  'not-interested',
  'do-not-knock',
]

export const TEAM_MEMBERS = [
  'Chris',
  'Sarah Chen',
  'Mike Rodriguez',
  'Lisa Thompson',
  'David Park',
  'Tom Wilson',
  'Emma Davis',
]

export const DEFAULT_REP_CREDENTIALS: RepCredential[] = [
  { id: 'rep-0', email: 'chris@canvass.app', password: 'canvass123', name: 'Chris' },
  { id: 'rep-1', email: 'sarah@canvass.app', password: 'canvass123', name: 'Sarah Chen' },
  { id: 'rep-2', email: 'mike@canvass.app', password: 'canvass123', name: 'Mike Rodriguez' },
  { id: 'rep-3', email: 'lisa@canvass.app', password: 'canvass123', name: 'Lisa Thompson' },
  { id: 'rep-4', email: 'david@canvass.app', password: 'canvass123', name: 'David Park' },
  { id: 'rep-5', email: 'tom@canvass.app', password: 'canvass123', name: 'Tom Wilson' },
  { id: 'rep-6', email: 'emma@canvass.app', password: 'canvass123', name: 'Emma Davis' },
]
