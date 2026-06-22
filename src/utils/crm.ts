import { createClient } from '@supabase/supabase-js'

// The business CRM lives in a SEPARATE Supabase project. When a rep requests a
// quote on a lead, we insert a row into the CRM's `leads` table so it shows up
// at the top of their pipeline (status defaults to "New Lead" on that side).
const crmUrl = import.meta.env.VITE_CRM_SUPABASE_URL as string | undefined
const crmKey = import.meta.env.VITE_CRM_SUPABASE_ANON_KEY as string | undefined

export const crmEnabled = !!(crmUrl && crmKey)

const crm = crmEnabled ? createClient(crmUrl as string, crmKey as string) : null

export interface QuoteRequestInput {
  name: string
  phone: string
  email: string
  address: string
  notes: string
  rep: string
}

export async function sendQuoteRequest(
  input: QuoteRequestInput
): Promise<{ ok: boolean; error?: string }> {
  if (!crm) return { ok: false, error: 'CRM is not configured' }

  const stamp = new Date().toLocaleDateString('en-CA')
  const note = [
    input.notes?.trim(),
    `Quote requested via door-to-door app${input.rep ? ` by ${input.rep}` : ''} on ${stamp}.`,
  ]
    .filter(Boolean)
    .join('\n')

  const { error } = await crm.from('leads').insert({
    name: input.name?.trim() || input.address || 'Door-to-door lead',
    phone: input.phone || '',
    email: input.email || '',
    address: input.address || '',
    referral_source: 'Door Knocking',
    property_type: 'Residential',
    notes: note,
    tags: ['Door-to-door'],
    // status ("New Lead"), quote_status ("Not Sent") and pipeline_value (0) use
    // the CRM table defaults, so the request lands at the top of the pipeline.
  })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
