import DetailStockReceiptPage from '@/features/stock/presentation/pages/DetailStockReceiptPage'

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function Page({ params }: Props) {
  const { uuid } = await params
  return <DetailStockReceiptPage uuid={uuid} />
}
