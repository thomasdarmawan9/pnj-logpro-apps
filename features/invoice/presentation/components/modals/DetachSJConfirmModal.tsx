'use client'

import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'
import { Invoice, AttachedSJ } from '../../../domain/entities/Invoice'

interface Props {
  open: boolean
  invoice: Invoice | null
  sj: AttachedSJ | null
  onClose: () => void
  onConfirm: () => void
}

export default function DetachSJConfirmModal({ open, invoice, sj, onClose, onConfirm }: Props) {
  return (
    <ModalShell open={open} onClose={onClose} title="Lepas Surat Jalan dari Invoice" widthClass="max-w-[440px]">
      <div className="space-y-4">
        <div className="rounded-xl p-3 border" style={{ borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }}>
          <p className="text-sm text-amber-800">
            Apakah Anda yakin ingin melepas <span className="font-semibold">{sj?.sj_number}</span> dari Invoice <span className="font-semibold">#{invoice?.invoice_number}</span>?
          </p>
        </div>
        <div className="rounded-xl p-3 border text-sm text-gray-600" style={{ borderColor: 'var(--border-card)', backgroundColor: '#F9FAFB' }}>
          SJ ini tetap ada dan bisa dilampirkan ke invoice lain. Total invoice tidak berubah.
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-medium border"
            style={{ borderColor: '#FCD34D', color: '#92400E', backgroundColor: '#FFFBEB' }}
          >
            Ya, Lepas SJ
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
