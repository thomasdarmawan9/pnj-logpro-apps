'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import {
  fetchDrivers, createDriver, updateDriver, toggleDriverStatus,
  openDriverForm, closeDriverForm,
} from '@/store/slices/masterSlice'
import { Driver } from '@/features/master/domain/entities/Driver'

export function useDriver() {
  const dispatch = useDispatch<AppDispatch>()
  const { drivers, isLoading, error, modals } = useSelector((s: RootState) => s.master)

  useEffect(() => {
    if (drivers.length === 0) dispatch(fetchDrivers())
  }, [dispatch, drivers.length])

  return {
    drivers,
    isLoading,
    error,
    modal: modals.driverForm,
    openForm: (data: Driver | null = null) => dispatch(openDriverForm(data)),
    closeForm: () => dispatch(closeDriverForm()),
    create: (data: Parameters<typeof createDriver>[0]) => dispatch(createDriver(data)),
    update: (uuid: string, data: Partial<Driver>) => dispatch(updateDriver({ uuid, data })),
    toggle: (uuid: string) => dispatch(toggleDriverStatus(uuid)),
    refresh: () => dispatch(fetchDrivers()),
  }
}
