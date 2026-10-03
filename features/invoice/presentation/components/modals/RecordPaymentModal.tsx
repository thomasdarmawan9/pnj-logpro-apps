'use client'

import { useEffect, useState } from 'react'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'
import { Invoice, InvoiceStatus } from '../../../domain/entities/Invoice'
import PaymentProgressBar from '../PaymentProgressBar'
import usePayment from '../../hooks/usePayment'
import { useToast } from '@/components/toast/useToast'
import { todayDateOnly } from '@/lib/dateOnly'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatNumber(n: number): string {
  return n > 0 ? n.toLocaleString('id-ID') : ''
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}


interface Props {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
  onSuccess?: (newStatus: InvoiceStatus) => void
}

const QUICK_AMOUNTS = [50_000_000, 100_000_000]

export default function RecordPaymentModal({ open, invoice, onClose, onSuccess }: Props) {
  const [selectedTaxPercent, setSelectedTaxPercent] = useState<number | undefined>()
  const [selectedPphPercent, setSelectedPphPercent] = useState<number | undefined>()
  const taxPercent = selectedTaxPercent ?? invoice?.tax_percent ?? 0
  const pphPercent = selectedPphPercent ?? invoice?.pph_percent ?? 0
  const taxChanged = !!invoice && (taxPercent !== invoice.tax_percent || pphPercent !== invoice.pph_percent)
  const subtotal = invoice && taxChanged
    ? invoice.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.unit_price || 0), 0)
    : invoice?.subtotal_amount ?? 0
  const rawTaxAmount = subtotal * taxPercent / 100
  const rawPphAmount = subtotal * pphPercent / 100
  const taxAmount = taxChanged ? round2(rawTaxAmount) : invoice?.tax_amount ?? 0
  const pphAmount = taxChanged ? round2(rawPphAmount) : invoice?.pph_amount ?? 0
  const previewTotal = taxChanged
    ? round2(subtotal + rawTaxAmount - rawPphAmount + (invoice?.insurance_amount ?? 0))
    : invoice?.total_amount ?? 0
  const remaining = round2(Math.max(0, previewTotal - (invoice?.paid_amount ?? 0)))
  const exceedsExistingPayments = !!invoice && invoice.paid_amount > previewTotal + 0.001
  const { form, errors, isSubmitting, update, submit, reset } = usePayment(invoice?.uuid ?? '', remaining, invoice?.invoice_date)
  const { push: pushToast } = useToast()

  // Pisahkan display string dari form.amount agar user bisa ketik bebas
  // tanpa cursor lompat akibat re-format setiap keystroke.
  const [amountDisplay, setAmountDisplay] = useState('')

  // Reset display saat modal dibuka ulang
  useEffect(() => {
    if (open) {
      reset(invoice?.tax_percent, invoice?.pph_percent)
      setSelectedTaxPercent(invoice?.tax_percent ?? 0)
      setSelectedPphPercent(invoice?.pph_percent ?? 0)
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
  const previewRemaining = round2(Math.max(0, previewTotal - previewPaid))
  const willBePaid = previewTotal > 0 && previewPaid >= previewTotal

  const toggleTax = (field: 'tax_percent' | 'pph_percent', enabled: boolean) => {
    const current = field === 'tax_percent' ? invoice?.tax_percent : invoice?.pph_percent
    const percent = enabled ? (current && current > 0 ? current : field === 'tax_percent' ? 1.1 : 2) : 0
    if (field === 'tax_percent') setSelectedTaxPercent(percent)
    else setSelectedPphPercent(percent)
    update(field, percent)
  }

  const handleSubmit = async () => {
    if (isSubmitting || exceedsExistingPayments) return
    const result = await submit()
    if (!result.ok) {
      if (result.error) {
        pushToast({ title: 'Gagal mencatat pembayaran', description: result.error, variant: 'error' })
      }
      return
    }
    onSuccess?.(result.status ?? (willBePaid ? InvoiceStatus.PAID : invoice?.status ?? InvoiceStatus.OUTSTANDING))
  }

  return (
    <ModalShell
      open={open}
      onClose={() => { if (!isSubmitting) onClose() }}
      title="Catat Pembayaran"
      subtitle={`Invoice #${invoice?.invoice_number} · Sisa: ${formatRupiah(remaining)}`}
      widthClass="max-w-[480px] max-h-[calc(100dvh-2rem)] overflow-y-auto"
    >
      <div className="space-y-4">
        {invoice && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{formatRupiah(invoice.paid_amount)} / {formatRupiah(previewTotal)}</span>
            </div>
            <PaymentProgressBar paidAmount={invoice.paid_amount} totalAmount={previewTotal} showLabel={false} />
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
            min={invoice?.invoice_date}
            max={todayDateOnly()}
          />
          {errors.payment_date && <p className="text-xs text-red-500 mt-1">{errors.payment_date}</p>}
        </div>

        {/* Pilihan pajak saat pembayaran, langsung mengubah netto invoice. */}
        <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: 'var(--border-card)' }}>
          <div className="text-xs font-semibold text-gray-700">Pajak invoice saat pembayaran</div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={taxPercent > 0} onChange={e => toggleTax('tax_percent', e.target.checked)} />
              <span>Aktifkan PPN ({taxPercent > 0 ? taxPercent : invoice?.tax_percent || 1.1}%)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pphPercent > 0} onChange={e => toggleTax('pph_percent', e.target.checked)} />
              <span>Aktifkan PPh ({pphPercent > 0 ? pphPercent : invoice?.pph_percent || 2}%)</span>
            </label>
          </div>
          <div className="border-t pt-2 space-y-1 text-xs" style={{ borderColor: 'var(--border-card)' }}>
            <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
            {taxPercent > 0 && <div className="flex justify-between"><span>PPN {taxPercent}%</span><span>+ {formatRupiah(taxAmount)}</span></div>}
            {pphPercent > 0 && <div className="flex justify-between"><span>PPh {pphPercent}%</span><span>− {formatRupiah(pphAmount)}</span></div>}
            {!!invoice?.insurance_amount && <div className="flex justify-between"><span>Asuransi</span><span>+ {formatRupiah(invoice.insurance_amount)}</span></div>}
            <div className="flex justify-between font-semibold border-t pt-1" style={{ borderColor: 'var(--border-card)' }}><span>Netto invoice</span><span>{formatRupiah(previewTotal)}</span></div>
          </div>
          {exceedsExistingPayments && <p className="text-xs text-red-600">Netto baru lebih kecil dari pembayaran yang sudah tercatat. Pilih pajak lain sebelum menyimpan.</p>}
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
              disabled={remaining <= 0}
              className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors hover:bg-green-50 disabled:opacity-50"
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
                {willBePaid ? '✓ LUNAS' : invoice?.status === InvoiceStatus.SENT ? 'TERBIT' : 'OUTSTANDING'}
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
            disabled={isSubmitting || exceedsExistingPayments}
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
