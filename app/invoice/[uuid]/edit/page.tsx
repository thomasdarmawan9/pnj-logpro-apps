import EditInvoicePage from '@/features/invoice/presentation/pages/EditInvoicePage'

interface Props {
  params: Promise<{ uuid: string }>
}

export default async function Page({ params }: Props) {
  const { uuid } = await params
  return <EditInvoicePage uuid={uuid} />
}
