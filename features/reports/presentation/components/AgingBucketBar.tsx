'use client'

import { formatRupiah } from '@/lib/formatters'

interface AgingBucketBarProps {
  currentAmount: number
  overdueAmount: number
  paidAmount: number
  animated?: boolean
}

export default function AgingBucketBar({ currentAmount, overdueAmount, paidAmount, animated = true }: AgingBucketBarProps) {
  const totalAmount = currentAmount + overdueAmount + paidAmount
  const percent = (val: number) => totalAmount > 0 ? (val / totalAmount) * 100 : 0

  const segments = [
    { key: 'current', label: 'Belum Jatuh Tempo', value: currentAmount, color: '#16A34A', text: '#15803D' },
    { key: 'overdue', label: 'Sudah Jatuh Tempo', value: overdueAmount, color: '#DC2626', text: '#B91C1C' },
    { key: 'paid', label: 'Sudah Lunas', value: paidAmount, color: '#3B82F6', text: '#1D4ED8' },
  ]

  return (
    <div>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        Distribusi Piutang per Bucket
      </p>

      {/* Stacked bar */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-4" style={{ backgroundColor: '#F3F4F6' }}>
        {segments.map((seg, i) => {
          const val = seg.value
          const pct = percent(val)
          if (pct === 0) return null
          return (
            <div
              key={seg.key}
              title={`${seg.label}: ${formatRupiah(val)} (${pct.toFixed(1)}%)`}
              className={`h-full transition-all ${animated ? 'bucket-segment' : ''}`}
              style={{
                width: `${pct}%`,
                backgroundColor: seg.color,
                animationDelay: animated ? `${i * 0.1}s` : undefined,
              }}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {segments.map(seg => {
          const val = seg.value
          const pct = percent(val)
          return (
            <div key={seg.key} className="flex items-center gap-2" style={{ opacity: val === 0 ? 0.4 : 1 }}>
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {seg.label}
                </div>
                <div className="text-xs font-mono" style={{ color: seg.text }}>
                  {formatRupiah(val)}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {pct.toFixed(1)}%
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
