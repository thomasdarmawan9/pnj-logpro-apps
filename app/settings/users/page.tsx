import DashboardLayout from '@/components/layout/DashboardLayout'
import UserManagementPage from '@/features/settings/presentation/pages/UserManagementPage'

export default function Page() {
  return (
    <DashboardLayout>
      <UserManagementPage />
    </DashboardLayout>
  )
}
