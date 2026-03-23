'use client'

import { FleetStatus, FLEET_STATUS_CONFIG } from '@/features/master/domain/entities/Fleet'

interface FleetStatusBadgeProps {
  status: FleetStatus
  size?: 'sm' | 'md'
}

export default function FleetStatusBadge({ status, size = 'sm' }: FleetStatusBadgeProps) {
  const config = FLEET_STATUS_CONFIG[status]
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padding}`}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.text }} />
      {config.label}
    </span>
  )
}
