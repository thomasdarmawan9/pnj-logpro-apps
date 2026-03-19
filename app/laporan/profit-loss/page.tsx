import DashboardLayout from '@/components/layout/DashboardLayout'
import ProfitLossPage from '@/features/reports/presentation/pages/ProfitLossPage'

export default function Page() {
  return (
    <DashboardLayout>
      <ProfitLossPage />
    </DashboardLayout>
  )
}
