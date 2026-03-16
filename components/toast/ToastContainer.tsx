'use client'

import { X } from 'lucide-react'
import { useToast } from './useToast'

const variantStyles: Record<string, { bg: string; text: string; border: string }> = {
  success: { bg: '#ECFDF3', text: '#166534', border: '#86EFAC' },
  error: { bg: '#FEF2F2', text: '#991B1B', border: '#FCA5A5' },
  info: { bg: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD' },
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-5 right-5 z-[60] flex flex-col gap-3">
      {toasts.map(toast => {
        const variant = variantStyles[toast.variant || 'info']
        return (
          <div
            key={toast.id}
            className="min-w-[280px] max-w-[360px] rounded-xl border shadow-lg px-4 py-3 flex gap-3 items-start"
            style={{ backgroundColor: variant.bg, borderColor: variant.border, color: variant.text }}
          >
            <div className="flex-1">
              <div className="text-sm font-semibold">{toast.title}</div>
              {toast.description && <div className="text-xs mt-1 opacity-90">{toast.description}</div>}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded-md p-1 hover:opacity-70"
              aria-label="Tutup"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
