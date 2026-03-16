'use client'

import { useEffect, useState } from 'react'
import ModalShell from './ModalShell'
import { SuratJalan, StatusLampiran } from '../../../domain/entities/SuratJalan'

interface VoidModalProps {
  open: boolean
  sj: SuratJalan | null
  onClose: () => void
  onConfirm: (reason: string, confirmation: string) => void
}

export default function VoidModal({ open, sj, onClose, onConfirm }: VoidModalProps) {
  const [reason, setReason] = useState('')
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (open) {
      setReason('')
      setConfirmation('')
    }
  }, [open])

  const canConfirm = reason.trim().length >= 10 && confirmation === 'VOID'

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Void Surat Jalan"
      subtitle="Tindakan ini tidak dapat dibatalkan"
    >
      <div className="space-y-4">
        <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', color: '#991B1B' }}>
          SJ ini akan diubah menjadi VOID dan tidak dapat digunakan kembali.
        </div>

        {sj?.invoice_attachment_status === StatusLampiran.ATTACHED && (
          <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB', color: '#92400E' }}>
            SJ ini terlampir di Invoice #{sj?.invoice?.invoice_number}. Invoice tersebut akan kehilangan 1 lampiran SJ.
          </div>
        )}

        <label className="text-xs font-medium" style={{ color: '#374151' }}>
          Alasan Void *
          <textarea
            className="form-input w-full mt-1"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Tuliskan alasan pembatalan..."
          />
        </label>

        <label className="text-xs font-medium" style={{ color: '#374151' }}>
          Ketik &quot;VOID&quot; untuk mengkonfirmasi
          <input
            className="form-input w-full mt-1"
            value={confirmation}
            onChange={e => setConfirmation(e.target.value)}
            placeholder="VOID"
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--border-card)' }}>
            Batal
          </button>
          <button
            onClick={() => onConfirm(reason, confirmation)}
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: canConfirm ? '#DC2626' : '#FCA5A5' }}
            disabled={!canConfirm}
          >
            Void Surat Jalan
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
