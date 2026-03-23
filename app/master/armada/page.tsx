import DashboardLayout from '@/components/layout/DashboardLayout'
import FleetListPage from '@/features/master/presentation/pages/FleetListPage'

export default function Page() {
  return (
    <DashboardLayout>
      <FleetListPage />
    </DashboardLayout>
  )
}
