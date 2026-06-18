import { useEffect, useState } from 'react'
import { toast, type Toast } from '../../utils/toast'

const TYPE_STYLE: Record<Toast['type'], { color: string; bg: string; border: string }> = {
  error: { color: '#fca5a5', bg: 'rgba(127,29,29,0.55)', border: 'rgba(248,113,113,0.5)' },
  success: { color: '#86efac', bg: 'rgba(20,83,45,0.55)', border: 'rgba(74,222,128,0.5)' },
  info: { color: '#a5b4fc', bg: 'rgba(30,27,75,0.55)', border: 'rgba(129,140,248,0.5)' },
}

export default function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => toast.subscribe(setToasts), [])

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm px-3 pointer-events-none"
    >
      {toasts.map((t) => {
        const s = TYPE_STYLE[t.type]
        return (
          <div
            key={t.id}
            className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium pointer-events-auto"
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              color: s.color,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
            }}
            role="alert"
          >
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity -mr-1 px-1"
              aria-label="Dismiss"
              style={{ color: s.color }}
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}
