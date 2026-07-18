'use client'

import { useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { setExporting } from '@/store/slices/reportsSlice'
import { AgingARSummary } from '@/features/reports/domain/entities/AgingARReport'
import { ProfitLossSummary } from '@/features/reports/domain/entities/ProfitLossReport'
import { exportAgingARReport, exportProfitLossReport } from '../../infrastructure/repositories/MockReportsRepository'
import { exportAgingARPdf } from '../../application/use-cases/ExportAgingARPdf'
import { todayDateOnly } from '@/lib/dateOnly'

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
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const exportAgingAR = useCallback(async (_data: AgingARSummary) => {
    setIsExportingLocal(true)
    dispatch(setExporting(true))
    try {
      const blob = await exportAgingARReport(agingFilters)
      downloadBlob(blob, `aging-ar-${todayDateOnly()}.xlsx`)
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
      downloadBlob(blob, `profit-loss-${todayDateOnly()}.xlsx`)
    } finally {
      setIsExportingLocal(false)
      dispatch(setExporting(false))
    }
  }, [dispatch, profitLossFilters])

  const exportAgingARPdfFn = useCallback(async (data: AgingARSummary) => {
    setIsExportingPdf(true)
    try {
      await exportAgingARPdf(data)
    } finally {
      setIsExportingPdf(false)
    }
  }, [])

  return { isExporting, isExportingPdf, exportAgingAR, exportAgingARPdfFn, exportProfitLoss }
}
