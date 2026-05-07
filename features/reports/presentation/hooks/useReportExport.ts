'use client'

import { useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { setExporting } from '@/store/slices/reportsSlice'
import { AgingARSummary } from '@/features/reports/domain/entities/AgingARReport'
import { ProfitLossSummary } from '@/features/reports/domain/entities/ProfitLossReport'
import { exportAgingARReport, exportProfitLossReport } from '../../infrastructure/repositories/MockReportsRepository'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function useReportExport() {
  const dispatch = useDispatch<AppDispatch>()
  const agingFilters = useSelector((state: RootState) => state.reports.agingAR.filters)
  const profitLossFilters = useSelector((state: RootState) => state.reports.profitLoss.filters)
  const [isExporting, setIsExportingLocal] = useState(false)

  const exportAgingAR = useCallback(async (_data: AgingARSummary) => {
    setIsExportingLocal(true)
    dispatch(setExporting(true))
    try {
      const blob = await exportAgingARReport(agingFilters)
      downloadBlob(blob, `aging-ar-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setIsExportingLocal(false)
      dispatch(setExporting(false))
    }
  }, [agingFilters, dispatch])

  const exportProfitLoss = useCallback(async (_data: ProfitLossSummary) => {
    setIsExportingLocal(true)
    dispatch(setExporting(true))
    try {
      const blob = await exportProfitLossReport(profitLossFilters)
      downloadBlob(blob, `profit-loss-${new Date().toISOString().slice(0, 10)}.xlsx`)
    } finally {
      setIsExportingLocal(false)
      dispatch(setExporting(false))
    }
  }, [dispatch, profitLossFilters])

  return { isExporting, exportAgingAR, exportProfitLoss }
}
