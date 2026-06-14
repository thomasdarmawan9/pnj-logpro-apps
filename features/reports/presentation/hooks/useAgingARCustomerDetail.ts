'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { fetchAgingARCustomerDetail } from '@/store/slices/reportsSlice'

export function useAgingARCustomerDetail(customerId: number | null) {
  const dispatch = useDispatch<AppDispatch>()
  const { data, isLoading, error } = useSelector(
    (state: RootState) => state.reports.agingARCustomerDetail
  )

  useEffect(() => {
    if (customerId !== null) {
      dispatch(fetchAgingARCustomerDetail(customerId))
    }
  }, [customerId, dispatch])

  return { data, isLoading, error }
}
