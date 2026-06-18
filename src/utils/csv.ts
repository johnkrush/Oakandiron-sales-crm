import { Lead, STATUS_CONFIG } from '../types'

export function exportToCSV(leads: Lead[]): void {
  const headers = [
    'Address',
    'Contact Name',
    'Phone',
    'Email',
    'Status',
    'Assigned Rep',
    'Notes',
    'Created At',
    'Updated At',
  ]

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`

  const rows = leads.map((l) => [
    escape(l.address),
    escape(l.contactName),
    escape(l.phone),
    escape(l.email),
    escape(STATUS_CONFIG[l.status].label),
    escape(l.assignedRep),
    escape(l.notes),
    escape(new Date(l.createdAt).toLocaleString()),
    escape(new Date(l.updatedAt).toLocaleString()),
  ])

  const csv = [headers.map(escape), ...rows].map((r) => r.join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `canvass-leads-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
