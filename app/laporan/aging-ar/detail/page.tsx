import { Suspense } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import AgingARDetailPage from '@/features/reports/presentation/pages/AgingARDetailPage'

export default function Page() {
  return (
    <DashboardLayout>
      <Suspense>
        <AgingARDetailPage />
      </Suspense>
    </DashboardLayout>
  )
}
