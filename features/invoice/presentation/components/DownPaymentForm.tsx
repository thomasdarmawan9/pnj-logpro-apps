'use client'

import { useEffect, useState } from 'react'
import { Wallet, Trash2 } from 'lucide-react'
import type { CreateDownPaymentDto } from '../../application/dto/CreateInvoiceDto'

function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

interface DownPaymentFormProps {
  totalAmount: number
  initialValue?: CreateDownPaymentDto | null
  onChange: (value: CreateDownPaymentDto | null) => void
  readOnly?: boolean
  defaultDate?: string
  /** Metode pembayaran dari invoice (dipakai sebagai method DP). */
  paymentMethod: 'transfer' | 'cash' | 'check'
}

export default function DownPaymentForm({
  totalAmount,
  initialValue,
  onChange,
  readOnly = false,
  defaultDate,
  paymentMethod,
}: DownPaymentFormProps) {
  const [enabled, setEnabled] = useState<boolean>(!!initialValue)
  const [payment_date, setPaymentDate] = useState<string>(initialValue?.payment_date || defaultDate || new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState<number>(initialValue?.amount || 0)
  const [notes, setNotes] = useState<string>(initialValue?.notes || '')
  const [error, setError] = useState<string | null>(null)

  // Re-sync kalau initialValue berubah (mis. setelah fetch invoice)
  useEffect(() => {
    if (initialValue) {
      setEnabled(true)
      setPaymentDate(initialValue.payment_date)
      setAmount(initialValue.amount)
      setNotes(initialValue.notes || '')
    } else {
      setEnabled(false)
      setAmount(0)
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue?.payment_date, initialValue?.amount, initialValue?.notes])

  // Trigger onChange tiap value berubah (saat enabled).
  useEffect(() => {
    if (!enabled) {
      onChange(null)
      setError(null)
      return
    }

    const value = {
      payment_date,
      amount,
      method: paymentMethod,
      notes: notes.trim() || null,
    }

    onChange(value)

    if (amount <= 0) {
      setError('Nominal DP harus lebih dari 0.')
      return
    }
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, payment_date, amount, paymentMethod, notes, totalAmount])

  const handleToggle = () => {
    if (readOnly) return
    setEnabled(prev => !prev)
  }

  const handleClear = () => {
    if (readOnly) return
    setEnabled(false)
    setAmount(0)
    setNotes('')
  }

  const sisa = Math.max(0, totalAmount - amount)
  const isValidDP = enabled && amount > 0 && amount <= totalAmount && !error

  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border-card)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={18} style={{ color: 'var(--green-primary)' }} />
          <h3 className="text-base font-semibold">Down Payment / Uang Muka</h3>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            disabled={readOnly}
            className="sr-only peer"
          />
          <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-green-500 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5"></div>
          <span className="ml-2 text-xs text-gray-600">{enabled ? 'Aktif' : 'Tidak ada DP'}</span>
        </label>
      </div>

      {!enabled && (
        <p className="text-xs text-gray-500">
          Aktifkan toggle ini kalau customer sudah memberikan uang muka sebelum invoice ini dibuat.
          DP akan otomatis dikurangkan dari sisa tagihan.
        </p>
      )}

      {enabled && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tanggal DP *</label>
              <input
                type="date"
                className="form-input w-full"
                value={payment_date}
                onChange={e => setPaymentDate(e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Nominal DP *</label>
              <input
                type="number"
                min={0}
                step={1000}
                className={`form-input w-full ${error ? 'border-red-400' : ''}`}
                value={amount || ''}
                onChange={e => setAmount(Number(e.target.value || 0))}
                disabled={readOnly}
                placeholder="0"
              />
              {totalAmount > 0 && (
                <p className="text-[11px] text-gray-500 mt-1">
                  Maks: {formatRupiah(totalAmount)}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Catatan (opsional)</label>
            <textarea
              className="form-input w-full resize-none"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={readOnly}
              placeholder="Mis. ditransfer via BCA tanggal 10 April"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </div>
          )}

          {isValidDP && totalAmount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Invoice</span>
                <span className="font-medium">{formatRupiah(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">DP Diterima</span>
                <span className="font-medium text-green-700">- {formatRupiah(amount)}</span>
              </div>
              <div className="flex justify-between border-t border-green-200 pt-1 mt-1">
                <span className="font-semibold">Sisa Tagihan</span>
                <span className="font-bold">{formatRupiah(sisa)}</span>
              </div>
            </div>
          )}

          {!readOnly && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <Trash2 size={12} />
              Hapus DP
            </button>
          )}
        </div>
      )}
    </div>
  )
}
