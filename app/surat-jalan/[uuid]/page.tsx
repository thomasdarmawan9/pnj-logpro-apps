import DetailSuratJalanPage from '@/features/surat-jalan/presentation/pages/DetailSuratJalanPage'

export default async function Page({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params
  return <DetailSuratJalanPage uuid={uuid} />
}
