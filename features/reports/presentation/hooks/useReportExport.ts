'use client'

import { useState, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '@/store'
import { setExporting } from '@/store/slices/reportsSlice'
import { AgingARSummary } from '@/features/reports/domain/entities/AgingARReport'
import { ProfitLossSummary } from '@/features/reports/domain/entities/ProfitLossReport'

export function useReportExport() {
  const dispatch = useDispatch<AppDispatch>()
  const [isExporting, setIsExportingLocal] = useState(false)

  const exportAgingAR = useCallback(async (data: AgingARSummary) => {
    setIsExportingLocal(true)
    dispatch(setExporting(true))
    try {
      const { exportAgingARExcel } = await import('../../application/use-cases/ExportAgingARExcel')
      await exportAgingARExcel(data)
    } finally {
      // Simulate minimum export time for UX feedback
      await new Promise(r => setTimeout(r, 1500))
      setIsExportingLocal(false)
      dispatch(setExporting(false))
    }
  }, [dispatch])

  const exportProfitLoss = useCallback(async (data: ProfitLossSummary) => {
    setIsExportingLocal(true)
    dispatch(setExporting(true))
    try {
      const { exportProfitLossExcel } = await import('../../application/use-cases/ExportProfitLossExcel')
      await exportProfitLossExcel(data)
    } finally {
      await new Promise(r => setTimeout(r, 1500))
      setIsExportingLocal(false)
      dispatch(setExporting(false))
    }
  }, [dispatch])

  return { isExporting, exportAgingAR, exportProfitLoss }
}
