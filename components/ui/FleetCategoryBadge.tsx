'use client'

import { FleetCategory, FLEET_CATEGORY_CONFIG } from '@/features/master/domain/entities/Fleet'
import { Truck, Car, Box, Cog, Container } from 'lucide-react'

interface FleetCategoryBadgeProps {
  category: FleetCategory
  size?: 'sm' | 'md'
}

const ICON_MAP: Record<string, React.ElementType> = {
  Truck, Car, Box, Cog, Container,
}

export default function FleetCategoryBadge({ category, size = 'sm' }: FleetCategoryBadgeProps) {
  const config = FLEET_CATEGORY_CONFIG[category]
  const IconComponent = ICON_MAP[config.icon] ?? Box
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padding}`}
      style={{ backgroundColor: config.bg, color: config.text }}
    >
      <IconComponent size={10} className="shrink-0" />
      {config.label}
    </span>
  )
}
