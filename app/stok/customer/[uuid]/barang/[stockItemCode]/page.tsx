import CustomerStockItemDetailPage from '@/features/stock/presentation/pages/CustomerStockItemDetailPage'

interface Props {
  params: Promise<{ uuid: string; stockItemCode: string }>
}

export default async function Page({ params }: Props) {
  const { uuid, stockItemCode } = await params
  return <CustomerStockItemDetailPage customerUuid={uuid} stockItemCode={stockItemCode} />
}
