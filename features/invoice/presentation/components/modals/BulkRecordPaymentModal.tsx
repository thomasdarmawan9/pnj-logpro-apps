'use client'

import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '@/store'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'
import { Invoice } from '../../../domain/entities/Invoice'
import { bulkRecordPayments } from '@/store/slices/invoiceSlice'
import { todayDateOnly } from '@/lib/dateOnly'
import { calculateRemainingAmount, roundInvoiceAmount } from '../../../domain/services/invoiceAmounts'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
}

const METHOD_OPTIONS: { value: 'transfer' | 'cash' | 'check'; label: string }[] = [
  { value: 'transfer', label: 'Transfer Bank' },
  { value: 'cash', label: 'Tunai' },
  { value: 'check', label: 'Cek/Giro' },
]

type TaxChoice = { ppn: boolean; pph: boolean }

function taxChoiceFor(invoice: Invoice): TaxChoice {
  return { ppn: invoice.tax_percent > 0, pph: invoice.pph_percent > 0 }
}

function paymentPreview(invoice: Invoice, taxPercent: number, pphPercent: number) {
  const changed = taxPercent !== invoice.tax_percent || pphPercent !== invoice.pph_percent
  let total = invoice.total_amount
  if (changed) {
    const subtotal = invoice.items.reduce(
      (sum, item) => sum + Number(item.qty || 0) * Number(item.unit_price || 0), 0,
    )
    total = roundInvoiceAmount(
      subtotal + subtotal * taxPercent / 100 - subtotal * pphPercent / 100 + roundInvoiceAmount(invoice.insurance_amount),
    )
  }
  return {
    total,
    amount: calculateRemainingAmount(total, invoice.paid_amount),
    belowPaid: invoice.paid_amount > total + 0.001,
  }
}

interface Props {
  open: boolean
  invoices: Invoice[]
  onClose: () => void
  onSuccess: (successCount: number) => void
}

export default function BulkRecordPaymentModal({ open, invoices, onClose, onSuccess }: Props) {
  const dispatch = useDispatch<AppDispatch>()
  const today = todayDateOnly()

  const [paymentDate, setPaymentDate] = useState(today)
  const [methods, setMethods] = useState<Record<string, 'transfer' | 'cash' | 'check' | ''>>({})
  const [taxChoices, setTaxChoices] = useState<Record<string, TaxChoice>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPaymentDate(today)
      setMethods(Object.fromEntries(invoices.map(inv => [inv.uuid, ''])))
      setTaxChoices(Object.fromEntries(invoices.map(inv => [inv.uuid, taxChoiceFor(inv)])))
      setSubmitError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const rows = invoices.map(invoice => {
    const choice = taxChoices[invoice.uuid] ?? taxChoiceFor(invoice)
    const taxPercent = choice.ppn ? (invoice.tax_percent > 0 ? invoice.tax_percent : 1.1) : 0
    const pphPercent = choice.pph ? (invoice.pph_percent > 0 ? invoice.pph_percent : 2) : 0
    return { invoice, choice, taxPercent, pphPercent, ...paymentPreview(invoice, taxPercent, pphPercent) }
  })
  const total = rows.reduce((sum, row) => sum + row.amount, 0)
  const minimumPaymentDate = invoices.reduce(
    (latest, invoice) => invoice.invoice_date > latest ? invoice.invoice_date : latest,
    '',
  )
  const allMethodsSelected = rows.length > 0 && rows.every(row => methods[row.invoice.uuid])
  const allAmountsValid = rows.every(row => !row.belowPaid && row.amount > 0)
  const canSubmit = allMethodsSelected && allAmountsValid && !!paymentDate && paymentDate >= minimumPaymentDate && paymentDate <= today && !isSubmitting

  const updateTaxChoice = (invoice: Invoice, field: keyof TaxChoice, checked: boolean) => {
    setTaxChoices(prev => ({
      ...prev,
      [invoice.uuid]: { ...(prev[invoice.uuid] ?? taxChoiceFor(invoice)), [field]: checked },
    }))
    setSubmitError(null)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)

    const result = await dispatch(bulkRecordPayments({
      payment_date: paymentDate,
      payments: rows.map(row => ({
        invoice_uuid: row.invoice.uuid,
        method: methods[row.invoice.uuid] as 'transfer' | 'cash' | 'check',
        amount: row.amount,
        tax_percent: row.taxPercent,
        pph_percent: row.pphPercent,
      })),
      notes: 'Pembayaran pelunasan',
    }))

    setIsSubmitting(false)
    if (bulkRecordPayments.rejected.match(result)) {
      setSubmitError((result.payload as string) || 'Pelunasan massal gagal disimpan.')
      return
    }
    onSuccess(invoices.length)
  }

  return (
    <ModalShell
      open={open}
      onClose={() => { if (!isSubmitting) onClose() }}
      title="Catat Lunas Massal"
      subtitle={`${invoices.length} invoice dipilih`}
      widthClass="max-w-[720px] max-h-[calc(100dvh-2rem)] overflow-y-auto"
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
            {rows.map(row => (
              <div key={row.invoice.uuid} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_9rem] sm:items-center gap-2 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="text-xs font-semibold font-mono truncate" style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-primary)' }}>
                    #{row.invoice.invoice_number}
                  </div>
                  <div className="text-xs text-gray-600 font-mono" style={{ fontFamily: 'var(--font-mono)' }}>
                    Pelunasan {formatRupiah(row.amount)}
                  </div>
                  <div className="text-[11px] text-gray-500">Netto invoice {formatRupiah(row.total)}</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-700">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.choice.ppn}
                      disabled={isSubmitting}
                      onChange={e => updateTaxChoice(row.invoice, 'ppn', e.target.checked)}
                      aria-label={`PPN invoice ${row.invoice.invoice_number}`}
                    />
                    PPN {row.choice.ppn ? row.taxPercent : row.invoice.tax_percent || 1.1}%
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={row.choice.pph}
                      disabled={isSubmitting}
                      onChange={e => updateTaxChoice(row.invoice, 'pph', e.target.checked)}
                      aria-label={`PPh invoice ${row.invoice.invoice_number}`}
                    />
                    PPh {row.choice.pph ? row.pphPercent : row.invoice.pph_percent || 2}%
                  </label>
                </div>
                <select
                  className="form-input text-xs w-full"
                  value={methods[row.invoice.uuid] ?? ''}
                  disabled={isSubmitting}
                  onChange={e => setMethods(prev => ({ ...prev, [row.invoice.uuid]: e.target.value as 'transfer' | 'cash' | 'check' }))}
                >
                  <option value="">Pilih metode</option>
                  {METHOD_OPTIONS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                {row.belowPaid && <p className="text-xs text-red-600 sm:col-span-3">Netto baru lebih kecil dari pembayaran yang sudah tercatat.</p>}
                {!row.belowPaid && row.amount <= 0 && <p className="text-xs text-red-600 sm:col-span-3">Invoice ini tidak memiliki sisa tagihan untuk dilunasi.</p>}
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="px-3 py-4 text-xs text-gray-500 text-center">Tidak ada invoice dipilih.</div>
            )}
          </div>
        </div>

        {submitError && <p role="alert" className="text-xs text-red-600">{submitError}</p>}

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
