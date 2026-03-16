import DetailStockDisbursementPage from '@/features/stock/presentation/pages/DetailStockDisbursementPage'

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function Page({ params }: Props) {
  const { uuid } = await params
  return <DetailStockDisbursementPage uuid={uuid} />
}
