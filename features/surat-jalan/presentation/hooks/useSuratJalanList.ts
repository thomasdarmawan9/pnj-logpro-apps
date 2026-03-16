'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '@/store'
import {
  fetchSuratJalanList,
  setFilters,
  resetFilters,
  setPage,
  setPerPage,
} from '@/store/slices/suratJalanSlice'

export default function useSuratJalanList() {
  const dispatch = useDispatch<AppDispatch>()
  const { list, filters, pagination, isLoading, error } = useSelector((state: RootState) => state.suratJalan)

  useEffect(() => {
    dispatch(fetchSuratJalanList())
  }, [dispatch, filters, pagination.page, pagination.perPage])

  return {
    list,
    filters,
    pagination,
    isLoading,
    error,
    setFilters: (payload: Partial<typeof filters>) => dispatch(setFilters(payload)),
    resetFilters: () => dispatch(resetFilters()),
    setPage: (page: number) => dispatch(setPage(page)),
    setPerPage: (perPage: number) => dispatch(setPerPage(perPage)),
  }
}
