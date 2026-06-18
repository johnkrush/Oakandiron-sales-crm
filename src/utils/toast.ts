// Lightweight module-level toast emitter.
// Usable from anywhere (including non-React callbacks like Supabase handlers),
// so we can surface sync failures that would otherwise be silently logged.

export type ToastType = 'error' | 'success' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
}

type Listener = (toasts: Toast[]) => void

let toasts: Toast[] = []
const listeners = new Set<Listener>()

function emit() {
  // Hand out a fresh array so React sees a new reference
  const snapshot = [...toasts]
  listeners.forEach((l) => l(snapshot))
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function show(type: ToastType, message: string, ttl = 6000): string {
  const id = crypto.randomUUID()
  toasts = [...toasts, { id, type, message }]
  emit()
  if (ttl > 0) setTimeout(() => dismiss(id), ttl)
  return id
}

export const toast = {
  error: (message: string) => show('error', message, 8000),
  success: (message: string) => show('success', message, 4000),
  info: (message: string) => show('info', message, 4000),
  dismiss,
  subscribe(listener: Listener): () => void {
    listeners.add(listener)
    listener([...toasts])
    return () => listeners.delete(listener)
  },
}

// Helper for Supabase callbacks: logs to console AND surfaces a toast.
export function reportSyncError(context: string, message: string) {
  console.error(`[supabase] ${context}:`, message)
  toast.error(`Sync failed (${context}). Your changes are saved on this device but may not reach other devices.`)
}
