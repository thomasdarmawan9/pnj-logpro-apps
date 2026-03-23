'use client'

import { SIMStatus } from '@/features/master/domain/entities/Driver'

interface SIMStatusBadgeProps {
  status: SIMStatus
  daysUntilExpiry?: number | null
  showDays?: boolean
  size?: 'sm' | 'md'
}

const SIM_STATUS_CONFIG: Record<SIMStatus, { label: string; dot: string; bg: string; text: string }> = {
  valid:          { label: 'SIM Valid',        dot: '#16A34A', bg: '#DCFCE7', text: '#15803D' },
  expiring_soon:  { label: 'Kadaluarsa',       dot: '#D97706', bg: '#FEF3C7', text: '#B45309' },
  expired:        { label: 'SIM Kadaluarsa',   dot: '#DC2626', bg: '#FEE2E2', text: '#B91C1C' },
  no_sim:         { label: 'Belum Ada SIM',    dot: '#6B7280', bg: '#F3F4F6', text: '#4B5563' },
}

export default function SIMStatusBadge({ status, daysUntilExpiry, showDays = true, size = 'sm' }: SIMStatusBadgeProps) {
  const config = SIM_STATUS_CONFIG[status]

  let label = config.label
  if (status === 'expiring_soon' && showDays && daysUntilExpiry != null) {
    label = `Kadaluarsa ${daysUntilExpiry} hari lagi`
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padding}`}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: config.dot }} />
      {label}
      {status === 'expired' && showDays && daysUntilExpiry != null && daysUntilExpiry < 0 && (
        <span className="opacity-70 font-normal">({Math.abs(daysUntilExpiry)} hari lalu)</span>
      )}
    </span>
  )
}
