'use client'

import { useState, useRef, useEffect } from 'react'
import { Eye, Pencil, Send, Printer, AlertTriangle, DollarSign, Paperclip, MoreHorizontal } from 'lucide-react'
import { Invoice, InvoiceStatus } from '../../domain/entities/Invoice'
import InvoiceStatusBadge from './InvoiceStatusBadge'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysOverdue(due: string): number {
  const now = new Date()
  const dueDate = new Date(due)
  return Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
}

interface Props {
  invoice: Invoice
  checked: boolean
  onToggle: (uuid: string) => void
  onAction: (action: string, uuid: string) => void
  role: string
}

export default function InvoiceTableRow({ invoice, checked, onToggle, onAction, role }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const overdue = invoice.status === InvoiceStatus.OUTSTANDING && new Date(invoice.due_date) < new Date()
  const overdayCount = overdue ? daysOverdue(invoice.due_date) : 0

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const rowStyle: React.CSSProperties = invoice.status === InvoiceStatus.VOID
    ? { opacity: 0.6 }
    : overdue
    ? { backgroundColor: '#FEF2F2', borderLeft: '2px solid #DC2626' }
    : {}

  return (
    <tr className="border-t hover:bg-gray-50/50 transition-colors" style={{ borderColor: 'var(--border-card)', ...rowStyle }}>
      <td className="px-4 py-3">
        <input type="checkbox" checked={checked} onChange={() => onToggle(invoice.uuid)} className="rounded" />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onAction('detail', invoice.uuid)}
          className="font-mono text-sm font-semibold hover:underline"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-primary)' }}
        >
          #{invoice.invoice_number}
        </button>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(invoice.invoice_date)}</td>
      <td className="px-4 py-3">
        <div className="text-sm font-semibold">{invoice.customer.name}</div>
      </td>
      <td className="px-4 py-3 text-sm text-right font-bold font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(invoice.total_amount)}</td>
      <td className="px-4 py-3"><InvoiceStatusBadge status={invoice.status} /></td>
      <td className="px-4 py-3">
        <div className="text-sm text-gray-600">{formatDate(invoice.due_date)}</div>
        {overdue && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 mt-0.5">
            <AlertTriangle size={11} />
            Terlambat {overdayCount} hari
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border z-20 py-1" style={{ borderColor: 'var(--border-card)' }}>
              <ActionMenuItem icon={<Eye size={14}/>} label="Lihat Detail" onClick={() => { setMenuOpen(false); onAction('detail', invoice.uuid) }} />
              {invoice.status === InvoiceStatus.DRAFT && (
                <>
                  <ActionMenuItem icon={<Pencil size={14}/>} label="Edit Invoice" onClick={() => { setMenuOpen(false); onAction('edit', invoice.uuid) }} />
                  <ActionMenuItem icon={<Send size={14}/>} label="Kirim ke Customer" onClick={() => { setMenuOpen(false); onAction('send', invoice.uuid) }} />
                </>
              )}
              {(invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OUTSTANDING) && (
                <>
                  <ActionMenuItem icon={<DollarSign size={14}/>} label="Catat Pembayaran" onClick={() => { setMenuOpen(false); onAction('payment', invoice.uuid) }} />
                  <ActionMenuItem icon={<Paperclip size={14}/>} label="Kelola SJ Terlampir" onClick={() => { setMenuOpen(false); onAction('attach-sj', invoice.uuid) }} />
                </>
              )}
              <ActionMenuItem icon={<Printer size={14}/>} label="Cetak PDF" onClick={() => { setMenuOpen(false); onAction('print', invoice.uuid) }} />
              {(invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.VOID) && role === 'super_admin' && (
                <ActionMenuItem icon={<AlertTriangle size={14}/>} label="Void Invoice" danger onClick={() => { setMenuOpen(false); onAction('void', invoice.uuid) }} />
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

function ActionMenuItem({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-gray-50 transition-colors text-left"
      style={{ color: danger ? '#DC2626' : 'var(--text-primary)' }}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}
