'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import {
  fetchStockDisbursements,
  fetchDisbursementDetail,
  deleteStockDisbursement,
  openDeleteConfirm,
  closeDeleteConfirm,
  clearSelectedDisbursement,
} from '@/store/slices/stockSlice'

export function useStockDisbursements() {
  const dispatch = useDispatch<AppDispatch>()
  const { disbursements, selectedDisbursement, isLoading, isDetailLoading, isSubmitting, error, modals } = useSelector(
    (state: RootState) => state.stock
  )

  useEffect(() => {
    if (disbursements.length === 0) {
      dispatch(fetchStockDisbursements())
    }
  }, [dispatch, disbursements.length])

  const handleLoadDetail = (uuid: string) => dispatch(fetchDisbursementDetail(uuid))
  const handleDelete = (uuid: string) => dispatch(deleteStockDisbursement(uuid))
  const handleOpenDeleteConfirm = (uuid: string) => dispatch(openDeleteConfirm({ type: 'disbursement', uuid }))
  const handleCloseDeleteConfirm = () => dispatch(closeDeleteConfirm())
  const handleClearSelected = () => dispatch(clearSelectedDisbursement())
  const handleRefresh = () => dispatch(fetchStockDisbursements())

  return {
    disbursements,
    selectedDisbursement,
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
