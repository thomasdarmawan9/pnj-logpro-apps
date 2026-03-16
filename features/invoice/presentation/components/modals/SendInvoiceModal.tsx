'use client'

import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'
import { Invoice } from '../../../domain/entities/Invoice'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

interface Props {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onConfirm: (notes: string) => void
}

export default function SendInvoiceModal({ open, invoice, onClose, onConfirm }: Props) {
  const [notes, setNotes] = useState('')
  const [sendMethod, setSendMethod] = useState<'download' | 'mark'>('mark')

  useEffect(() => {
    if (open) { setNotes(''); setSendMethod('mark') }
  }, [open])

  return (
    <ModalShell open={open} onClose={onClose} title="Kirim Invoice ke Customer" subtitle={`Invoice #${invoice?.invoice_number}`}>
      <div className="space-y-4">
        <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF' }}>
          Invoice akan diubah statusnya menjadi <strong>OUTSTANDING</strong> setelah dikirim.
        </div>

        <div className="rounded-xl p-4 border space-y-2 text-sm" style={{ borderColor: 'var(--border-card)', backgroundColor: '#F9FAFB' }}>
          <div className="flex justify-between"><span className="text-gray-500">Kepada</span><span className="font-medium">{invoice?.customer.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">No. Invoice</span><span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{invoice?.invoice_number}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-mono font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(invoice?.total_amount ?? 0)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Jatuh Tempo</span><span>{invoice?.due_date ? formatDate(invoice.due_date) : '—'}</span></div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Pilihan Kirim</label>
          <div className="space-y-2">
            {[
              { value: 'download', label: 'Download PDF lalu kirim manual' },
              { value: 'mark', label: 'Tandai sebagai terkirim' },
            ].map(opt => (
              <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer" style={{ borderColor: sendMethod === opt.value ? 'var(--green-primary)' : 'var(--border-card)', backgroundColor: sendMethod === opt.value ? '#F0FDF4' : 'white' }}>
                <input type="radio" name="sendMethod" value={opt.value} checked={sendMethod === opt.value} onChange={() => setSendMethod(opt.value as 'download' | 'mark')} className="text-green-600" />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Catatan Pengiriman</label>
          <textarea
            className="form-input w-full text-sm"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Catatan pengiriman (opsional)..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
          <button
            onClick={() => onConfirm(notes)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            <Send size={14} />
            Tandai Sudah Dikirim
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
