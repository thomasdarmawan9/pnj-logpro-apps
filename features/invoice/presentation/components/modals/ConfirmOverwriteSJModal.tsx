'use client'

import { AlertTriangle } from 'lucide-react'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'

interface Props {
  open: boolean
  sjNumber: string
  sjStatus?: string
  onConfirm: () => void
  onCancel: () => void
}

const STATUS_LABEL: Record<string, string> = {
  draft:     'Draft',
  assigned:  'Terbit',
  delivered: 'Terkirim',
  void:      'Void',
}

export default function ConfirmOverwriteSJModal({ open, sjNumber, sjStatus, onConfirm, onCancel }: Props) {
  return (
    <ModalShell open={open} onClose={onCancel} title="Nomor SJ Sudah Ada" subtitle={`Nomor: ${sjNumber}`}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border px-3 py-3" style={{ borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }}>
          <AlertTriangle size={18} style={{ color: '#B45309' }} className="mt-0.5" />
          <p className="text-sm text-gray-700">
            SJ <strong>{sjNumber}</strong>{sjStatus ? ` (status ${STATUS_LABEL[sjStatus] || sjStatus})` : ''} sudah ada.
            Jika dilanjutkan, isi header & rincian barang SJ tersebut akan <strong>ditimpa</strong> dengan data dari invoice ini.
            Status SJ tidak berubah.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>
            Batal
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
            Ya, Timpa SJ Lama
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
