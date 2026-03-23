'use client'

import { useState, useCallback, useMemo } from 'react'
import { FleetUtilizationSummary, MOCK_FLEET_UTILIZATION } from '@/features/reports/domain/entities/FleetUtilizationReport'
import { FleetCategory } from '@/features/master/domain/entities/Fleet'

export interface UtilizationFilters {
  periodPreset: 'this_month' | 'last_month' | 'custom'
  periodFrom: string
  periodTo: string
  category: FleetCategory | 'all'
  statusFilter: 'all' | 'active' | 'inactive'
}

const defaultFilters: UtilizationFilters = {
  periodPreset: 'this_month',
  periodFrom: '2026-03-01',
  periodTo: '2026-03-18',
  category: 'all',
  statusFilter: 'active',
}

export function useFleetUtilization() {
  const [filters, setFilters] = useState<UtilizationFilters>(defaultFilters)
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<FleetUtilizationSummary>(MOCK_FLEET_UTILIZATION)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    await new Promise(r => setTimeout(r, 600))
    setData(MOCK_FLEET_UTILIZATION)
    setIsLoading(false)
  }, [])

  const filteredFleets = useMemo(() => {
    return data.fleets
      .filter(f => !f.is_tbd)
      .filter(f => filters.category === 'all' || f.category === filters.category)
      .filter(f => filters.statusFilter === 'all' || f.status === filters.statusFilter)
      .sort((a, b) => b.utilization_percent - a.utilization_percent)
  }, [data, filters])

  const updateFilters = useCallback((partial: Partial<UtilizationFilters>) => {
    setFilters(prev => ({ ...prev, ...partial }))
  }, [])

  return { data, filteredFleets, filters, isLoading, refresh, updateFilters }
}
