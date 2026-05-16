'use client'

import { useEffect, useState } from 'react'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'
import { Invoice, InvoiceStatus } from '../../../domain/entities/Invoice'
import PaymentProgressBar from '../PaymentProgressBar'
import usePayment from '../../hooks/usePayment'
import { useToast } from '@/components/toast/useToast'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatNumber(n: number): string {
  return n > 0 ? n.toLocaleString('id-ID') : ''
}


interface Props {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onSuccess?: (newStatus: InvoiceStatus) => void
}

const QUICK_AMOUNTS = [50_000_000, 100_000_000]

export default function RecordPaymentModal({ open, invoice, onClose, onSuccess }: Props) {
  const remaining = invoice ? invoice.remaining_amount : 0
  const { form, errors, isSubmitting, update, submit, reset } = usePayment(invoice?.uuid ?? '', remaining)
  const { push: pushToast } = useToast()

  // Pisahkan display string dari form.amount agar user bisa ketik bebas
  // tanpa cursor lompat akibat re-format setiap keystroke.
  const [amountDisplay, setAmountDisplay] = useState('')

  // Reset display saat modal dibuka ulang
  useEffect(() => {
    if (open) {
      reset()
      setAmountDisplay('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleAmountChange = (raw: string) => {
    // Izinkan hanya digit dan titik/koma (stripped saat parse)
    const digitsOnly = raw.replace(/[^\d]/g, '')
    const parsed = Number(digitsOnly) || 0
    // Tampilkan apa yang user ketik (tanpa format) agar cursor tidak lompat
    setAmountDisplay(digitsOnly === '' ? '' : digitsOnly)
    update('amount', parsed)
  }

  const handleAmountBlur = () => {
    // Format rapi saat user selesai mengetik
    setAmountDisplay(formatNumber(form.amount))
  }

  const handleAmountFocus = () => {
    // Saat fokus: tampilkan angka mentah agar mudah diedit
    setAmountDisplay(form.amount > 0 ? String(form.amount) : '')
  }

  // Tombol quick amount — set langsung ke angka tetap
  const setQuickAmount = (amt: number) => {
    update('amount', amt)
    setAmountDisplay(formatNumber(amt))
  }

  const previewPaid = (invoice?.paid_amount ?? 0) + (form.amount || 0)
  const previewRemaining = Math.max(0, (invoice?.total_amount ?? 0) - previewPaid)
  const willBePaid = previewPaid >= (invoice?.total_amount ?? 0)

  const handleSubmit = async () => {
    const result = await submit()
    if (!result.ok) {
      if (result.error) {
        pushToast({ title: 'Gagal mencatat pembayaran', description: result.error, variant: 'error' })
      }
      return
    }
    onSuccess?.(willBePaid ? InvoiceStatus.PAID : invoice?.status ?? InvoiceStatus.OUTSTANDING)
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Catat Pembayaran"
      subtitle={`Invoice #${invoice?.invoice_number} · Sisa: ${formatRupiah(remaining)}`}
    >
      <div className="space-y-4">
        {invoice && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{formatRupiah(invoice.paid_amount)} / {formatRupiah(invoice.total_amount)}</span>
            </div>
            <PaymentProgressBar paidAmount={invoice.paid_amount} totalAmount={invoice.total_amount} showLabel={false} />
          </div>
        )}

        {/* Tanggal */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Pembayaran *</label>
          <input
            type="date"
            className="form-input w-full text-sm"
            value={form.payment_date}
            onChange={e => update('payment_date', e.target.value)}
          />
          {errors.payment_date && <p className="text-xs text-red-500 mt-1">{errors.payment_date}</p>}
        </div>

        {/* Nominal */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Nominal Pembayaran *</label>
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${errors.amount ? 'border-red-400' : ''}`} style={{ borderColor: errors.amount ? undefined : 'var(--border-card)' }}>
            <span className="shrink-0 text-sm text-gray-400 select-none">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              className="flex-1 text-sm font-mono bg-transparent outline-none placeholder-gray-400"
              value={amountDisplay}
              onChange={e => handleAmountChange(e.target.value)}
              onFocus={handleAmountFocus}
              onBlur={handleAmountBlur}
              placeholder="0"
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">Sisa tagihan: {formatRupiah(remaining)}</div>
          {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
          <div className="flex gap-2 mt-2 flex-wrap">
            {QUICK_AMOUNTS.map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => setQuickAmount(amt)}
                className="text-xs px-3 py-1.5 rounded-lg border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--border-card)' }}
              >
                {formatRupiah(amt)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setQuickAmount(remaining)}
              className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors hover:bg-green-50"
              style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
            >
              Lunas ({formatRupiah(remaining)})
            </button>
          </div>
        </div>

        {/* Metode */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Metode Pembayaran *</label>
          <div className="flex gap-2">
            {(['transfer', 'cash', 'check'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => update('method', m)}
                className="flex-1 py-2 rounded-xl text-xs font-medium border transition-colors"
                style={{
                  borderColor: form.method === m ? 'var(--green-primary)' : 'var(--border-card)',
                  backgroundColor: form.method === m ? '#DCFCE7' : 'white',
                  color: form.method === m ? '#166534' : 'var(--text-secondary)',
                }}
              >
                {m === 'transfer' ? 'Transfer Bank' : m === 'cash' ? 'Tunai' : 'Cek/Giro'}
              </button>
            ))}
          </div>
          {errors.method && <p className="text-xs text-red-500 mt-1">{errors.method}</p>}
        </div>

        {/* Catatan */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Catatan</label>
          <input
            className="form-input w-full text-sm"
            value={form.notes ?? ''}
            onChange={e => update('notes', e.target.value)}
            placeholder="contoh: Pembayaran tahap 2, ref. TRF-20260315"
          />
        </div>

        {/* Preview */}
        {form.amount > 0 && (
          <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: '#F9FAFB', border: '1px solid var(--border-card)' }}>
            <div className="text-xs text-gray-500 mb-1.5">Preview setelah pembayaran:</div>
            <div className="flex justify-between">
              <span className="text-gray-600">Terbayar setelah ini:</span>
              <span className="font-mono font-semibold" style={{ fontFamily: 'var(--font-mono)', color: '#166534' }}>{formatRupiah(previewPaid)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-600">Sisa tagihan:</span>
              <span className="font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(previewRemaining)}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-gray-600">Status setelah:</span>
              <span className="font-semibold" style={{ color: willBePaid ? '#166534' : '#9A3412' }}>
                {willBePaid ? '✓ LUNAS' : 'OUTSTANDING'}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border text-sm disabled:opacity-50"
            style={{ borderColor: 'var(--border-card)' }}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
