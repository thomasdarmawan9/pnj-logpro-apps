import DashboardLayout from '@/components/layout/DashboardLayout'
import FleetUtilizationPage from '@/features/reports/presentation/pages/FleetUtilizationPage'

export default function Page() {
  return (
    <DashboardLayout>
      <FleetUtilizationPage />
    </DashboardLayout>
  )
}
