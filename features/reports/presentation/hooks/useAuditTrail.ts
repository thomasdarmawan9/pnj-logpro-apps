'use client'

import { useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import {
  fetchAuditTrail,
  setAuditTrailFilters,
  setAuditTrailPage,
  AuditTrailFilterState,
} from '@/store/slices/reportsSlice'

export function useAuditTrail() {
  const dispatch = useDispatch<AppDispatch>()
  const { logs, filters, pagination, isLoading } = useSelector(
    (state: RootState) => state.reports.auditTrail
  )

  const load = useCallback(() => {
    dispatch(fetchAuditTrail())
  }, [dispatch])

  useEffect(() => {
    load()
  }, [load])

  const setFilters = useCallback(
    (partial: Partial<AuditTrailFilterState>) => {
      dispatch(setAuditTrailFilters(partial))
    },
    [dispatch]
  )

  const setPage = useCallback(
    (page: number) => {
      dispatch(setAuditTrailPage(page))
      dispatch(fetchAuditTrail())
    },
    [dispatch]
  )

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page])

  return { logs, filters, pagination, isLoading, setFilters, setPage }
}
