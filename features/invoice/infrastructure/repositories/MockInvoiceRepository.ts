import { apiDownload, apiRequest } from '@/lib/apiClient'
import { Invoice, InvoiceStatus, InvoiceFilterState, PaginationState, AttachedSJ, AvailableInvoice, Payment, InvoiceItem, DownPayment } from '../../domain/entities/Invoice'
import { IInvoiceRepository, PaginatedResult } from './IInvoiceRepository'
import { CreateInvoiceDto, CreateInvoiceItemDto } from '../../application/dto/CreateInvoiceDto'
import { UpdateInvoiceDto } from '../../application/dto/UpdateInvoiceDto'
import { RecordPaymentDto } from '../../application/dto/RecordPaymentDto'

type ApiId = number | string | null

type ApiInvoiceItem = Omit<InvoiceItem, 'id' | 'invoice_id' | 'fleet_id' | 'qty' | 'unit_price' | 'subtotal' | 'sort_order' | 'source_sj_id'> & {
  id?: ApiId
  invoice_id?: ApiId
  fleet_id?: ApiId
  qty: number | string
  unit_price: number | string
  subtotal: number | string
  sort_order: number | string
  source_sj_id?: ApiId
}

type ApiAttachedSJ = Omit<AttachedSJ, 'fleet_label' | 'driver_name'> & {
  fleet_label?: string | null
  driver_name?: string | null
  driver_name_manual?: string | null
  fleet?: { name?: string | null; plate_number?: string | null } | null
  driver?: { name?: string | null } | null
}

type ApiPayment = Omit<Payment, 'id' | 'invoice_id' | 'amount' | 'created_by_name'> & {
  id?: ApiId
  invoice_id?: ApiId
  amount: number | string
  created_by_name?: string | null
  creator?: { name?: string | null } | null
}

type ApiInvoice = Omit<
  Invoice,
  | 'id'
  | 'project_id'
  | 'project'
  | 'customer_id'
  | 'customer'
  | 'subtotal_amount'
  | 'tax_percent'
  | 'tax_amount'
  | 'pph_percent'
  | 'pph_amount'
  | 'total_amount'
  | 'paid_amount'
  | 'remaining_amount'
  | 'items'
  | 'attached_sj'
  | 'payments'
  | 'created_by'
> & {
  id?: ApiId
  project_id?: ApiId
  project?: Invoice['project'] | null
  customer_id?: ApiId
  customer?: Invoice['customer'] | null
  subtotal_amount: number | string
  tax_percent: number | string
  tax_amount: number | string
  pph_percent?: number | string | null
  pph_amount?: number | string | null
  total_amount: number | string
  paid_amount: number | string
  down_payment?: ApiPayment | null
  down_payment_amount?: number | string | null
  has_down_payment?: boolean
  remaining_amount?: number | string | null
  items?: ApiInvoiceItem[]
  attached_sj?: ApiAttachedSJ[]
  attachedSJs?: ApiAttachedSJ[]
  payments?: ApiPayment[]
  created_by?: ApiId
}

function toNumber(value: ApiId | undefined): number {
  return Number(value || 0)
}

function toNullableNumber(value: ApiId | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  return Number(value)
}

function normalizeAttachedSJ(sj: ApiAttachedSJ): AttachedSJ {
  const fleetLabel = sj.fleet_label || [sj.fleet?.name, sj.fleet?.plate_number].filter(Boolean).join(' ') || '-'
  return {
    uuid: sj.uuid,
    sj_number: sj.sj_number,
    sj_date: sj.sj_date,
    origin: sj.origin,
    destination: sj.destination,
    fleet_label: fleetLabel,
    driver_name: sj.driver_name || sj.driver?.name || sj.driver_name_manual || '-',
    status: sj.status,
  }
}

function normalizePayment(payment: ApiPayment): Payment {
  return {
    id: toNumber(payment.id),
    uuid: payment.uuid,
    invoice_id: toNumber(payment.invoice_id),
    payment_date: payment.payment_date,
    amount: Number(payment.amount || 0),
    method: payment.method,
    proof_path: payment.proof_path,
    notes: payment.notes,
    is_down_payment: Boolean(payment.is_down_payment),
    created_by_name: payment.created_by_name || payment.creator?.name || 'Admin Finance PNJ',
    created_at: payment.created_at,
  }
}

function normalizeDownPayment(payment: ApiPayment | null | undefined): DownPayment | null {
  if (!payment) return null
  return {
    ...normalizePayment(payment),
    is_down_payment: true,
  }
}

function normalizeItem(item: ApiInvoiceItem): InvoiceItem {
  return {
    ...item,
    id: toNumber(item.id),
    invoice_id: toNumber(item.invoice_id),
    fleet_id: toNullableNumber(item.fleet_id),
    fleet: item.fleet ? { ...item.fleet, id: toNumber(item.fleet.id) } : null,
    qty: Number(item.qty || 0),
    unit_price: Number(item.unit_price || 0),
    subtotal: Number(item.subtotal || 0),
    sort_order: Number(item.sort_order || 0),
    source_sj_id: toNullableNumber(item.source_sj_id),
  }
}

