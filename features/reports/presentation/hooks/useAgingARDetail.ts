'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { fetchAgingARProjectDetail } from '@/store/slices/reportsSlice'

export function useAgingARDetail(projectId: number | null) {
  const dispatch = useDispatch<AppDispatch>()
  const { data, isLoading, error, currentProjectId } = useSelector(
    (state: RootState) => state.reports.agingARDetail
  )

  useEffect(() => {
    if (projectId !== null && projectId !== currentProjectId) {
      dispatch(fetchAgingARProjectDetail(projectId))
    }
  }, [projectId, currentProjectId, dispatch])

  return { data, isLoading, error }
}
