'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import {
  fetchStockReceipts,
  fetchReceiptDetail,
  deleteStockReceipt,
  openDeleteConfirm,
  closeDeleteConfirm,
  clearSelectedReceipt,
} from '@/store/slices/stockSlice'

export function useStockReceipts() {
  const dispatch = useDispatch<AppDispatch>()
  const { receipts, selectedReceipt, isLoading, isDetailLoading, isSubmitting, error, modals } = useSelector(
    (state: RootState) => state.stock
  )

  useEffect(() => {
    if (receipts.length === 0) {
      dispatch(fetchStockReceipts())
    }
  }, [dispatch, receipts.length])

  const handleLoadDetail = (uuid: string) => dispatch(fetchReceiptDetail(uuid))
  const handleDelete = (uuid: string) => dispatch(deleteStockReceipt(uuid))
  const handleOpenDeleteConfirm = (uuid: string) => dispatch(openDeleteConfirm({ type: 'receipt', uuid }))
  const handleCloseDeleteConfirm = () => dispatch(closeDeleteConfirm())
  const handleClearSelected = () => dispatch(clearSelectedReceipt())
  const handleRefresh = () => dispatch(fetchStockReceipts())

  return {
    receipts,
    selectedReceipt,
    isLoading,
    isDetailLoading,
    isSubmitting,
    error,
    modals,
    handleLoadDetail,
    handleDelete,
    handleOpenDeleteConfirm,
    handleCloseDeleteConfirm,
    handleClearSelected,
    handleRefresh,
  }
}
