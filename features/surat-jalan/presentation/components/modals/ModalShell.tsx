'use client'

import { X } from 'lucide-react'

interface ModalShellProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  widthClass?: string
}

export default function ModalShell({ open, title, subtitle, onClose, children, widthClass = 'max-w-[480px]' }: ModalShellProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${widthClass} mx-4 animate-modalEnter`}>
        <div className="flex items-start justify-between p-6 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <div>
            <div className="text-lg font-semibold">{title}</div>
            {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
