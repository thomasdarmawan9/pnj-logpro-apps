import EditSuratJalanPage from '@/features/surat-jalan/presentation/pages/EditSuratJalanPage'

export default async function Page({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params
  return <EditSuratJalanPage uuid={uuid} />
}
