'use client'

import { AgingARSummary } from '@/features/reports/domain/entities/AgingARReport'
import { ALL_BUCKETS, AGING_BUCKET_CONFIG } from '@/features/reports/domain/value-objects/AgingBucket'
import { formatRupiah } from '@/lib/formatters'
import AgingARCustomerRow from './AgingARCustomerRow'

interface AgingARTableProps {
  data: AgingARSummary
  isLoading?: boolean
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: '#F3F4F6' }} />
      ))}
    </div>
  )
}

export default function AgingARTable({ data, isLoading }: AgingARTableProps) {
  if (isLoading) return <TableSkeleton />

  if (!data.customers.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Tidak ada data piutang untuk filter yang dipilih.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Coba ubah filter atau reset pencarian.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border-light)', backgroundColor: '#F9FAFB' }}>
            <th className="px-4 py-3 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Customer & NPWP
            </th>
            {ALL_BUCKETS.map(bucket => (
              <th
                key={bucket}
                className="px-3 py-3 text-right font-semibold whitespace-nowrap"
                style={{ color: AGING_BUCKET_CONFIG[bucket].color, minWidth: '130px' }}
              >
                {AGING_BUCKET_CONFIG[bucket].label}
              </th>
            ))}
            <th className="px-3 py-3 text-right font-semibold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
              Total Piutang
            </th>
            <th className="px-3 py-3 text-center font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {data.customers.map((customer, i) => (
            <AgingARCustomerRow key={customer.customer_id} customer={customer} index={i} />
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border-light)', backgroundColor: '#F3F4F6' }}>
            <td className="px-4 py-3 font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              Grand Total
            </td>
            {ALL_BUCKETS.map(bucket => (
              <td key={bucket} className="px-3 py-3 text-right font-bold font-mono text-sm" style={{ color: AGING_BUCKET_CONFIG[bucket].color }}>
                {data.bucket_totals[bucket] > 0 ? formatRupiah(data.bucket_totals[bucket]) : '—'}
              </td>
            ))}
            <td className="px-3 py-3 text-right font-bold font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
              {formatRupiah(data.total_outstanding)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
