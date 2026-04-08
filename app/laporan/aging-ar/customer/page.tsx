import { Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AgingARCustomerDetailPage from '@/features/reports/presentation/pages/AgingARCustomerDetailPage'

export default function Page() {
  return (
    <DashboardLayout>
      <Suspense>
        <AgingARCustomerDetailPage />
      </Suspense>
    </DashboardLayout>
  )
}
