'use client'

import { LucideIcon } from 'lucide-react'
import { formatRupiah } from '@/lib/formatters'

interface SummaryCard {
  icon: LucideIcon
  value: string | number
  isRupiah?: boolean
  label: string
  sub?: string
  borderColor: string
  valueColor?: string
}

interface ReportSummaryCardsProps {
  cards: SummaryCard[]
  isLoading?: boolean
}

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-light)', borderRight: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', borderLeft: '4px solid #E5E7EB' }}>
      <div className="h-4 w-4 rounded bg-gray-200 mb-3" />
      <div className="h-7 w-3/4 rounded bg-gray-200 mb-2" />
      <div className="h-3 w-1/2 rounded bg-gray-200" />
    </div>
  )
}

export default function ReportSummaryCards({ cards, isLoading }: ReportSummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card, i) => {
        const Icon = card.icon
        const displayValue = card.isRupiah
          ? (typeof card.value === 'number' ? formatRupiah(card.value) : card.value)
          : card.value

        return (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderTop: '1px solid var(--border-light)',
              borderRight: '1px solid var(--border-light)',
              borderBottom: '1px solid var(--border-light)',
              borderLeft: `4px solid ${card.borderColor}`,
            }}
          >
            <Icon size={16} className="mb-2" style={{ color: card.borderColor }} />
            <div
              className="font-bold font-mono mb-0.5 leading-tight"
              style={{
                fontSize: i === 0 ? '22px' : '18px',
                color: card.valueColor ?? 'var(--text-primary)',
              }}
            >
              {displayValue}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {card.label}
            </div>
            {card.sub && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                {card.sub}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
