'use client'

import { AlertTriangle, X } from 'lucide-react'

interface DeleteConfirmModalProps {
  open: boolean
  title: string
  description: string
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteConfirmModal({
  open,
  title,
  description,
  isSubmitting = false,
  onClose,
  onConfirm,
}: DeleteConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="font-bold text-base">{title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100">
            <p className="text-xs text-red-700 font-medium">
              Perhatian: Tindakan ini tidak dapat dibatalkan dan akan mempengaruhi saldo stok.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t" style={{ borderColor: 'var(--border-card)' }}>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-600 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--border-card)' }}
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
