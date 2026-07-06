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

export default function RevertPaymentModal({ open, invoice, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  const canConfirm = reason.trim().length >= 5

  const dpAmount = invoice?.down_payment_amount ?? 0
  const regularCount = invoice?.payments.length ?? 0
  const regularAmount = Math.max(0, (invoice?.paid_amount ?? 0) - dpAmount)

  return (
    <ModalShell open={open} onClose={onClose} title="Batalkan Status Lunas" subtitle="Invoice akan kembali ke status Terbit agar bisa diedit">
      <div className="space-y-4">
        <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
          Status invoice akan dikembalikan dari <strong>Lunas</strong> ke <strong>Terbit</strong>. Setelah itu isi invoice (rincian item, pajak, tanggal, DP, metode bayar) bisa diedit kembali.
        </div>

        <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B' }}>
          {regularCount > 0 ? (
            <>
              <strong>{regularCount} pembayaran reguler ({formatRupiah(regularAmount)}) akan DIHAPUS.</strong> Tindakan ini tidak dapat dibatalkan.
            </>
          ) : (
            <>Tidak ada pembayaran reguler untuk dihapus.</>
          )}
          {dpAmount > 0 && (
            <>
              <br />DP/Uang Muka ({formatRupiah(dpAmount)}) <strong>dipertahankan</strong>.
            </>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Alasan Pembatalan Status Lunas *</label>
          <textarea
            className="form-input w-full text-sm"
            rows={3}
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Tuliskan alasan pembatalan (min. 5 karakter)..."
          />
          {reason.length > 0 && reason.trim().length < 5 && (
            <p className="text-xs text-red-500 mt-1">Alasan minimal 5 karakter</p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
          <button
            onClick={() => canConfirm && onConfirm(reason.trim())}
            disabled={!canConfirm}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: canConfirm ? '#D97706' : '#FCD34D' }}
          >
            Batalkan Status Lunas
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
