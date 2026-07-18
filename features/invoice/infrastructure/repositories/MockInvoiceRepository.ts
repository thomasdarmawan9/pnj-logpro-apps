import { apiDownload, apiRequest, apiRequestAllPages } from '@/lib/apiClient'
import { Invoice, InvoiceStatus, InvoiceFilterState, PaginationState, AttachedSJ, AvailableInvoice, Payment, InvoiceItem, DownPayment, InvoiceSummaryStats } from '../../domain/entities/Invoice'
import { IInvoiceRepository, PaginatedResult } from './IInvoiceRepository'
import { CreateInvoiceDto, CreateInvoiceItemDto } from '../../application/dto/CreateInvoiceDto'
import { UpdateInvoiceDto } from '../../application/dto/UpdateInvoiceDto'
import { BulkRecordPaymentDto, RecordPaymentDto } from '../../application/dto/RecordPaymentDto'
import { resolveEffectiveInvoiceServiceType } from '../../domain/services/invoiceServiceType'

type ApiId = number | string | null

type ApiInvoiceItem = Omit<InvoiceItem, 'id' | 'invoice_id' | 'fleet_id' | 'driver_id' | 'qty' | 'unit_price' | 'subtotal' | 'sort_order' | 'source_sj_id' | 'cargo_qty' | 'cargo_weight' | 'cargo_volume' | 'rental_duration_years' | 'rental_duration_months' | 'rental_duration_days' | 'rental_duration_hours'> & {
  id?: ApiId
  invoice_id?: ApiId
  fleet_id?: ApiId
  driver_id?: ApiId
  rental_duration_years?: number | string | null
  rental_duration_months?: number | string | null
  rental_duration_days?: number | string | null
  rental_duration_hours?: number | string | null
  qty: number | string
  cargo_qty?: number | string | null
  cargo_weight?: number | string | null
  cargo_volume?: number | string | null
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
  insurance_amount?: number | string | null
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
    driver_id: toNullableNumber(item.driver_id),
    driver: item.driver ? { ...item.driver, id: toNumber(item.driver.id) } : null,
    driver_name_manual: item.driver_name_manual ?? null,
    rental_duration_years: Number(item.rental_duration_years || 0),
    rental_duration_months: Number(item.rental_duration_months || 0),
    rental_duration_days: Number(item.rental_duration_days || 0),
    rental_duration_hours: Number(item.rental_duration_hours || 0),
    qty: Number(item.qty || 0),
    cargo_qty: item.cargo_qty === null || item.cargo_qty === undefined ? null : Number(item.cargo_qty || 0),
    cargo_unit: item.cargo_unit ?? null,
    cargo_weight: item.cargo_weight === null || item.cargo_weight === undefined ? null : Number(item.cargo_weight || 0),
    cargo_volume: item.cargo_volume === null || item.cargo_volume === undefined ? null : Number(item.cargo_volume || 0),
    cargo_notes: item.cargo_notes ?? null,
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
  const projectId = toNullableNumber(inv.project_id ?? inv.project?.id)
  const customerId = toNumber(inv.customer_id ?? inv.customer?.id)
  const downPayment = normalizeDownPayment(inv.down_payment)
  const downPaymentAmount = Number(inv.down_payment_amount ?? downPayment?.amount ?? 0)

  return {
    ...inv,
    payment_method: inv.payment_method ?? 'transfer',
    settlement_date: inv.settlement_date ?? null,
    service_type: inv.service_type ?? 'delivery',
    custom_service_name: inv.custom_service_name ?? null,
    delivery_pricing_mode: inv.delivery_pricing_mode ?? 'shipment',
    id: toNumber(inv.id),
    project_id: projectId,
    project: inv.project ? {
      id: toNumber(inv.project.id ?? projectId),
      name: inv.project.name || 'Data proyek tidak tersedia',
      code: inv.project.code || '-',
      contract_number: inv.project.contract_number || '',
    } : null,
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
    insurance_amount: Number(inv.insurance_amount || 0),
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

async function fetchAllInvoices() {
  return apiRequestAllPages<ApiInvoice>('/invoices?status=all&period=all', { method: 'GET' })
}

function toItemPayload(item: CreateInvoiceItemDto) {
  return {
    uuid: item.uuid ?? null,
    source_sj_id: item.source_sj_id ?? null,
    fleet_id: item.fleet_id ?? null,
    driver_id: item.driver_id ?? null,
    driver_name_manual: item.driver_name_manual || null,
    fleet_label: item.fleet_label,
    description: item.description,
    period_start: item.period_start,
    period_end: item.period_end,
    rental_duration_years: item.rental_duration_years ?? 0,
    rental_duration_months: item.rental_duration_months ?? 0,
    rental_duration_days: item.rental_duration_days ?? 0,
    rental_duration_hours: item.rental_duration_hours ?? 0,
    qty: item.qty,
    unit: item.unit,
    cargo_qty: item.cargo_qty ?? null,
    cargo_unit: item.cargo_unit ?? null,
    cargo_weight: item.cargo_weight ?? null,
    cargo_volume: item.cargo_volume ?? null,
    cargo_notes: item.cargo_notes ?? null,
    unit_price: item.unit_price,
    sort_order: item.sort_order,
  }
}

export class MockInvoiceRepository implements IInvoiceRepository {
  async getList(filters: InvoiceFilterState, pagination: PaginationState): Promise<PaginatedResult<Invoice>> {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    params.set('status', filters.status || 'all')
    if (filters.customer && filters.customer !== 'all') params.set('customer_uuid', filters.customer)
    if (filters.proyek && filters.proyek !== 'all') params.set('project_uuid', filters.proyek)
    params.set('period', filters.periode || 'all')

    const listParams = new URLSearchParams(params)
    listParams.set('page', String(pagination.page))
    listParams.set('limit', String(pagination.perPage))

    const [listRes, summaryRes] = await Promise.all([
      apiRequest<ApiInvoice[]>(`/invoices?${listParams.toString()}`, { method: 'GET' }),
      apiRequest<InvoiceSummaryStats>(`/invoices/summary?${params.toString()}`, { method: 'GET' }),
    ])

    return {
      data: listRes.data.map(normalizeInvoice),
      total: listRes.meta?.total ?? listRes.data.length,
      page: pagination.page,
      perPage: pagination.perPage,
      summary: summaryRes.data,
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
        project_id: dto.project_id ?? null,
        customer_id: dto.customer_id ?? null,
        invoice_date: dto.invoice_date,
        due_date: dto.due_date,
        delivery_date: dto.delivery_date ?? null,
        service_type: dto.service_type,
        custom_service_name: dto.service_type === 'other' ? dto.custom_service_name ?? null : null,
        delivery_pricing_mode: dto.delivery_pricing_mode ?? 'shipment',
        payment_method: dto.payment_method,
        bank_account_id: dto.payment_method === 'transfer' ? dto.bank_account_id ?? null : null,
        tax_percent: dto.tax_percent,
        pph_percent: dto.pph_percent,
        insurance_amount: dto.insurance_amount ?? 0,
        notes: dto.notes,
        origin: dto.origin ?? null,
        destination: dto.destination ?? null,
        cargo_description: dto.cargo_description ?? null,
        manual_sj_numbers: dto.manual_sj_numbers ?? null,
        linked_sj_uuids: dto.linked_sj_uuids ?? [],
        items: dto.items.map(toItemPayload),
        send_immediately: dto.send_immediately,
        down_payment: dto.down_payment ?? undefined,
        auto_create_sj: dto.auto_create_sj ?? true,
        overwrite_sj_confirmed: dto.overwrite_sj_confirmed ?? false,
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

  async recordBulkPayments(dto: BulkRecordPaymentDto): Promise<Invoice[]> {
    const response = await apiRequest<ApiInvoice[]>('/invoices/payments/bulk', {
      method: 'POST',
      body: dto,
    })
    return response.data.map(normalizeInvoice)
  }

  async void(uuid: string, reason: string): Promise<Invoice> {
    const response = await apiRequest<ApiInvoice>(`/invoices/${uuid}/void`, {
      method: 'PATCH',
      body: { void_reason: reason, confirmation: 'VOID' },
    })
    return normalizeInvoice(response.data)
  }

  async revertPayment(uuid: string, reason: string): Promise<Invoice> {
    const response = await apiRequest<ApiInvoice>(`/invoices/${uuid}/revert-payment`, {
      method: 'PATCH',
      body: { reason },
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

  async getAvailableForAttachment(projectId: number | null, customerId: number, sjUuid: string): Promise<AvailableInvoice[]> {
    const invoices = await fetchAllInvoices()
    return invoices
      .map(normalizeInvoice)
      .filter(inv =>
        (projectId
          ? Number(inv.project_id) === projectId
          : !inv.project_id && Number(inv.customer_id) === customerId) &&
        resolveEffectiveInvoiceServiceType(inv.service_type, inv.custom_service_name) !== 'rental' &&
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
  return apiDownload('/invoices/export?status=all&period=all')
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
    includeLampiran?: boolean
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
