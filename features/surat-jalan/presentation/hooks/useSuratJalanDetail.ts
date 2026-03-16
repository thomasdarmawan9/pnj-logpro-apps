'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '@/store'
import { fetchSuratJalanDetail } from '@/store/slices/suratJalanSlice'

export default function useSuratJalanDetail(uuid?: string) {
  const dispatch = useDispatch<AppDispatch>()
  const { selectedSJ, isDetailLoading, error } = useSelector((state: RootState) => state.suratJalan)

  useEffect(() => {
    if (uuid) dispatch(fetchSuratJalanDetail(uuid))
  }, [dispatch, uuid])

  return { selectedSJ, isDetailLoading, error }
}
