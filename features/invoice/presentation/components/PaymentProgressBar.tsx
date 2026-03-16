'use client'

import { useEffect, useState } from 'react'

interface Props {
  paidAmount: number
  totalAmount: number
  isOverdue?: boolean
  showLabel?: boolean
}

export default function PaymentProgressBar({ paidAmount, totalAmount, isOverdue = false, showLabel = true }: Props) {
  const [width, setWidth] = useState(0)
  const percentage = totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0
  const isPaid = percentage >= 100

  useEffect(() => {
    const t = setTimeout(() => setWidth(percentage), 100)
    return () => clearTimeout(t)
  }, [percentage])

  const barColor = isPaid ? '#16A34A' : isOverdue ? '#D97706' : '#22C55E'

  return (
    <div className="w-full">
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%`, backgroundColor: barColor }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{Math.round(percentage)}% terbayar</span>
          {isPaid && <span className="text-green-600 font-semibold">✓ Lunas</span>}
        </div>
      )}
    </div>
  )
}
