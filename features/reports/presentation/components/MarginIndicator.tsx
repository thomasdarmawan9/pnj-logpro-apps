'use client'

import { getMarginColor, getMarginBarColor } from '@/features/reports/domain/value-objects/ProfitMargin'

interface MarginIndicatorProps {
  margin: number | null
  showBar?: boolean
}

export default function MarginIndicator({ margin, showBar = true }: MarginIndicatorProps) {
  if (margin === null) {
    return (
      <span className="text-xs italic" style={{ color: 'var(--text-secondary)' }}>
        — belum ada pembayaran
      </span>
    )
  }

  const color = getMarginColor(margin)
  const barColor = getMarginBarColor(margin)
  const barWidth = Math.min(Math.abs(margin), 100)
  const isNegative = margin < 0

  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-xs font-bold font-mono" style={{ color }}>
        {isNegative ? '' : '+'}{margin.toFixed(1)}%
      </span>
      {showBar && !isNegative && (
        <div className="h-1.5 rounded-full w-full" style={{ backgroundColor: '#F3F4F6' }}>
          <div
            className="h-full rounded-full margin-bar"
            style={{
              width: `${barWidth}%`,
              backgroundColor: barColor,
              '--margin-width': `${barWidth}%`,
            } as React.CSSProperties}
          />
        </div>
      )}
    </div>
  )
}
