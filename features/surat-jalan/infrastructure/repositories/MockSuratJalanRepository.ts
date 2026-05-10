import { apiDownload, apiRequest } from '@/lib/apiClient'
import { SuratJalan, StatusLampiran, SJFilterState, PaginationState } from '../../domain/entities/SuratJalan'
import { ISuratJalanRepository, PaginatedResult } from './ISuratJalanRepository'
import { CreateSJDto } from '../../application/dto/CreateSJDto'
import { UpdateSJDto } from '../../application/dto/UpdateSJDto'
import { AssignSJInput } from '../../application/use-cases/AssignSuratJalan'
import { DeliverSJInput } from '../../application/use-cases/DeliverSuratJalan'

type ApiSJ = Omit<SuratJalan, 'id' | 'project_id' | 'customer_id' | 'fleet_id' | 'driver_id' | 'invoice_id' | 'created_by' | 'operational_cost' | 'project' | 'customer' | 'fleet'> & {
  id: number | string
  project_id: number | string
  project?: SuratJalan['project'] | null
  customer_id: number | string
  customer?: SuratJalan['customer'] | null
  fleet_id: number | string
  fleet?: SuratJalan['fleet'] | null
  driver_id: number | string | null
  invoice_id: number | string | null
  created_by: number | string
  operational_cost: number | string
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  return Number(value)
}

function normalizeSJ(sj: ApiSJ): SuratJalan {
  const projectId = Number(sj.project_id || sj.project?.id || 0)
  const customerId = Number(sj.customer_id || sj.customer?.id || 0)
  const fleetId = Number(sj.fleet_id || sj.fleet?.id || 0)

  return {
    ...sj,
    id: Number(sj.id),
    project_id: projectId,
    project: {
      id: Number(sj.project?.id || projectId),
      name: sj.project?.name || 'Data proyek tidak tersedia',
      code: sj.project?.code || '-',
      contract_number: sj.project?.contract_number || '',
    },
    customer_id: customerId,
    customer: {
      id: Number(sj.customer?.id || customerId),
      name: sj.customer?.name || 'Data customer tidak tersedia',
    },
    fleet_id: fleetId,
    fleet: {
      id: Number(sj.fleet?.id || fleetId),
      name: sj.fleet?.name || 'Data armada tidak tersedia',
      plate_number: sj.fleet?.plate_number || '-',
      is_tbd: Boolean(sj.fleet?.is_tbd),
    },
    driver_id: toNumber(sj.driver_id),
    driver: sj.driver ? { ...sj.driver, id: Number(sj.driver.id) } : null,
    operational_cost: Number(sj.operational_cost || 0),
    invoice_id: toNumber(sj.invoice_id),
    invoice_attachment_status: sj.invoice_attachment_status || StatusLampiran.NO_INVOICE,
    invoice: sj.invoice ? { ...sj.invoice, id: Number(sj.invoice.id) } : null,
    lampiran_paths: sj.lampiran_paths ?? null,
    created_by: Number(sj.created_by || 0),
  }
}

function applyFrontendFilters(list: SuratJalan[], filters: SJFilterState) {
  return list.filter(sj => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const match =
        sj.sj_number.toLowerCase().includes(q) ||
        sj.customer.name.toLowerCase().includes(q) ||
        sj.project.name.toLowerCase().includes(q) ||
        sj.fleet.plate_number.toLowerCase().includes(q)
      if (!match) return false
    }
    if (filters.statusOps !== 'all' && sj.status !== filters.statusOps) return false
    if (filters.statusLampiran !== 'all' && sj.invoice_attachment_status !== filters.statusLampiran) return false
    if (filters.proyek && filters.proyek !== 'all' && sj.project.code !== filters.proyek) return false
    if (filters.customer && filters.customer !== 'all' && sj.customer.name !== filters.customer) return false
    return true
  })
}

function toCreatePayload(dto: CreateSJDto) {
  return {
    project_id: dto.project_id,
    fleet_id: dto.fleet_id,
    driver_id: dto.driver_id,
    driver_name_manual: dto.driver_name_manual,
    sj_date: dto.sj_date,
    origin: dto.origin,
    destination: dto.destination,
    cargo_description: dto.cargo_description,
    items: dto.items.length > 0 ? dto.items : null,
    operational_cost: dto.operational_cost,
    internal_notes: dto.internal_notes,
    publish: dto.publish,
  }
}

function toUpdatePayload(dto: UpdateSJDto) {
  return {
    fleet_id: dto.fleet_id,
    driver_id: dto.driver_id,
    driver_name_manual: dto.driver_name_manual,
    origin: dto.origin,
    destination: dto.destination,
    cargo_description: dto.cargo_description,
    items: dto.items,
    operational_cost: dto.operational_cost,
    internal_notes: dto.internal_notes,
    lampiran_paths: dto.lampiran_paths,
  }
}

