import { OpsStatusBadge, InvoiceStatusBadge } from '@/components/ui/StatusBadge'
import { activityData } from '@/lib/mockData'

type ActivityRow = typeof activityData[number]

interface ActivityTableProps {
  data?: ActivityRow[]
}

export default function ActivityTable({ data }: ActivityTableProps) {
  const rows = data ?? activityData

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
          Aktivitas Terkini
        </h3>
        <button
          className="text-sm font-medium"
          style={{ color: 'var(--green-primary)' }}
        >
          Lihat Semua →
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="py-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Tidak ada aktivitas untuk filter yang dipilih
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                {['No. Dokumen', 'Proyek / Customer', 'Armada', 'Status Ops', 'Status Invoice', 'Tanggal'].map(h => (
                  <th
                    key={h}
                    className="text-left pb-3 px-2 text-xs font-semibold whitespace-nowrap"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const isAlert = row.statusOps === 'DELIVERED' && row.statusInvoice === 'belum'
                return (
                  <tr
                    key={row.id}
                    className="border-b transition-colors"
                    style={{
                      borderColor: 'var(--border-light)',
                      backgroundColor: isAlert ? '#FEF2F2' : 'transparent',
                    }}
                  >
                    <td className="py-3 px-2 font-medium whitespace-nowrap" style={{ color: 'var(--green-primary)' }}>
                      {row.noDokumen}
                    </td>
                    <td className="py-3 px-2" style={{ color: 'var(--text-primary)', maxWidth: '200px' }}>
                      <div className="truncate">{row.proyek}</div>
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {row.armada}
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <OpsStatusBadge status={row.statusOps as 'DELIVERED' | 'ASSIGNED' | 'DRAFT' | 'OUTSTANDING' | 'PAID' | 'VOID'} />
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <InvoiceStatusBadge status={row.statusInvoice as 'terlampir' | 'belum' | null} invoiceNo={row.invoiceNo} />
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {row.tanggal}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
