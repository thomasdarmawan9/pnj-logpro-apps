import CustomerStockDetailPage from '@/features/stock/presentation/pages/CustomerStockDetailPage'

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function Page({ params }: Props) {
  const { uuid } = await params
  return <CustomerStockDetailPage uuid={uuid} />
}
