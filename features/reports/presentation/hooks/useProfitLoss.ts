'use client'

import { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import {
  fetchProfitLoss,
  setProfitLossFilters,
  ProfitLossFilterState,
} from '@/store/slices/reportsSlice'

export function useProfitLoss() {
  const dispatch = useDispatch<AppDispatch>()
  const { data, filters, isLoading, lastRefreshed } = useSelector(
    (state: RootState) => state.reports.profitLoss
  )

  const load = useCallback(() => {
    dispatch(fetchProfitLoss())
  }, [dispatch])

  useEffect(() => {
    if (!data) load()
  }, [data, load])

  const refresh = useCallback(() => load(), [load])

  const setFilters = useCallback(
    (partial: Partial<ProfitLossFilterState>) => {
      dispatch(setProfitLossFilters(partial))
    },
    [dispatch]
  )

  useEffect(() => {
    if (data) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  return { data, filters, isLoading, lastRefreshed, refresh, setFilters }
}
