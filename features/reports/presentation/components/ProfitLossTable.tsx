'use client'

import { ProfitLossSummary } from '@/features/reports/domain/entities/ProfitLossReport'
import { formatRupiah } from '@/lib/formatters'
import ProfitLossProjectRow from './ProfitLossProjectRow'

interface ProfitLossTableProps {
  data: ProfitLossSummary
  isLoading?: boolean
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-14 rounded-lg animate-pulse" style={{ backgroundColor: '#F3F4F6' }} />
      ))}
    </div>
  )
}

export default function ProfitLossTable({ data, isLoading }: ProfitLossTableProps) {
  if (isLoading) return <TableSkeleton />

  if (!data.projects.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tidak ada data proyek untuk filter yang dipilih.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border-light)', backgroundColor: '#F9FAFB' }}>
            {['Proyek & Customer', 'No. Kontrak', 'Status', 'Revenue Ditagih', 'Revenue Terbayar', 'Biaya Ops', 'Gross Profit', 'Margin', 'SJ', 'Aksi'].map((h, i) => (
              <th
                key={i}
                className={`px-3 py-3 font-semibold whitespace-nowrap ${i >= 3 && i <= 7 ? 'text-right' : i === 8 || i === 9 ? 'text-center' : 'text-left'}`}
                style={{ color: 'var(--text-secondary)', minWidth: i === 0 ? '220px' : i >= 3 && i <= 6 ? '150px' : undefined }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.projects.map((project, i) => (
            <ProfitLossProjectRow key={project.project_id} project={project} index={i} />
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid var(--border-light)', backgroundColor: '#F3F4F6' }}>
            <td className="px-4 py-3 font-bold" colSpan={3}>TOTAL</td>
            <td className="px-3 py-3 text-right font-bold font-mono" style={{ color: 'var(--text-secondary)' }}>
              {formatRupiah(data.projects.reduce((s, p) => s + p.revenue_invoiced, 0))}
            </td>
            <td className="px-3 py-3 text-right font-bold font-mono" style={{ color: '#15803D' }}>
              {formatRupiah(data.total_revenue_paid)}
            </td>
            <td className="px-3 py-3 text-right font-bold font-mono" style={{ color: '#DC2626' }}>
              {formatRupiah(data.total_operational_cost)}
            </td>
            <td className="px-3 py-3 text-right">
              <span className="font-bold font-mono px-2 py-0.5 rounded" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                {formatRupiah(data.total_gross_profit)}
              </span>
            </td>
            <td className="px-3 py-3 text-center text-sm font-bold font-mono" style={{ color: '#16A34A' }}>
              {data.average_margin !== null ? `${data.average_margin.toFixed(1)}%` : '—'}
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
