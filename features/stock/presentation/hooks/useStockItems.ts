'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import {
  fetchStockItems,
  createStockItem,
  updateStockItem,
  openAddItemModal,
  closeAddItemModal,
  openEditItemModal,
  closeEditItemModal,
} from '@/store/slices/stockSlice'
import { StockItem } from '@/features/stock/domain/entities/StockItem'
import { CreateStockItemDto } from '@/features/stock/application/dto/CreateStockItemDto'

export function useStockItems() {
  const dispatch = useDispatch<AppDispatch>()
  const { items, isLoading, isSubmitting, error, modals } = useSelector((state: RootState) => state.stock)

  useEffect(() => {
    if (items.length === 0) {
      dispatch(fetchStockItems())
    }
  }, [dispatch, items.length])

  const handleCreate = async (dto: CreateStockItemDto) => {
    return dispatch(createStockItem(dto))
  }

  const handleUpdate = async (uuid: string, dto: Partial<CreateStockItemDto> & { is_active?: boolean }) => {
    return dispatch(updateStockItem({ uuid, dto }))
  }

  const handleOpenAdd = () => dispatch(openAddItemModal())
  const handleCloseAdd = () => dispatch(closeAddItemModal())
  const handleOpenEdit = (item: StockItem) => dispatch(openEditItemModal(item))
  const handleCloseEdit = () => dispatch(closeEditItemModal())
  const handleRefresh = () => dispatch(fetchStockItems())

  return {
    items,
    isLoading,
    isSubmitting,
    error,
    modals,
    handleCreate,
    handleUpdate,
    handleOpenAdd,
    handleCloseAdd,
    handleOpenEdit,
    handleCloseEdit,
    handleRefresh,
  }
}
