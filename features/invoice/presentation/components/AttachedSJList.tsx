'use client'

import { Paperclip, Unlink, ExternalLink } from 'lucide-react'
import { AttachedSJ, InvoiceStatus } from '../../domain/entities/Invoice'

const SJ_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  delivered: { label: 'DELIVERED', color: '#166534' },
  assigned:  { label: 'ASSIGNED',  color: '#1E40AF' },
  draft:     { label: 'DRAFT',     color: '#6B7280' },
  void:      { label: 'VOID',      color: '#991B1B' },
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

interface Props {
  attachedSj: AttachedSJ[]
  invoiceStatus: InvoiceStatus | string
  role: string
  onAttach: () => void
  onDetach: (sjUuid: string) => void
}

export default function AttachedSJList({ attachedSj, invoiceStatus, role, onAttach, onDetach }: Props) {
  const canManage = invoiceStatus !== InvoiceStatus.PAID && invoiceStatus !== InvoiceStatus.VOID
  const canEdit = canManage && (role === 'super_admin' || role === 'admin_finance')

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-800">Surat Jalan Terlampir ({attachedSj.length})</h3>
          <p className="text-xs text-gray-500 mt-0.5">SJ yang dilampirkan hanya sebagai referensi — tidak mempengaruhi total invoice.</p>
        </div>
        {canEdit && (
          <button
            onClick={onAttach}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            <Paperclip size={14} />
            Lampirkan SJ
          </button>
        )}
      </div>

      {attachedSj.length === 0 ? (
        <div className="text-center py-12">
          <Paperclip size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Belum ada surat jalan yang dilampirkan</p>
          {canEdit && (
            <button onClick={onAttach} className="mt-3 text-sm font-medium" style={{ color: 'var(--green-primary)' }}>
              + Lampirkan SJ Sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {attachedSj.map(sj => {
            const statusConf = SJ_STATUS_CONFIG[sj.status] ?? SJ_STATUS_CONFIG.draft
            return (
              <div key={sj.uuid} className="border rounded-xl p-4" style={{ borderColor: 'var(--border-card)' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--green-primary)' }}>
                        {sj.sj_number}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: `${statusConf.color}18`, color: statusConf.color }}>
                        {statusConf.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatDate(sj.sj_date)}</div>
                    <div className="text-sm mt-1">{sj.fleet_label} · {sj.driver_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{sj.origin} → {sj.destination}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                      <ExternalLink size={14} />
                    </button>
                    {canManage && (
                      <button
                        onClick={() => onDetach(sj.uuid)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border font-medium"
                        style={{ borderColor: '#FCD34D', color: '#92400E', backgroundColor: '#FFFBEB' }}
                      >
                        <Unlink size={12} />
                        Lepas
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
