'use client'

import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDeleteModalProps {
  open: boolean
  title: string
  description: string
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  isSubmitting = false,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl animate-modalEnter" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{description}</p>
          <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs text-red-700 font-medium">
              Perhatian: Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: 'var(--border-card)' }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium rounded-xl border hover:bg-gray-50 transition-colors disabled:opacity-60"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  )
}
