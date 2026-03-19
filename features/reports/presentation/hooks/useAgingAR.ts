'use client'

import { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import {
  fetchAgingAR,
  setAgingARFilters,
  AgingARFilterState,
} from '@/store/slices/reportsSlice'

export function useAgingAR() {
  const dispatch = useDispatch<AppDispatch>()
  const { data, filters, isLoading, lastRefreshed } = useSelector(
    (state: RootState) => state.reports.agingAR
  )

  const load = useCallback(() => {
    dispatch(fetchAgingAR())
  }, [dispatch])

  useEffect(() => {
    if (!data) load()
  }, [data, load])

  const refresh = useCallback(() => {
    load()
  }, [load])

  const setFilters = useCallback(
    (partial: Partial<AgingARFilterState>) => {
      dispatch(setAgingARFilters(partial))
    },
    [dispatch]
  )

  // Re-fetch when filters change
  useEffect(() => {
    if (data) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  return { data, filters, isLoading, lastRefreshed, refresh, setFilters }
}