function normalizeInvoice(inv: ApiInvoice): Invoice {
  const total = Number(inv.total_amount || 0)
  const paid = Number(inv.paid_amount || 0)
  const attached = inv.attached_sj || inv.attachedSJs || []
  const projectId = toNumber(inv.project_id ?? inv.project?.id)
  const customerId = toNumber(inv.customer_id ?? inv.customer?.id)
  const downPayment = normalizeDownPayment(inv.down_payment)
  const downPaymentAmount = Number(inv.down_payment_amount ?? downPayment?.amount ?? 0)

  return {
    ...inv,
    payment_method: inv.payment_method ?? 'transfer',
    id: toNumber(inv.id),
    project_id: projectId,
    project: {
      id: toNumber(inv.project?.id ?? projectId),
      name: inv.project?.name || 'Data proyek tidak tersedia',
      code: inv.project?.code || '-',
      contract_number: inv.project?.contract_number || '',
    },
    customer_id: customerId,
    customer: {
      id: toNumber(inv.customer?.id ?? customerId),
      name: inv.customer?.name || 'Data customer tidak tersedia',
      address: inv.customer?.address || null,
      npwp: inv.customer?.npwp || null,
      is_pkp: Boolean(inv.customer?.is_pkp),
    },
    items: (inv.items || []).map(normalizeItem),
    subtotal_amount: Number(inv.subtotal_amount || 0),
    tax_percent: Number(inv.tax_percent || 0),
    tax_amount: Number(inv.tax_amount || 0),
    pph_percent: Number(inv.pph_percent || 0),
    pph_amount: Number(inv.pph_amount || 0),
    total_amount: total,
    paid_amount: paid,
    down_payment: downPayment,
    down_payment_amount: downPaymentAmount,
    has_down_payment: Boolean(inv.has_down_payment || downPaymentAmount > 0 || downPayment),
    remaining_amount: Number(inv.remaining_amount ?? total - paid),
    attached_sj: attached.map(normalizeAttachedSJ),
    payments: (inv.payments || []).map(normalizePayment),
    created_by: toNumber(inv.created_by),
  }
}

function applyFrontendFilters(list: Invoice[], filters: InvoiceFilterState): Invoice[] {
  const now = new Date()
  return list.filter(inv => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const match =
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer.name.toLowerCase().includes(q) ||
        inv.project.name.toLowerCase().includes(q) ||
        inv.project.contract_number.toLowerCase().includes(q)
      if (!match) return false
    }
    if (filters.status && filters.status !== 'all' && inv.status !== filters.status) return false
    if (filters.customer && filters.customer !== 'all' && inv.customer.name !== filters.customer) return false
    if (filters.proyek && filters.proyek !== 'all' && inv.project.code !== filters.proyek) return false
    if (filters.periode && filters.periode !== 'all') {
      const invDate = new Date(inv.invoice_date)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      if (filters.periode === 'month' && (invDate < startOfMonth || invDate > now)) return false
      if (filters.periode === 'last_month' && (invDate < startOfLastMonth || invDate > endOfLastMonth)) return false
    }
    return true
  })
}

function toItemPayload(item: CreateInvoiceItemDto) {
  return {
    fleet_id: item.fleet_id ?? null,
    fleet_label: item.fleet_label,
    description: item.description,
    period_start: item.period_start,
    period_end: item.period_end,
    qty: item.qty,
    unit: item.unit,
    unit_price: item.unit_price,
    sort_order: item.sort_order,
  }
}

export class MockInvoiceRepository implements IInvoiceRepository {
  async getList(filters: InvoiceFilterState, pagination: PaginationState): Promise<PaginatedResult<Invoice>> {
    const response = await apiRequest<ApiInvoice[]>(`/invoices?status=all&period=all&page=1&limit=100`, {
      method: 'GET',
    })
    const filtered = applyFrontendFilters(response.data.map(normalizeInvoice), filters)
    const start = (pagination.page - 1) * pagination.perPage
    return {
      data: filtered.slice(start, start + pagination.perPage),
      total: filtered.length,
      page: pagination.page,
      perPage: pagination.perPage,
    }
  }

