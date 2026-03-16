import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import { fetchInvoiceDetail, clearSelectedInvoice } from '@/store/slices/invoiceSlice'

export default function useInvoiceDetail(uuid: string | null) {
  const dispatch = useDispatch<AppDispatch>()
  const { selectedInvoice, isDetailLoading, error } = useSelector((state: RootState) => state.invoice)

  useEffect(() => {
    if (uuid) {
      dispatch(fetchInvoiceDetail(uuid))
    }
    return () => {
      dispatch(clearSelectedInvoice())
    }
  }, [dispatch, uuid])

  return { invoice: selectedInvoice, isLoading: isDetailLoading, error }
}
