import type { LeadStatus } from '../types'
import { supabase, leadToRow } from './supabase'

interface RawLead {
  address: string
  status: LeadStatus
  notes: string
}

// Oakville city centre — fallback if Nominatim returns no result
const OAKVILLE_FALLBACK = { lat: 43.4675, lng: -79.6877 }

const RAW_LEADS: RawLead[] = [
  // ── Mistwell Crescent ──────────────────────────────────────────
  { address: '3292 Mistwell Crescent', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3296 Mistwell Crescent', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3300 Mistwell Crescent', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3304 Mistwell Crescent', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3308 Mistwell Crescent', status: 'follow-up',      notes: 'Said they rent, gave business card' },
  { address: '3312 Mistwell Crescent', status: 'not-interested', notes: 'Already has people, did not take business card' },
  { address: '3313 Mistwell Crescent', status: 'not-interested', notes: 'Renters, did not take business card' },
  { address: '3309 Mistwell Crescent', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3301 Mistwell Crescent', status: 'not-interested', notes: 'Not interested' },
  { address: '3297 Mistwell Crescent', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3293 Mistwell Crescent', status: 'not-home',       notes: 'No answer' },

  // ── Great Lakes Boulevard ──────────────────────────────────────
  { address: '66 Great Lakes Boulevard', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '62 Great Lakes Boulevard', status: 'follow-up',      notes: 'Took a business card' },
  { address: '71 Great Lakes Boulevard', status: 'not-interested', notes: 'Not interested, does stuff himself' },
  { address: '81 Great Lakes Boulevard', status: 'not-home',       notes: 'No answer, left business card' },

  // ── Petrie Way ────────────────────────────────────────────────
  { address: '3373 Petrie Way', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3367 Petrie Way', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3361 Petrie Way', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3357 Petrie Way', status: 'not-interested', notes: 'Ring camera answered, not interested' },
  { address: '3353 Petrie Way', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3349 Petrie Way', status: 'interested',     notes: 'Interested, took business card — would maybe need it done for fall, more of a landscaping job' },
  { address: '3345 Petrie Way', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3348 Petrie Way', status: 'not-interested', notes: 'Not interested' },
  { address: '3352 Petrie Way', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3356 Petrie Way', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '3360 Petrie Way', status: 'not-interested', notes: 'Truck doing work on house already' },
  { address: '3364 Petrie Way', status: 'not-interested', notes: 'Not interested' },
  { address: '3368 Petrie Way', status: 'not-interested', notes: 'Not interested, left business card at door (card was not taken)' },
  { address: '3372 Petrie Way', status: 'not-interested', notes: 'Already has Cedar Springs' },
  { address: '3376 Petrie Way', status: 'not-home',       notes: 'No answer, left business card' },

  // ── Triller Place ─────────────────────────────────────────────
  { address: '103 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '107 Triller Place', status: 'follow-up',      notes: 'Not interested, took business card' },
  { address: '111 Triller Place', status: 'not-interested', notes: 'Not interested' },
  { address: '115 Triller Place', status: 'follow-up',      notes: 'Not interested, took business card — family might need work done' },
  { address: '119 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '123 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '127 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '131 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '135 Triller Place', status: 'follow-up',      notes: 'Not interested, took business card' },
  { address: '139 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '143 Triller Place', status: 'follow-up',      notes: 'Not interested at the moment, took business card' },
  { address: '147 Triller Place', status: 'interested',     notes: 'Might be interested, took business card' },
  { address: '151 Triller Place', status: 'not-home',       notes: 'No answer, left business card — will come back' },
  { address: '155 Triller Place', status: 'follow-up',      notes: 'Not interested, took business card' },
  { address: '159 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '158 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '154 Triller Place', status: 'follow-up',      notes: 'Just got everything done recently, took business card for word of mouth' },
  { address: '150 Triller Place', status: 'follow-up',      notes: 'Not at the moment, took business card' },
  { address: '144 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '136 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '116 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '112 Triller Place', status: 'not-interested', notes: 'Not interested, did not take business card' },
  { address: '108 Triller Place', status: 'not-home',       notes: 'No answer, left business card' },
  { address: '100 Triller Place', status: 'interested',     notes: 'Interested, took business card' },
  { address: '104 Triller Place', status: 'interested',     notes: 'Interested, took business card' },

  // ── West River Street ─────────────────────────────────────────
  { address: '90 West River Street', status: 'follow-up',  notes: 'Not interested, took business card' },
  { address: '86 West River Street', status: 'interested', notes: 'Interested, might give a call, took business card' },
  { address: '82 West River Street', status: 'not-home',   notes: 'No answer, left business card' },
  { address: '78 West River Street', status: 'follow-up',  notes: 'Moving, took business cards for friends' },
]

export const IMPORT_LEAD_COUNT = RAW_LEADS.length // 59

async function geocodeAddress(shortAddress: string): Promise<{ lat: number; lng: number }> {
  const url =
    `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(shortAddress)}` +
    `&city=Oakville&state=Ontario&country=Canada&format=json&limit=1`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'OakandIron-Sales-CRM/1.0' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: Array<{ lat: string; lon: string }> = await res.json()
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
    console.warn('[geocode] No result for:', shortAddress)
  } catch (err) {
    console.warn('[geocode] Error for:', shortAddress, err)
  }
  return OAKVILLE_FALLBACK
}

export async function importRealLeads(
  assignedRep = '',
  onProgress?: (current: number, total: number) => void
): Promise<{ inserted: number; failed: number }> {
  let inserted = 0
  let failed = 0
  const now = new Date().toISOString()
  const total = RAW_LEADS.length

  for (let i = 0; i < RAW_LEADS.length; i++) {
    // Respect Nominatim's 1 request/second policy
    if (i > 0) await new Promise<void>((r) => setTimeout(r, 1000))

    onProgress?.(i + 1, total)

    const raw = RAW_LEADS[i]
    const coords = await geocodeAddress(raw.address)

    const lead = {
      id: crypto.randomUUID(),
      householdName: raw.address,
      address: `${raw.address}, Oakville, ON`,
      lat: coords.lat,
      lng: coords.lng,
      contactName: '',
      phone: '',
      email: '',
      status: raw.status,
      notes: raw.notes,
      assignedRep,
      createdAt: now,
      updatedAt: now,
    }

    const { error } = await supabase.from('leads').insert(leadToRow(lead))
    if (error) {
      console.error('[import] Failed to insert', raw.address, error.message)
      failed++
    } else {
      inserted++
    }
  }

  return { inserted, failed }
}