export class MockSuratJalanRepository implements ISuratJalanRepository {
  async getList(filters: SJFilterState, pagination: PaginationState): Promise<PaginatedResult<SuratJalan>> {
    const response = await apiRequest<ApiSJ[]>(`/surat-jalan?status=all&invoice_status=all&period=${filters.periode}&page=1&limit=100`, {
      method: 'GET',
    })
    const filtered = applyFrontendFilters(response.data.map(normalizeSJ), filters)
    const start = (pagination.page - 1) * pagination.perPage
    return {
      data: filtered.slice(start, start + pagination.perPage),
      total: filtered.length,
      page: pagination.page,
      perPage: pagination.perPage,
    }
  }

  async getByUuid(uuid: string): Promise<SuratJalan | null> {
    const response = await apiRequest<ApiSJ>(`/surat-jalan/${uuid}`, { method: 'GET' })
    return normalizeSJ(response.data)
  }

  async create(dto: CreateSJDto): Promise<SuratJalan> {
    const response = await apiRequest<ApiSJ>('/surat-jalan', {
      method: 'POST',
      body: toCreatePayload(dto),
    })
    return normalizeSJ(response.data)
  }

  async update(uuid: string, dto: UpdateSJDto): Promise<SuratJalan> {
    const response = await apiRequest<ApiSJ>(`/surat-jalan/${uuid}`, {
      method: 'PUT',
      body: toUpdatePayload(dto),
    })
    return normalizeSJ(response.data)
  }

  async assign(uuid: string, input: AssignSJInput): Promise<SuratJalan> {
    const response = await apiRequest<ApiSJ>(`/surat-jalan/${uuid}/assign`, {
      method: 'PATCH',
      body: {
        fleet_id: input.fleet_id,
        driver_id: input.driver_id,
        driver_name_manual: input.driver_name_manual,
      },
    })
    return normalizeSJ(response.data)
  }

  async deliver(uuid: string, input: DeliverSJInput): Promise<SuratJalan> {
    const response = await apiRequest<ApiSJ>(`/surat-jalan/${uuid}/deliver`, {
      method: 'PATCH',
      body: { delivered_at: input.delivered_at },
    })
    return normalizeSJ(response.data)
  }

  async void(uuid: string, reason: string): Promise<SuratJalan> {
    const response = await apiRequest<ApiSJ>(`/surat-jalan/${uuid}/void`, {
      method: 'PATCH',
      body: { void_reason: reason, confirmation: 'VOID', force_detach: true },
    })
    return normalizeSJ(response.data)
  }

  async delete(uuid: string): Promise<void> {
    await apiRequest<null>(`/surat-jalan/${uuid}`, { method: 'DELETE' })
  }

  async attachToInvoice(sjUuid: string, _invoiceId: number, invoiceUuid: string, _invoiceNumber: string): Promise<SuratJalan> {
    await apiRequest(`/invoices/${invoiceUuid}/attach-sj`, {
      method: 'POST',
      body: { sj_uuids: [sjUuid] },
    })
    const response = await apiRequest<ApiSJ>(`/surat-jalan/${sjUuid}`, { method: 'GET' })
    return normalizeSJ(response.data)
  }
}

export async function uploadSuratJalanPOD(uuid: string, file: File): Promise<SuratJalan> {
  const formData = new FormData()
  formData.append('photo', file)
  const response = await apiRequest<ApiSJ>(`/surat-jalan/${uuid}/pod`, {
    method: 'POST',
    body: formData,
  })
  return normalizeSJ(response.data)
}

export async function downloadSuratJalanPOD(uuid: string): Promise<Blob> {
  return apiDownload(`/surat-jalan/${uuid}/pod`)
}

export async function uploadSuratJalanLampiran(uuid: string, file: File): Promise<SuratJalan> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiRequest<ApiSJ>(`/surat-jalan/${uuid}/lampiran`, {
    method: 'POST',
    body: formData,
  })
  return normalizeSJ(response.data)
}

export async function deleteSuratJalanLampiran(uuid: string, filePath: string): Promise<SuratJalan> {
  // filePath: "sj-lampiran/uuid.webp" → extract filename-only bagian terakhir
  const filename = filePath.split('/').pop()!
  const response = await apiRequest<ApiSJ>(`/surat-jalan/${uuid}/lampiran/${filename}`, {
    method: 'DELETE',
  })
  return normalizeSJ(response.data)
}

export async function generateSuratJalanPdf(
  uuid: string,
  options: {
    includeHeader: boolean
    includeSign: boolean
    includeNotes: boolean
    includeLampiran?: boolean
    copies?: number
    copyLabel?: boolean
  },
) {
  const response = await apiRequest<{ uuid: string; status: string; download_url: string | null }>(`/surat-jalan/${uuid}/generate-pdf`, {
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

export const suratJalanRepository = new MockSuratJalanRepository()