  async getByUuid(uuid: string): Promise<Invoice | null> {
    const response = await apiRequest<ApiInvoice>(`/invoices/${uuid}`, { method: 'GET' })
    return normalizeInvoice(response.data)
  }

  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    const response = await apiRequest<ApiInvoice>('/invoices', {
      method: 'POST',
      body: {
        project_id: dto.project_id,
        invoice_date: dto.invoice_date,
        due_date: dto.due_date,
        payment_method: dto.payment_method,
        tax_percent: dto.tax_percent,
        pph_percent: dto.pph_percent,
        notes: dto.notes,
        items: dto.items.map(toItemPayload),
        send_immediately: dto.send_immediately,
        down_payment: dto.down_payment ?? undefined,
      },
    })
    return normalizeInvoice(response.data)
  }

  async update(uuid: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    const response = await apiRequest<ApiInvoice>(`/invoices/${uuid}`, {
      method: 'PUT',
      body: {
        ...dto,
        items: dto.items?.map(toItemPayload),
      },
    })
    return normalizeInvoice(response.data)
  }

  async send(uuid: string): Promise<Invoice> {
    await apiRequest<ApiInvoice>(`/invoices/${uuid}/send`, { method: 'PATCH' })
    const response = await apiRequest<ApiInvoice>(`/invoices/${uuid}/mark-outstanding`, { method: 'PATCH' })
    return normalizeInvoice(response.data)
  }

  async recordPayment(uuid: string, dto: RecordPaymentDto): Promise<Invoice> {
    const response = await apiRequest<ApiInvoice>(`/invoices/${uuid}/payments`, {
      method: 'POST',
      body: dto,
    })
    return normalizeInvoice(response.data)
  }

  async void(uuid: string, reason: string): Promise<Invoice> {
    const response = await apiRequest<ApiInvoice>(`/invoices/${uuid}/void`, {
      method: 'PATCH',
      body: { void_reason: reason, confirmation: 'VOID' },
    })
    return normalizeInvoice(response.data)
  }

  async attachSJ(invoiceUuid: string, sjUuids: string[]): Promise<Invoice> {
    const response = await apiRequest<ApiInvoice>(`/invoices/${invoiceUuid}/attach-sj`, {
      method: 'POST',
      body: { sj_uuids: sjUuids },
    })
    return normalizeInvoice(response.data)
  }

  async detachSJ(invoiceUuid: string, sjUuid: string): Promise<Invoice> {
    const response = await apiRequest<ApiInvoice>(`/invoices/${invoiceUuid}/detach-sj/${sjUuid}`, {
      method: 'DELETE',
    })
    return normalizeInvoice(response.data)
  }

  async getAttachableSJ(projectOrInvoiceUuid: string): Promise<AttachedSJ[]> {
    const response = await apiRequest<ApiAttachedSJ[]>(`/invoices/${projectOrInvoiceUuid}/attachable-sj`, {
      method: 'GET',
    })
    return response.data.map(normalizeAttachedSJ)
  }

  async getAvailableForAttachment(projectId: number, sjUuid: string): Promise<AvailableInvoice[]> {
    const response = await apiRequest<ApiInvoice[]>('/invoices?status=all&period=all&page=1&limit=100', {
      method: 'GET',
    })
    return response.data
      .map(normalizeInvoice)
      .filter(inv =>
        Number(inv.project_id) === projectId &&
        [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.OUTSTANDING].includes(inv.status) &&
        !inv.attached_sj.some(s => s.uuid === sjUuid)
      )
      .map(inv => ({
        id: Number(inv.id),
        uuid: inv.uuid,
        invoice_number: inv.invoice_number,
        status: inv.status,
        invoice_date: inv.invoice_date,
        due_date: inv.due_date,
        total_amount: inv.total_amount,
        remaining_amount: inv.remaining_amount,
      }))
  }

  async attachSJDirect(invoiceUuid: string, sjEntry: AttachedSJ): Promise<Invoice> {
    return this.attachSJ(invoiceUuid, [sjEntry.uuid])
  }
}

export async function exportInvoices() {
  return apiDownload('/invoices/export?status=all&period=all&page=1&limit=100')
}

export async function uploadInvoiceLampiran(uuid: string, file: File): Promise<Invoice> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiRequest<ApiInvoice>(`/invoices/${uuid}/lampiran`, {
    method: 'POST',
    body: formData,
  })
  return normalizeInvoice(response.data)
}

export async function deleteInvoiceLampiran(uuid: string, path: string): Promise<Invoice> {
  const filename = path.split('/').pop()
  const response = await apiRequest<ApiInvoice>(`/invoices/${uuid}/lampiran/${filename}`, {
    method: 'DELETE',
  })
  return normalizeInvoice(response.data)
}

export async function generateInvoicePdf(
  uuid: string,
  options: {
    includeLogo: boolean
    includeSig: boolean
    includeSJ: boolean
    copies?: number
    copyLabel?: boolean
  },
) {
  const response = await apiRequest<{ uuid: string; status: string; download_url: string | null }>(`/invoices/${uuid}/generate-pdf`, {
    method: 'POST',
    body: { options },
  })
  return response.data
}

export async function getPdfJob(uuid: string) {
  const response = await apiRequest<{ uuid: string; status: string; download_url: string | null }>(`/pdf-jobs/${uuid}`, {
    method: 'GET',
  })
  return response.data
}

export async function downloadPdfJob(uuid: string) {
  return apiDownload(`/pdf-jobs/${uuid}/download`)
}

export const invoiceRepository = new MockInvoiceRepository()
