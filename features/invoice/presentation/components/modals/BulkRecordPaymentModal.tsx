'use client'

import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '@/store'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'
import { Invoice } from '../../../domain/entities/Invoice'
import { bulkRecordPayments } from '@/store/slices/invoiceSlice'
import { todayDateOnly } from '@/lib/dateOnly'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

const METHOD_OPTIONS: { value: 'transfer' | 'cash' | 'check'; label: string }[] = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'cash', label: 'Tunai' },
  { value: 'check', label: 'Cek/Giro' },
]

interface Props {
  open: boolean
  invoices: Invoice[]
  onClose: () => void
  onSuccess: (successCount: number, failCount: number) => void
}

export default function BulkRecordPaymentModal({ open, invoices, onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>()
  const today = todayDateOnly()

  const [paymentDate, setPaymentDate] = useState(today)
  const [methods, setMethods] = useState<Record<string, 'transfer' | 'cash' | 'check' | ''>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setPaymentDate(today)
      setMethods(Object.fromEntries(invoices.map(inv => [inv.uuid, ''])))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const total = invoices.reduce((sum, inv) => sum + inv.remaining_amount, 0)
  const minimumPaymentDate = invoices.reduce(
    (latest, invoice) => invoice.invoice_date > latest ? invoice.invoice_date : latest,
    '',
  )
  const allMethodsSelected = invoices.length > 0 && invoices.every(inv => methods[inv.uuid])
  const canSubmit = allMethodsSelected && !!paymentDate && paymentDate >= minimumPaymentDate && paymentDate <= today && !isSubmitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)

    const result = await dispatch(bulkRecordPayments({
      payment_date: paymentDate,
      payments: invoices.map(inv => ({
        invoice_uuid: inv.uuid,
        method: methods[inv.uuid] as 'transfer' | 'cash' | 'check',
      })),
      notes: 'Pembayaran pelunasan',
    }))

    setIsSubmitting(false)
    onSuccess(
      bulkRecordPayments.fulfilled.match(result) ? invoices.length : 0,
      bulkRecordPayments.fulfilled.match(result) ? 0 : invoices.length,
    )
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Catat Lunas Massal"
      subtitle={`${invoices.length} invoice dipilih`}
      widthClass="max-w-[560px]"
    >
      <div className="space-y-4">
        {/* Tanggal */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal Pelunasan *</label>
          <input
            type="date"
            className="form-input w-full text-sm"
            value={paymentDate}
            onChange={e => setPaymentDate(e.target.value)}
            min={minimumPaymentDate || undefined}
            max={today}
          />
          {paymentDate && paymentDate < minimumPaymentDate && (
            <p className="text-xs text-red-500 mt-1">Tanggal pelunasan tidak boleh sebelum tanggal invoice yang dipilih.</p>
          )}
        </div>

        {/* Nominal Pembayaran */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Nominal Pembayaran *</label>
          <div className="rounded-xl border max-h-72 overflow-y-auto divide-y" style={{ borderColor: 'var(--border-card)' }}>
            {invoices.map(inv => (
              <div key={inv.uuid} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-xs font-semibold font-mono truncate" style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-primary)' }}>
                    #{inv.invoice_number}
                  </div>
                  <div className="text-xs text-gray-500 font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                    {formatRupiah(inv.remaining_amount)}
                  </div>
                </div>
                <select
                  className="form-input text-xs shrink-0 w-36"
                  value={methods[inv.uuid] ?? ''}
                  onChange={e => setMethods(prev => ({ ...prev, [inv.uuid]: e.target.value as 'transfer' | 'cash' | 'check' }))}
                >
                  <option value="">Pilih metode</option>
                  {METHOD_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="px-3 py-4 text-xs text-gray-500 text-center">Tidak ada invoice dipilih.</div>
            )}
          </div>
        </div>

        {/* Total */}
        <div className="rounded-xl p-3 text-sm flex items-center justify-between" style={{ backgroundColor: '#F9FAFB', border: '1px solid var(--border-card)' }}>
          <span className="text-gray-600">Total Tagihan Pelunasan</span>
          <span className="font-mono font-semibold" style={{ fontFamily: 'var(--font-mono)', color: '#166534' }}>{formatRupiah(total)}</span>
        </div>

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
            disabled={!canSubmit}
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
