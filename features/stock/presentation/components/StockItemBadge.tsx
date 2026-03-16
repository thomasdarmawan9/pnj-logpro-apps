'use client'

interface StockItemBadgeProps {
  code: string
  size?: 'sm' | 'md'
}

export default function StockItemBadge({ code, size = 'md' }: StockItemBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
  return (
    <span
      className={`inline-block font-mono font-semibold rounded-md bg-gray-100 text-gray-700 ${sizeClass}`}
      style={{ fontFamily: 'JetBrains Mono, monospace' }}
    >
      {code}
    </span>
  )
}
