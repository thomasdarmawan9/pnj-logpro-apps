'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { FleetUtilizationSummary } from '@/features/reports/domain/entities/FleetUtilizationReport'
import { FleetCategory } from '@/features/master/domain/entities/Fleet'
import { getFleetUtilizationReport } from '../../infrastructure/repositories/MockReportsRepository'

export interface UtilizationFilters {
  periodPreset: 'this_month' | 'last_month' | 'custom'
  periodFrom: string
  periodTo: string
  category: FleetCategory | 'all'
  statusFilter: 'all' | 'active' | 'inactive' | 'sold'
}

function getToday() { return new Date().toISOString().split('T')[0] }
function getMonthStart() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

const defaultData: FleetUtilizationSummary = {
  period_from: getMonthStart(),
  period_to: getToday(),
  total_fleets: 0,
  active_fleets: 0,
  idle_fleets: 0,
  avg_utilization: 0,
  top_fleet_uuid: null,
  total_trips: 0,
  total_operational_cost: 0,
  fleets: [],
}

function getDefaultFilters(): UtilizationFilters {
  return {
    periodPreset: 'this_month',
    periodFrom: getMonthStart(),
    periodTo: getToday(),
    category: 'all',
    statusFilter: 'active',
  }
}

export function useFleetUtilization() {
  const [filters, setFilters] = useState<UtilizationFilters>(getDefaultFilters)
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<FleetUtilizationSummary>(defaultData)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const next = await getFleetUtilizationReport(filters)
      setData(next)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filteredFleets = useMemo(() => {
    return data.fleets
      .filter(f => !f.is_tbd)
      .sort((a, b) => b.utilization_percent - a.utilization_percent)
  }, [data])

  const updateFilters = useCallback((partial: Partial<UtilizationFilters>) => {
    setFilters(prev => ({ ...prev, ...partial }))
  }, [])

  return { data, filteredFleets, filters, isLoading, refresh, updateFilters }
}
