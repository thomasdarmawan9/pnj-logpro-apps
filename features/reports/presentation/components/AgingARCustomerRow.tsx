'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { AgingARCustomer } from '@/features/reports/domain/entities/AgingARReport'
import { AGING_BUCKET_CONFIG, ALL_BUCKETS } from '@/features/reports/domain/value-objects/AgingBucket'
import { formatRupiah, formatDate } from '@/lib/formatters'

interface AgingARCustomerRowProps {
  customer: AgingARCustomer
  index: number
}

function OverdueBadge({ days }: { days: number }) {
  if (days <= 0) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
        {Math.abs(days)} hari lagi
      </span>
    )
  }
  const cfg =
    days <= 30 ? { bg: '#FEF3C7', color: '#B45309', suffix: '' } :
    days <= 60 ? { bg: '#FFEDD5', color: '#C2410C', suffix: '' } :
    days <= 90 ? { bg: '#FEE2E2', color: '#B91C1C', suffix: ' ⚠' } :
                 { bg: '#FECACA', color: '#7F1D1D', suffix: ' ‼' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      +{days} hari{cfg.suffix}
    </span>
  )
}

export default function AgingARCustomerRow({ customer, index }: AgingARCustomerRowProps) {
  const [expanded, setExpanded] = useState(false)

  const rowBg =
    customer.oldest_invoice_days > 90 ? '#FEE2E2' :
    customer.oldest_invoice_days > 60 ? '#FEF2F2' :
    index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'

  return (
    <>
      <tr style={{ backgroundColor: rowBg }} className="hover:brightness-95 transition-all">
        {/* Expand button + customer info */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {customer.customer_name}
                </span>
                {customer.is_pkp && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
                    PKP
                  </span>
                )}
              </div>
              <div className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
                {customer.npwp || '—'}
              </div>
            </div>
          </div>
        </td>

        {/* Bucket columns */}
        {ALL_BUCKETS.map(bucket => {
          const val = customer.bucket_totals[bucket]
          const cfg = AGING_BUCKET_CONFIG[bucket]
          return (
            <td key={bucket} className="px-3 py-3 text-right font-mono text-sm">
              {val > 0 ? (
                <span className="font-bold" style={{ color: cfg.color }}>
                  {formatRupiah(val)}
                </span>
              ) : (
                <span style={{ color: '#D1D5DB' }}>—</span>
              )}
            </td>
          )
        })}

        {/* Total */}
        <td className="px-3 py-3 text-right font-mono text-sm font-bold" style={{ backgroundColor: 'rgba(0,0,0,0.02)', color: 'var(--text-primary)' }}>
          {formatRupiah(customer.total_outstanding)}
        </td>

        {/* Actions */}
        <td className="px-3 py-3 text-center">
          <a
            href={`/invoice?customer=${customer.customer_id}`}
            className="text-xs font-medium hover:underline"
            style={{ color: 'var(--green-primary)' }}
          >
            Lihat Invoice →
          </a>
        </td>
      </tr>

      {/* Expanded invoice rows */}
      {expanded && (
        <tr>
          <td colSpan={8} className="px-0 py-0">
            <div className="expanded-content" style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: '#F3F4F6' }}>
                    <th className="px-8 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>No. Invoice</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Proyek / Kontrak</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Tgl Invoice</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Jatuh Tempo</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Hari Overdue</th>
                    <th className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Sisa Tagihan</th>
                    <th className="px-3 py-2 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Bucket</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.invoices.map(inv => {
                    const bucketCfg = AGING_BUCKET_CONFIG[inv.aging_bucket]
                    return (
                      <tr key={inv.uuid} className="border-t" style={{ borderColor: '#E5E7EB' }}>
                        <td className="px-8 py-2 font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                          ↳ #{inv.invoice_number}
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>
                          <div className="truncate max-w-40">{inv.project_name}</div>
                          <div className="font-mono text-[10px]">{inv.contract_number}</div>
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.invoice_date)}</td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-secondary)' }}>{formatDate(inv.due_date)}</td>
                        <td className="px-3 py-2"><OverdueBadge days={inv.days_overdue} /></td>
                        <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                          {formatRupiah(inv.remaining_amount)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ backgroundColor: bucketCfg.badgeBg, color: bucketCfg.color }}
                          >
                            {bucketCfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
