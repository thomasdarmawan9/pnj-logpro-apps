'use client'

import { X } from 'lucide-react'
import { SuratJalan, StatusOperasional } from '../../../domain/entities/SuratJalan'
import SJStatusBadge from '../SJStatusBadge'
import { formatShortDate, formatRupiah } from '../../utils/format'
import SJTimeline from '../SJTimeline'

interface DetailDrawerProps {
  open: boolean
  sj: SuratJalan | null
  onClose: () => void
  onViewDetail: (uuid: string) => void
  onPrint: (uuid: string) => void
}

export default function DetailDrawer({ open, sj, onClose, onViewDetail, onPrint }: DetailDrawerProps) {
  if (!open || !sj) return null

  const events = [
    { id: 1, status: sj.status, timestamp: sj.updated_at, actor: 'Admin PNJ', note: 'Status terakhir' },
    { id: 2, status: StatusOperasional.ASSIGNED, timestamp: sj.created_at, actor: 'Admin PNJ', note: 'SJ dibuat' },
  ]

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[480px] bg-white shadow-2xl animate-drawerEnter flex flex-col">
        <div className="sticky top-0 bg-white border-b p-5 flex items-start justify-between" style={{ borderColor: 'var(--border-card)' }}>
          <div>
            <div className="text-lg font-semibold">{sj.sj_number}</div>
            <div className="mt-2">
              <SJStatusBadge statusOps={sj.status} statusLampiran={sj.invoice_attachment_status} invoiceNumber={sj.invoice?.invoice_number || null} />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="rounded-xl bg-gray-50 p-4 text-sm">
            <div className="font-semibold">Informasi Ringkas</div>
            <div className="mt-2 text-xs text-gray-500">Proyek</div>
            <div className="text-sm">{sj.project.name}</div>
            <div className="mt-2 text-xs text-gray-500">Customer</div>
            <div className="text-sm">{sj.customer.name}</div>
            <div className="mt-2 text-xs text-gray-500">Tanggal SJ</div>
            <div className="text-sm">{formatShortDate(sj.sj_date)}</div>
            <div className="mt-2 text-xs text-gray-500">Biaya Ops</div>
            <div className="text-sm font-mono">{formatRupiah(sj.operational_cost)}</div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Foto Bukti Pengiriman</div>
            {sj.pod_photo_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sj.pod_photo_path} alt="Bukti Pengiriman" className="w-full rounded-xl" />
            ) : (
              <div className="text-xs text-gray-500">Belum ada foto bukti pengiriman</div>
            )}
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Riwayat Status</div>
            <SJTimeline events={events} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2" style={{ borderColor: 'var(--border-card)' }}>
          <button
            onClick={() => onViewDetail(sj.uuid)}
            className="flex-1 px-3 py-2 rounded-lg border"
            style={{ borderColor: 'var(--border-card)' }}
          >
            Lihat Detail Lengkap
          </button>
          <button
            onClick={() => onPrint(sj.uuid)}
            className="flex-1 px-3 py-2 rounded-lg text-white"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            Cetak PDF
          </button>
        </div>
      </div>
    </div>
  )
}
