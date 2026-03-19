'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { ProfitLossProject } from '@/features/reports/domain/entities/ProfitLossReport'
import { formatRupiah } from '@/lib/formatters'
import MarginIndicator from './MarginIndicator'

interface ProfitLossProjectRowProps {
  project: ProfitLossProject
  index: number
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  active:    { label: 'Aktif',   bg: '#DCFCE7', color: '#15803D' },
  completed: { label: 'Selesai', bg: '#F3F4F6', color: '#6B7280' },
  on_hold:   { label: 'Ditunda', bg: '#FEF3C7', color: '#B45309' },
}

export default function ProfitLossProjectRow({ project, index }: ProfitLossProjectRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'invoice' | 'sj'>('invoice')

  const isLoss = project.profitability === 'loss'
  const isNoData = project.profitability === 'no_data'

  const rowBg = isLoss ? '#FEF2F2' : index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'

  const statusBadge = STATUS_BADGE[project.status] ?? STATUS_BADGE.active

  const grossProfitDisplay = () => {
    if (project.gross_profit === 0 && isNoData) return <span style={{ color: '#D1D5DB' }}>—</span>
    const isPositive = project.gross_profit > 0
    return (
      <span
        className="font-bold font-mono px-2 py-0.5 rounded text-sm"
        style={{
          backgroundColor: isPositive ? '#F0FDF4' : '#FEF2F2',
          color: isPositive ? '#16A34A' : '#DC2626',
        }}
      >
        {isPositive ? '+' : '−'}{formatRupiah(Math.abs(project.gross_profit))}
      </span>
    )
  }

  return (
    <>
      <tr
        style={{ backgroundColor: rowBg, opacity: isNoData ? 0.75 : 1 }}
        className="hover:brightness-95 transition-all"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(e => !e)} className="text-gray-400 hover:text-gray-600 shrink-0">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-semibold text-sm ${isNoData ? 'italic' : ''}`} style={{ color: 'var(--text-primary)' }}>
                  {project.project_name}
                </span>
                {isLoss && <AlertTriangle size={12} style={{ color: '#DC2626' }} />}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{project.customer_name}</div>
              <div className="text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>{project.project_code}</div>
            </div>
          </div>
        </td>
        <td className="px-3 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{project.contract_number}</td>
        <td className="px-3 py-3">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: statusBadge.bg, color: statusBadge.color }}>
            {statusBadge.label}
          </span>
        </td>
        <td className="px-3 py-3 text-right font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
          {formatRupiah(project.revenue_invoiced)}
        </td>
        <td className="px-3 py-3 text-right font-mono text-sm font-bold" style={{ color: '#15803D' }}>
          {project.revenue_paid > 0 ? formatRupiah(project.revenue_paid) : <span style={{ color: '#D1D5DB' }}>—</span>}
        </td>
        <td className="px-3 py-3 text-right font-mono text-sm" style={{ color: '#DC2626' }}>
          {formatRupiah(project.total_operational_cost)}
        </td>
        <td className="px-3 py-3 text-right">
          {grossProfitDisplay()}
        </td>
        <td className="px-3 py-3" style={{ minWidth: '120px' }}>
          <MarginIndicator margin={project.margin_percent} showBar />
        </td>
        <td className="px-3 py-3 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div>{project.sj_count} SJ</div>
          <div>{project.sj_delivered_count} delivered</div>
        </td>
        <td className="px-3 py-3 text-center">
          <a href={`/master/proyek/${project.project_id}`} className="text-xs font-medium hover:underline" style={{ color: 'var(--green-primary)' }}>
            Lihat Proyek →
          </a>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={10} className="px-0 py-0">
            <div className="expanded-content" style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
              {/* Mini tabs */}
              <div className="flex gap-0 border-b" style={{ borderColor: '#E5E7EB' }}>
                {(['invoice', 'sj'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="px-6 py-2.5 text-xs font-semibold transition-colors"
                    style={{
                      borderBottom: activeTab === tab ? '2px solid var(--green-primary)' : '2px solid transparent',
                      color: activeTab === tab ? 'var(--green-primary)' : 'var(--text-secondary)',
                      backgroundColor: 'transparent',
                    }}
                  >
                    {tab === 'invoice' ? `Invoice (${project.invoice_count})` : `Surat Jalan (${project.sj_count})`}
                  </button>
                ))}
              </div>

              {activeTab === 'invoice' && (
                <table className="w-full text-xs">
                  <tbody>
                    {(project.invoices ?? []).map(inv => (
                      <tr key={inv.uuid} className="border-b" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-8 py-2 font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                          INV-{inv.invoice_number}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatRupiah(inv.total_amount)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: inv.status === 'paid' ? '#DCFCE7' : '#FEF3C7',
                              color: inv.status === 'paid' ? '#15803D' : '#B45309',
                            }}
                          >
                            {inv.status === 'paid' ? 'PAID ✓ masuk P&L' : inv.status.toUpperCase() + ' (belum masuk P&L)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!(project.invoices?.length) && (
                      <tr><td colSpan={3} className="px-8 py-3 text-center" style={{ color: 'var(--text-secondary)' }}>Tidak ada data invoice</td></tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeTab === 'sj' && (
                <table className="w-full text-xs">
                  <tbody>
                    {(project.sj_list ?? []).map(sj => (
                      <tr key={sj.uuid} className="border-b" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-8 py-2 font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{sj.sj_number}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{sj.driver_name}</td>
                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-secondary)' }}>{sj.fleet_label}</td>
                        <td className="px-3 py-2">
                          <span
                            className="px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: sj.status === 'delivered' ? '#DCFCE7' : '#EFF6FF',
                              color: sj.status === 'delivered' ? '#15803D' : '#1D4ED8',
                            }}
                          >
                            {sj.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: 'var(--text-secondary)' }}>
                          Biaya: {formatRupiah(sj.operational_cost)}
                        </td>
                      </tr>
                    ))}
                    {!(project.sj_list?.length) && (
                      <tr><td colSpan={5} className="px-8 py-3 text-center" style={{ color: 'var(--text-secondary)' }}>Tidak ada data surat jalan</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
