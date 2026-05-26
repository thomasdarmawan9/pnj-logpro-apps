'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import {
  fetchFleets, createFleet, updateFleet, toggleFleetStatus,
  completeFleetRental,
  openFleetForm, closeFleetForm,
} from '@/store/slices/masterSlice'
import { Fleet } from '@/features/master/domain/entities/Fleet'

export function useFleet() {
  const dispatch = useDispatch<AppDispatch>()
  const { fleets, isLoading, error, modals } = useSelector((s: RootState) => s.master)

  useEffect(() => {
    dispatch(fetchFleets())
  }, [dispatch])

  return {
    fleets,
    isLoading,
    error,
    modal: modals.fleetForm,
    openForm: (data: Fleet | null = null) => dispatch(openFleetForm(data)),
    closeForm: () => dispatch(closeFleetForm()),
    create: (data: Parameters<typeof createFleet>[0]) => dispatch(createFleet(data)),
    update: (uuid: string, data: Partial<Fleet>) => dispatch(updateFleet({ uuid, data })),
    toggle: (uuid: string) => dispatch(toggleFleetStatus(uuid)),
    completeRental: (uuid: string) => dispatch(completeFleetRental(uuid)),
    refresh: () => dispatch(fetchFleets()),
  }
}
