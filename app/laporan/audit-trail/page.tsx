import DashboardLayout from '@/components/layout/DashboardLayout'
import AuditTrailPage from '@/features/reports/presentation/pages/AuditTrailPage'

export default function Page() {
  return (
    <DashboardLayout>
      <AuditTrailPage />
    </DashboardLayout>
  )
}
