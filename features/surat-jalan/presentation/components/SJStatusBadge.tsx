import { StatusLampiran, StatusOperasional } from '../../domain/entities/SuratJalan'

interface SJStatusBadgeProps {
  statusOps: StatusOperasional
  statusLampiran?: StatusLampiran
  invoiceNumber?: string | null
  clickable?: boolean
}

const statusOpsConfig: Record<StatusOperasional, { label: string; bg: string; text: string; dot: string }> = {
  [StatusOperasional.DRAFT]: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', dot: '#6B7280' },
  [StatusOperasional.ASSIGNED]: { label: 'Assigned', bg: 'bg-blue-100', text: 'text-blue-800', dot: '#2563EB' },
  [StatusOperasional.DELIVERED]: { label: 'Delivered', bg: 'bg-green-100', text: 'text-green-800', dot: '#16A34A' },
  [StatusOperasional.VOID]: { label: 'Void', bg: 'bg-red-100', text: 'text-red-700', dot: '#DC2626' },
}

const statusLampiranConfig: Record<StatusLampiran, { label: string; bg: string; text: string; dot: string }> = {
  [StatusLampiran.NO_INVOICE]: { label: 'Belum Ada Invoice', bg: 'bg-gray-50', text: 'text-gray-500', dot: '#9CA3AF' },
  [StatusLampiran.ATTACHED]: { label: 'Terlampir', bg: 'bg-green-50', text: 'text-green-700', dot: '#16A34A' },
}

export default function SJStatusBadge({ statusOps, statusLampiran, invoiceNumber, clickable }: SJStatusBadgeProps) {
  const ops = statusOpsConfig[statusOps]
  const lampiran = statusLampiran ? statusLampiranConfig[statusLampiran] : null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${ops.bg} ${ops.text} ${clickable ? 'badge-clickable' : ''}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusOps === StatusOperasional.ASSIGNED ? 'dot-pulse' : ''}`} style={{ backgroundColor: ops.dot }} />
        {ops.label}
      </span>
      {lampiran && (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${lampiran.bg} ${lampiran.text} ${clickable ? 'badge-clickable' : ''}`}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: lampiran.dot }} />
          {statusLampiran === StatusLampiran.ATTACHED && invoiceNumber
            ? `Terlampir INV-${invoiceNumber}`
            : lampiran.label}
        </span>
      )}
    </div>
  )
}
