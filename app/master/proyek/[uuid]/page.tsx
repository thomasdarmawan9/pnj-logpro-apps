import DashboardLayout from '@/components/layout/DashboardLayout'
import ProjectDetailPage from '@/features/master/presentation/pages/ProjectDetailPage'

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function Page({ params }: Props) {
  const { uuid } = await params
  return (
    <DashboardLayout>
      <ProjectDetailPage uuid={uuid} />
    </DashboardLayout>
  )
}
