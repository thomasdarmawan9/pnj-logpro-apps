'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Pencil, Send, Printer, AlertTriangle, DollarSign, Paperclip, MoreHorizontal, Wallet, RotateCcw } from 'lucide-react'
import { Invoice, InvoiceStatus } from '../../domain/entities/Invoice'
import { resolveEffectiveInvoiceServiceType } from '../../domain/services/invoiceServiceType'
import { buildInvoiceItemSummary } from '../utils/itemSummary'
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

function getSettlementDate(invoice: Invoice): string | null {
  if (invoice.status !== InvoiceStatus.PAID) return null
  const dates = invoice.payments.map(p => p.payment_date)
  if (invoice.down_payment) dates.push(invoice.down_payment.payment_date)
  if (dates.length === 0) return null
  return dates.reduce((latest, d) => (d > latest ? d : latest))
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
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const overdue = invoice.status === InvoiceStatus.OUTSTANDING && new Date(invoice.due_date) < new Date()
  const overdayCount = overdue ? daysOverdue(invoice.due_date) : 0
  const settlementDate = getSettlementDate(invoice)
  const effectiveServiceType = resolveEffectiveInvoiceServiceType(invoice.service_type, invoice.custom_service_name)
  const itemSummary = buildInvoiceItemSummary(invoice)
  const canAttachSJ = effectiveServiceType !== 'rental'
  const isEligibleForBulkPayment = invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OUTSTANDING
  const isReadOnly = role === 'admin_finance'
  const canRecordPayment = role === 'super_admin' || role === 'admin_finance'
  const serviceTypeLabel = effectiveServiceType === 'rental' && invoice.service_type !== 'other'
    ? 'Penyewaan'
    : invoice.service_type === 'other'
      ? invoice.custom_service_name || 'Lainnya'
      : 'Pengiriman'
  const serviceTypeStyle = effectiveServiceType === 'rental'
    ? { backgroundColor: '#FEF3C7', color: '#92400E' }
    : invoice.service_type === 'other'
      ? { backgroundColor: '#EDE9FE', color: '#6D28D9' }
      : { backgroundColor: '#DBEAFE', color: '#1D4ED8' }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(false)
    document.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [menuOpen])

  const toggleMenu = () => {
    if (!menuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setMenuOpen(open => !open)
  }

  const rowStyle: React.CSSProperties = invoice.status === InvoiceStatus.VOID
    ? { opacity: 0.6 }
    : overdue
    ? { backgroundColor: '#FEF2F2', borderLeft: '2px solid #DC2626' }
    : {}

  return (
    <tr className="border-t hover:bg-gray-50/50 transition-colors" style={{ borderColor: 'var(--border-card)', ...rowStyle }}>
      <td className="px-3 py-2.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(invoice.uuid)}
          disabled={!isEligibleForBulkPayment}
          className="rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title={isEligibleForBulkPayment ? undefined : 'Hanya invoice Terbit/Outstanding yang bisa dipilih'}
        />
      </td>
      <td className="px-3 py-2.5">
        <button
          onClick={() => onAction('detail', invoice.uuid)}
          className="font-mono text-xs font-semibold hover:underline"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-primary)' }}
        >
          #{invoice.invoice_number}
        </button>
        {invoice.has_down_payment && (
          <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
            <Wallet size={10} />
            DP
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-600">{formatDate(invoice.invoice_date)}</td>
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold" style={serviceTypeStyle}>
          {serviceTypeLabel}
        </span>
      </td>
      <td className="px-3 py-2.5 align-top max-w-xs">
        {itemSummary.length === 0 ? (
          <span className="text-xs text-gray-400">-</span>
        ) : effectiveServiceType === 'rental' ? (
          <div className="space-y-1.5">
            {itemSummary.map((line, idx) => (
              <div key={idx} className="leading-snug">
                <div className="text-xs font-medium text-gray-800">{line.primary}</div>
                {line.detail && <div className="text-[11px] text-gray-500">{line.detail}</div>}
              </div>
            ))}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {itemSummary.map((line, idx) => (
              <li key={idx} className="text-xs text-gray-700 leading-snug flex gap-1.5">
                <span className="text-gray-400">•</span>
                <span>{line.primary}</span>
              </li>
            ))}
          </ul>
        )}
      </td>
      <td className="px-3 py-2.5 align-top">
        <div className="text-xs font-semibold">{invoice.customer.name}</div>
        <div className="text-[11px] text-gray-500">{invoice.project?.name || '-'}</div>
      </td>
      <td className="px-3 py-2.5 text-xs text-right font-bold font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(invoice.total_amount)}</td>
      <td className="px-3 py-2.5"><InvoiceStatusBadge status={invoice.status} /></td>
      <td className="px-3 py-2.5">
        <div className="text-xs text-gray-600">{settlementDate ? formatDate(settlementDate) : '-'}</div>
        {overdue && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 mt-0.5">
            <AlertTriangle size={11} />
            Terlambat {overdayCount} hari
          </span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={toggleMenu}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && menuPos && createPortal(
            <div
              ref={menuRef}
              className="fixed w-52 bg-white rounded-xl shadow-lg border py-1"
              style={{ top: menuPos.top, right: menuPos.right, zIndex: 100000, borderColor: 'var(--border-card)' }}
            >
              <ActionMenuItem icon={<Eye size={14}/>} label="Lihat Detail" onClick={() => { setMenuOpen(false); onAction('detail', invoice.uuid) }} />
              {!isReadOnly && invoice.status === InvoiceStatus.DRAFT && (
                <>
                  <ActionMenuItem icon={<Pencil size={14}/>} label="Edit Invoice" onClick={() => { setMenuOpen(false); onAction('edit', invoice.uuid) }} />
                  <ActionMenuItem icon={<Send size={14}/>} label="Kirim ke Customer" onClick={() => { setMenuOpen(false); onAction('send', invoice.uuid) }} />
                </>
              )}
              {(invoice.status === InvoiceStatus.SENT || invoice.status === InvoiceStatus.OUTSTANDING) && (
                <>
                  {canRecordPayment && <ActionMenuItem icon={<DollarSign size={14}/>} label="Catat Pembayaran" onClick={() => { setMenuOpen(false); onAction('payment', invoice.uuid) }} />}
                  {!isReadOnly && canAttachSJ && <ActionMenuItem icon={<Paperclip size={14}/>} label="Kelola SJ Terlampir" onClick={() => { setMenuOpen(false); onAction('attach-sj', invoice.uuid) }} />}
                </>
              )}
              {!isReadOnly && invoice.status === InvoiceStatus.SENT && (role === 'super_admin' || role === 'admin_finance') && (
                <ActionMenuItem
                  icon={<Pencil size={14}/>}
                  label="Edit Invoice"
                  onClick={() => { setMenuOpen(false); onAction('edit', invoice.uuid) }}
                />
              )}
              {!isReadOnly && (invoice.status === InvoiceStatus.OUTSTANDING || invoice.status === InvoiceStatus.PAID) && role === 'super_admin' && (
                <ActionMenuItem
                  icon={<Wallet size={14}/>}
                  label="Edit DP / Uang Muka"
                  onClick={() => { setMenuOpen(false); onAction('edit', invoice.uuid) }}
                />
              )}
              {!isReadOnly && invoice.status === InvoiceStatus.PAID && (role === 'super_admin' || role === 'admin_finance') && (
                <ActionMenuItem
                  icon={<RotateCcw size={14}/>}
                  label="Batalkan Status Lunas"
                  onClick={() => { setMenuOpen(false); onAction('revert-payment', invoice.uuid) }}
                />
              )}
              {!isReadOnly && invoice.status === InvoiceStatus.VOID && role === 'super_admin' && (
                <ActionMenuItem
                  icon={<Pencil size={14}/>}
                  label="Edit Tanggal Invoice"
                  onClick={() => { setMenuOpen(false); onAction('edit', invoice.uuid) }}
                />
              )}
              <ActionMenuItem icon={<Printer size={14}/>} label="Cetak PDF" onClick={() => { setMenuOpen(false); onAction('print', invoice.uuid) }} />
              {(invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.VOID) && role === 'super_admin' && (
                <ActionMenuItem icon={<AlertTriangle size={14}/>} label="Void Invoice" danger onClick={() => { setMenuOpen(false); onAction('void', invoice.uuid) }} />
              )}
            </div>,
            document.body,
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
