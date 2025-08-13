import React, { useEffect, useState } from 'react'

export type ToastKind = 'info' | 'success' | 'warn' | 'error'
export type Toast = { id: string; kind: ToastKind; text: string; ttlMs?: number }

let pushToastImpl: ((t: Omit<Toast, 'id'>) => void) | null = null

export function pushToast(t: Omit<Toast, 'id'>) {
  if (pushToastImpl) pushToastImpl(t)
}

const bgFor: Record<ToastKind, string> = {
  info: 'linear-gradient(135deg,#3B82F6 0%, #2563EB 100%)',
  success: 'linear-gradient(135deg,#10B981 0%, #059669 100%)',
  warn: 'linear-gradient(135deg,#F59E0B 0%, #D97706 100%)',
  error: 'linear-gradient(135deg,#EF4444 0%, #DC2626 100%)',
}

const borderFor: Record<ToastKind, string> = {
  info: 'rgba(59,130,246,0.35)',
  success: 'rgba(16,185,129,0.35)',
  warn: 'rgba(245,158,11,0.35)',
  error: 'rgba(239,68,68,0.35)',
}

export const Toaster: React.FC = () => {
  const [items, setItems] = useState<Toast[]>([])

  useEffect(() => {
    pushToastImpl = (t) => {
      const id = Math.random().toString(36).slice(2)
      const ttl = typeof t.ttlMs === 'number' && t.ttlMs > 0 ? t.ttlMs : 3000
      setItems((prev) => [...prev, { id, ...t }])
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), ttl)
    }
    return () => {
      pushToastImpl = null
    }
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      {items.map((i) => (
        <div
          key={i.id}
          style={{
            color: '#fff',
            padding: '12px 14px',
            borderRadius: 10,
            minWidth: 220,
            maxWidth: 360,
            background: bgFor[i.kind],
            border: `1px solid ${borderFor[i.kind]}`,
            boxShadow: '0 8px 24px rgba(0,0,0,.35)',
            fontWeight: 600,
          }}
          aria-label={`${i.kind}: ${i.text}`}
        >
          {i.text}
        </div>
      ))}
    </div>
  )
}
