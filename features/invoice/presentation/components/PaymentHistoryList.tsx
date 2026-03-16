'use client'

import { DollarSign, ExternalLink } from 'lucide-react'
import { Payment, InvoiceStatus } from '../../domain/entities/Invoice'
import PaymentProgressBar from './PaymentProgressBar'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

const METHOD_LABELS: Record<string, string> = {
  transfer: 'Transfer Bank',
  cash: 'Tunai',
  check: 'Cek/Giro',
}

interface Props {
  payments: Payment[]
  totalAmount: number
  paidAmount: number
  invoiceStatus: InvoiceStatus | string
  role: string
  onAddPayment: () => void
  isOverdue?: boolean
}

export default function PaymentHistoryList({ payments, totalAmount, paidAmount, invoiceStatus, role, onAddPayment, isOverdue }: Props) {
  const canRecord = (invoiceStatus === InvoiceStatus.SENT || invoiceStatus === InvoiceStatus.OUTSTANDING) &&
    (role === 'super_admin' || role === 'admin_finance')

  const remaining = totalAmount - paidAmount

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">Riwayat Pembayaran</h3>
        {canRecord && (
          <button
            onClick={onAddPayment}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            <DollarSign size={14} />
            Catat Pembayaran
          </button>
        )}
      </div>

      {/* Summary card */}
      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: '#F9FAFB', border: '1px solid var(--border-card)' }}>
        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <div className="text-gray-500 text-xs mb-1">Total Invoice</div>
            <div className="font-mono font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(totalAmount)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">Total Terbayar</div>
            <div className="font-mono font-semibold text-green-700" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(paidAmount)}</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1">Sisa Tagihan</div>
            <div className="font-mono font-semibold" style={{ fontFamily: 'var(--font-mono)', color: remaining > 0 ? '#DC2626' : '#166534' }}>{formatRupiah(remaining)}</div>
          </div>
        </div>
        <PaymentProgressBar paidAmount={paidAmount} totalAmount={totalAmount} isOverdue={isOverdue} />
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-10">
          <DollarSign size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Belum ada pembayaran tercatat</p>
          {canRecord && (
            <button onClick={onAddPayment} className="mt-3 text-sm font-medium" style={{ color: 'var(--green-primary)' }}>
              + Catat Pembayaran Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(pay => (
            <div key={pay.uuid} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: 'var(--green-primary)' }} />
                <div className="w-0.5 flex-1 mt-1" style={{ backgroundColor: 'var(--border-card)' }} />
              </div>
              <div className="pb-4 flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{formatDate(pay.payment_date)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">oleh: {pay.created_by_name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-green-700" style={{ fontFamily: 'var(--font-mono)' }}>
                      {formatRupiah(pay.amount)}
                    </div>
                  </div>
                </div>
                <div className="mt-1.5 text-sm text-gray-600">Metode: {METHOD_LABELS[pay.method] ?? pay.method}</div>
                {pay.notes && <div className="text-sm text-gray-500 mt-0.5">Catatan: {pay.notes}</div>}
                {pay.proof_path && (
                  <button className="mt-1.5 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <ExternalLink size={12} />
                    Lihat Bukti
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
