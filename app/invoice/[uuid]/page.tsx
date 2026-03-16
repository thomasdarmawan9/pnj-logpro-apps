import DetailInvoicePage from '@/features/invoice/presentation/pages/DetailInvoicePage'

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function Page({ params }: Props) {
  const { uuid } = await params
  return <DetailInvoicePage uuid={uuid} />
}
