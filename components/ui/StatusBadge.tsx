type OpsStatus = 'DELIVERED' | 'ASSIGNED' | 'DRAFT' | 'OUTSTANDING' | 'PAID' | 'VOID'
type InvoiceStatus = 'terlampir' | 'belum' | null

interface OpsStatusBadgeProps {
  status: OpsStatus
}

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  invoiceNo?: string | null
}

const opsStyles: Record<OpsStatus, string> = {
  DELIVERED: 'bg-green-100 text-green-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  DRAFT: 'bg-gray-100 text-gray-600',
  OUTSTANDING: 'bg-orange-100 text-orange-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  VOID: 'bg-red-100 text-red-700',
}

const opsDots: Record<OpsStatus, string> = {
  DELIVERED: '● ',
  ASSIGNED: '● ',
  DRAFT: '○ ',
  OUTSTANDING: '● ',
  PAID: '● ',
  VOID: '● ',
}

export function OpsStatusBadge({ status }: OpsStatusBadgeProps) {
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${opsStyles[status]}`}>
      {opsDots[status]}{status}
    </span>
  )
}

export function InvoiceStatusBadge({ status, invoiceNo }: InvoiceStatusBadgeProps) {
  if (status === null) return <span className="text-gray-400 text-xs">—</span>

  if (status === 'terlampir') {
    return (
      <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
        ● Terlampir {invoiceNo}
      </span>
    )
  }

  return (
    <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">
      ○ Belum Ada Invoice
    </span>
  )
}
