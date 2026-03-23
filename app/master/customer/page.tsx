import DashboardLayout from '@/components/layout/DashboardLayout'
import CustomerListPage from '@/features/master/presentation/pages/CustomerListPage'

export default function Page() {
  return (
    <DashboardLayout>
      <CustomerListPage />
    </DashboardLayout>
  )
}
