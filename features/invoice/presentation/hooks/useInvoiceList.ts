import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import {
  fetchInvoiceList,
  setFilters,
  resetFilters,
  setPage,
  setPerPage,
} from '@/store/slices/invoiceSlice'
import { InvoiceFilterState } from '../../domain/entities/Invoice'

export default function useInvoiceList() {
  const dispatch = useDispatch<AppDispatch>()
  const { list, filters, pagination, isLoading, error } = useSelector((state: RootState) => state.invoice)

  useEffect(() => {
    dispatch(fetchInvoiceList())
  }, [dispatch, filters, pagination.page, pagination.perPage])

  return {
    list,
    filters,
    pagination,
    isLoading,
    error,
    setFilters: (f: Partial<InvoiceFilterState>) => dispatch(setFilters(f)),
    resetFilters: () => dispatch(resetFilters()),
    setPage: (p: number) => dispatch(setPage(p)),
    setPerPage: (p: number) => dispatch(setPerPage(p)),
  }
}
