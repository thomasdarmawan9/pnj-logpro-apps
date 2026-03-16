'use client'

import { useMemo, useState } from 'react'
import { MoreHorizontal, Eye, Printer, Pencil, CheckCircle, AlertTriangle, Paperclip, Trash2, Play } from 'lucide-react'
import { SuratJalan, StatusLampiran, StatusOperasional } from '../../domain/entities/SuratJalan'
import SJStatusBadge from './SJStatusBadge'
import { formatRupiah, formatShortDate } from '../utils/format'

interface SJTableRowProps {
  sj: SuratJalan
  checked: boolean
  onToggle: (uuid: string) => void
  onAction: (action: string, uuid: string) => void
  role?: 'super_admin' | 'admin_ops' | 'admin_finance'
}

export default function SJTableRow({ sj, checked, onToggle, onAction, role }: SJTableRowProps) {
  const [open, setOpen] = useState(false)
  const isAttention = sj.status === StatusOperasional.DELIVERED && sj.invoice_attachment_status === StatusLampiran.NO_INVOICE

  const actions = useMemo(() => {
    const common: { id: string; label: string; icon: typeof Eye; danger?: boolean }[] = [
      { id: 'detail', label: 'Lihat Detail', icon: Eye },
      { id: 'print', label: 'Cetak PDF', icon: Printer },
    ]
    if (role === 'admin_finance') return common

    if (sj.status === StatusOperasional.DRAFT) {
      return [
        ...common,
        { id: 'edit', label: 'Edit SJ', icon: Pencil },
        { id: 'assign', label: 'Assign & Terbitkan', icon: Play },
        { id: 'delete', label: 'Hapus Draft', icon: Trash2, danger: true },
      ]
    }
    if (sj.status === StatusOperasional.ASSIGNED) {
      return [
        ...common,
        { id: 'edit', label: 'Edit SJ', icon: Pencil },
        { id: 'deliver', label: 'Konfirmasi Tiba', icon: CheckCircle },
        ...(role === 'super_admin' ? [{ id: 'void', label: 'Void SJ', icon: AlertTriangle, danger: true }] : []),
      ]
    }
    if (sj.status === StatusOperasional.DELIVERED) {
      return [
        ...common,
        ...(sj.invoice_attachment_status === StatusLampiran.NO_INVOICE ? [{ id: 'attach', label: 'Lampirkan ke Invoice', icon: Paperclip }] : []),
        ...(role === 'super_admin' ? [{ id: 'void', label: 'Void SJ', icon: AlertTriangle, danger: true }] : []),
      ]
    }
    if (sj.status === StatusOperasional.VOID) {
      return common
    }
    return common
  }, [sj.status, sj.invoice_attachment_status, role])

  return (
    <tr
      className={`${isAttention ? 'row-attention' : ''} ${sj.status === StatusOperasional.VOID ? 'opacity-60' : ''}`}
      title={isAttention ? 'SJ ini belum dilampirkan ke invoice manapun' : undefined}
    >
      <td className="px-4 py-3">
        <input type="checkbox" checked={checked} onChange={() => onToggle(sj.uuid)} />
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onAction('detail', sj.uuid)}
          className={`font-semibold text-sm font-mono text-green-700 hover:underline ${sj.status === StatusOperasional.VOID ? 'line-through' : ''}`}
          style={{ color: 'var(--green-primary)' }}
        >
          {sj.sj_number}
        </button>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{formatShortDate(sj.sj_date)}</td>
      <td className="px-4 py-3">
        <div className="text-sm font-semibold">{sj.project.name}</div>
        <div className="text-xs text-gray-500">{sj.customer.name}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-semibold flex items-center gap-2">
          {sj.fleet.is_tbd ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Belum Ditentukan</span>
          ) : (
            `${sj.fleet.name} (${sj.fleet.plate_number})`
          )}
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-1">
          {sj.driver?.name || sj.driver_name_manual || 'Belum ada supir'}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-right font-mono">{formatRupiah(sj.operational_cost)}</td>
      <td className="px-4 py-3">
        <SJStatusBadge statusOps={sj.status} />
      </td>
      <td className="px-4 py-3">
        <SJStatusBadge statusOps={sj.status} statusLampiran={sj.invoice_attachment_status} invoiceNumber={sj.invoice?.invoice_number || null} />
      </td>
      <td className="px-4 py-3 text-right relative">
        <button
          onClick={() => setOpen(v => !v)}
          className="p-2 rounded-lg border"
          style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}
        >
          <MoreHorizontal size={16} />
        </button>
        {open && (
          <div className="absolute right-4 mt-2 w-52 rounded-xl border bg-white shadow-lg z-20 text-left">
            {actions.map(action => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    setOpen(false)
                    onAction(action.id, sj.uuid)
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${action.danger ? 'text-red-600' : 'text-gray-700'}`}
                >
                  <Icon size={14} />
                  {action.label}
                </button>
              )
            })}
          </div>
        )}
      </td>
    </tr>
  )
}
