'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  fetchDashboardSummary,
  fetchDashboardActivity,
  DashboardSummary,
  ActivityResponse,
  ActivityFilters,
  SummaryFilters,
} from '@/lib/dashboardApi'

export function useDashboardSummary(filters: SummaryFilters) {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetchDashboardSummary(filters)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat data') })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [filters.period, filters.module, filters.status]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, isLoading, error }
}

export function useDashboardActivity(filters: ActivityFilters) {
  const [data, setData] = useState<ActivityResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetchDashboardActivity(filters)
      .then(d => { if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat aktivitas') })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [filters])

  useEffect(() => {
    return fetch()
  }, [fetch])

  return { data, isLoading, error }
}
