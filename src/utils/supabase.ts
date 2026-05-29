import { createClient } from '@supabase/supabase-js'
import type { Lead, RepCredential } from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ── DB row shapes ─────────────────────────────────────────────────

export interface LeadRow {
  id: string
  household_name: string | null
  address: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  status: string
  notes: string | null
  assigned_rep: string | null
  lat: number | null
  lng: number | null
  created_at: string
  updated_at: string
}

export interface TeamMemberRow {
  id: string
  name: string
  email: string | null
  password: string | null
  role: string
  created_at: string
}

// ── Conversions ───────────────────────────────────────────────────

export function rowToLead(r: LeadRow): Lead {
  return {
    id: r.id,
    householdName: r.household_name ?? '',
    address: r.address ?? '',
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    contactName: r.contact_name ?? '',
    phone: r.phone ?? '',
    email: r.email ?? '',
    status: r.status as Lead['status'],
    notes: r.notes ?? '',
    assignedRep: r.assigned_rep ?? '',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export function leadToRow(lead: Lead): LeadRow {
  return {
    id: lead.id,
    household_name: lead.householdName,
    address: lead.address,
    lat: lead.lat,
    lng: lead.lng,
    contact_name: lead.contactName,
    phone: lead.phone,
    email: lead.email,
    status: lead.status,
    notes: lead.notes,
    assigned_rep: lead.assignedRep,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
  }
}

export function rowToRepCredential(r: TeamMemberRow): RepCredential {
  return {
    id: r.id,
    name: r.name,
    email: r.email ?? '',
    password: r.password ?? '',
  }
}
