import { Suspense } from 'react'
import StockReportPage from '@/features/stock/presentation/pages/StockReportPage'

export default function Page() {
  return (
    <Suspense fallback={null}>
      <StockReportPage />
    </Suspense>
  )
}
