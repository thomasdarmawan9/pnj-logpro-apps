'use client'

import { AgingBucket, AGING_BUCKET_CONFIG, ALL_BUCKETS } from '@/features/reports/domain/value-objects/AgingBucket'
import { formatRupiah } from '@/lib/formatters'

interface AgingBucketBarProps {
  bucketTotals: Record<AgingBucket, number>
  totalAmount: number
  animated?: boolean
}

export default function AgingBucketBar({ bucketTotals, totalAmount, animated = true }: AgingBucketBarProps) {
  const percent = (val: number) => totalAmount > 0 ? (val / totalAmount) * 100 : 0

  return (
    <div>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        Distribusi Piutang per Bucket
      </p>

      {/* Stacked bar */}
      <div className="flex h-8 rounded-lg overflow-hidden mb-4" style={{ backgroundColor: '#F3F4F6' }}>
        {ALL_BUCKETS.map((bucket, i) => {
          const val = bucketTotals[bucket]
          const pct = percent(val)
          if (pct === 0) return null
          const cfg = AGING_BUCKET_CONFIG[bucket]
          return (
            <div
              key={bucket}
              title={`${cfg.label}: ${formatRupiah(val)} (${pct.toFixed(1)}%)`}
              className={`h-full transition-all ${animated ? 'bucket-segment' : ''}`}
              style={{
                width: `${pct}%`,
                backgroundColor: cfg.border,
                animationDelay: animated ? `${i * 0.1}s` : undefined,
              }}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {ALL_BUCKETS.map(bucket => {
          const val = bucketTotals[bucket]
          const pct = percent(val)
          const cfg = AGING_BUCKET_CONFIG[bucket]
          return (
            <div key={bucket} className="flex items-center gap-2" style={{ opacity: val === 0 ? 0.4 : 1 }}>
              <span
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: cfg.border }}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {cfg.label}
                </div>
                <div className="text-xs font-mono" style={{ color: cfg.color }}>
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
