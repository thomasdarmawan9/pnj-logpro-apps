'use client'

import { useEffect, useState } from 'react'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'
import { Invoice } from '../../../domain/entities/Invoice'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

interface Props {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onConfirm: (reason: string) => void
}

export default function VoidInvoiceModal({ open, invoice, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('')
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (open) { setReason(''); setConfirmation('') }
  }, [open])

  const canConfirm = reason.trim().length >= 10 && confirmation === invoice?.invoice_number

  return (
    <ModalShell open={open} onClose={onClose} title="⚠ Void Invoice" subtitle="Tindakan ini tidak dapat dibatalkan">
      <div className="space-y-4">
        <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B' }}>
          Invoice ini akan dibatalkan secara permanen. Semua SJ yang terlampir akan otomatis dilepas.
        </div>

        {(invoice?.attached_sj.length ?? 0) > 0 && (
          <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
            <strong>{invoice?.attached_sj.length} SJ akan otomatis dilepas:</strong>
            <ul className="mt-1 space-y-0.5">
              {invoice?.attached_sj.map(sj => (
                <li key={sj.uuid}>· {sj.sj_number} ({sj.fleet_label})</li>
              ))}
            </ul>
          </div>
        )}

        {(invoice?.paid_amount ?? 0) > 0 && (
          <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
            <strong>⚠ Invoice ini sudah memiliki {invoice?.payments.length} pembayaran ({formatRupiah(invoice?.paid_amount ?? 0)}).</strong>
            <br />Pembayaran ini tidak akan dihapus — perlu penyesuaian manual.
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Alasan Void *</label>
          <textarea
            className="form-input w-full text-sm"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Tuliskan alasan pembatalan (min. 10 karakter)..."
          />
          {reason.length > 0 && reason.length < 10 && (
            <p className="text-xs text-red-500 mt-1">Alasan minimal 10 karakter ({reason.length}/10)</p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Ketik nomor invoice <strong className="text-gray-800">{invoice?.invoice_number}</strong> untuk mengkonfirmasi:
          </label>
          <input
            className="form-input w-full text-sm"
            value={confirmation}
            onChange={e => setConfirmation(e.target.value)}
            placeholder={invoice?.invoice_number ?? ''}
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
          <button
            onClick={() => canConfirm && onConfirm(reason)}
            disabled={!canConfirm}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: canConfirm ? '#DC2626' : '#FCA5A5' }}
          >
            Void Invoice
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
