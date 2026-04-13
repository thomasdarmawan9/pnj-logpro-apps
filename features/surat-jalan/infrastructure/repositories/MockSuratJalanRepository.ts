import { SuratJalan, StatusOperasional, StatusLampiran, SJFilterState, PaginationState } from '../../domain/entities/SuratJalan'
import { ISuratJalanRepository, PaginatedResult } from './ISuratJalanRepository'
import { CreateSJDto } from '../../application/dto/CreateSJDto'
import { UpdateSJDto } from '../../application/dto/UpdateSJDto'
import { AssignSJInput } from '../../application/use-cases/AssignSuratJalan'
import { DeliverSJInput } from '../../application/use-cases/DeliverSuratJalan'
import { MOCK_SURAT_JALAN } from '../../../../lib/mockData/suratJalan'

let store: SuratJalan[] = [...MOCK_SURAT_JALAN]
let nextId = store.length + 1
let nextSJNum = 90

function simulateDelay(ms = 400): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function applyFilters(list: SuratJalan[], filters: SJFilterState): SuratJalan[] {
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
    if (filters.periode && filters.periode !== 'all') {
      const sjDate = new Date(sj.sj_date)
      const now = new Date()
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

      if (filters.periode === 'today') {
        const sameDay = sjDate.toDateString() === now.toDateString()
        if (!sameDay) return false
      }
      if (filters.periode === 'week') {
        if (sjDate < startOfWeek || sjDate > now) return false
      }
      if (filters.periode === 'month') {
        if (sjDate < startOfMonth || sjDate > now) return false
      }
      if (filters.periode === 'last_month') {
        if (sjDate < startOfLastMonth || sjDate > endOfLastMonth) return false
      }
    }
    return true
  })
}

export class MockSuratJalanRepository implements ISuratJalanRepository {
  async getList(filters: SJFilterState, pagination: PaginationState): Promise<PaginatedResult<SuratJalan>> {
    await simulateDelay()
    const filtered = applyFilters(store, filters)
    const sorted = [...filtered].sort((a, b) => b.id - a.id)
    const start = (pagination.page - 1) * pagination.perPage
    const data = sorted.slice(start, start + pagination.perPage)
    return { data, total: filtered.length, page: pagination.page, perPage: pagination.perPage }
  }

  async getByUuid(uuid: string): Promise<SuratJalan | null> {
    await simulateDelay(200)
    return store.find(sj => sj.uuid === uuid) ?? null
  }

  async create(dto: CreateSJDto): Promise<SuratJalan> {
    await simulateDelay()
    const sjNum = `SJ-2026-0${nextSJNum++}`
    const now = new Date().toISOString()
    const newSJ: SuratJalan = {
      id: nextId++,
      uuid: `sj-${Date.now()}`,
      sj_number: sjNum,
      project_id: dto.project_id,
      project: { id: dto.project_id, name: 'Proyek', contract_number: '', code: `PRJ-${dto.project_id}` },
      customer_id: 1,
      customer: { id: 1, name: 'Customer' },
      fleet_id: dto.fleet_id,
      fleet: { id: dto.fleet_id, name: 'Armada', plate_number: 'KB XXXX XX', is_tbd: dto.fleet_id === 0 },
      driver_id: dto.driver_id,
      driver: dto.driver_id ? { id: dto.driver_id, name: 'Supir', sim_expired_at: null } : null,
      driver_name_manual: dto.driver_name_manual,
      sj_date: dto.sj_date,
      origin: dto.origin,
      destination: dto.destination,
      cargo_description: dto.cargo_description,
      operational_cost: dto.operational_cost,
      status: dto.publish && dto.fleet_id !== 0 ? StatusOperasional.ASSIGNED : StatusOperasional.DRAFT,
      invoice_id: null,
      invoice_attachment_status: StatusLampiran.NO_INVOICE,
      invoice: null,
      delivered_at: null,
      pod_photo_path: null,
      lampiran_paths: null,
      void_reason: null,
      internal_notes: dto.internal_notes,
      created_by: 1,
      created_at: now,
      updated_at: now,
    }
    store = [newSJ, ...store]
    return newSJ
  }

  async update(uuid: string, dto: UpdateSJDto): Promise<SuratJalan> {
    await simulateDelay()
    const idx = store.findIndex(sj => sj.uuid === uuid)
    if (idx === -1) throw new Error('SJ tidak ditemukan')
    const updated = { ...store[idx], ...dto, updated_at: new Date().toISOString() }
    store = store.map(sj => sj.uuid === uuid ? updated : sj)
    return updated
  }

  async assign(uuid: string, input: AssignSJInput): Promise<SuratJalan> {
    await simulateDelay()
    const idx = store.findIndex(sj => sj.uuid === uuid)
    if (idx === -1) throw new Error('SJ tidak ditemukan')
    const updated: SuratJalan = {
      ...store[idx],
      fleet_id: input.fleet_id,
      driver_id: input.driver_id,
      driver_name_manual: input.driver_name_manual,
      status: StatusOperasional.ASSIGNED,
      updated_at: new Date().toISOString(),
    }
    store = store.map(sj => sj.uuid === uuid ? updated : sj)
    return updated
  }

  async deliver(uuid: string, input: DeliverSJInput): Promise<SuratJalan> {
    await simulateDelay()
    const idx = store.findIndex(sj => sj.uuid === uuid)
    if (idx === -1) throw new Error('SJ tidak ditemukan')
    const updated: SuratJalan = {
      ...store[idx],
      status: StatusOperasional.DELIVERED,
      delivered_at: input.delivered_at,
      pod_photo_path: input.pod_photo_path,
      updated_at: new Date().toISOString(),
    }
    store = store.map(sj => sj.uuid === uuid ? updated : sj)
    return updated
  }

  async void(uuid: string, reason: string): Promise<SuratJalan> {
    await simulateDelay()
    const idx = store.findIndex(sj => sj.uuid === uuid)
    if (idx === -1) throw new Error('SJ tidak ditemukan')
    const updated: SuratJalan = {
      ...store[idx],
      status: StatusOperasional.VOID,
      void_reason: reason,
      invoice_id: null,
      invoice_attachment_status: StatusLampiran.NO_INVOICE,
      invoice: null,
      updated_at: new Date().toISOString(),
    }
    store = store.map(sj => sj.uuid === uuid ? updated : sj)
    return updated
  }

  async delete(uuid: string): Promise<void> {
    await simulateDelay()
    store = store.filter(sj => sj.uuid !== uuid)
  }

  async attachToInvoice(sjUuid: string, invoiceId: number, invoiceUuid: string, invoiceNumber: string): Promise<SuratJalan> {
    await simulateDelay()
    const idx = store.findIndex(sj => sj.uuid === sjUuid)
    if (idx === -1) throw new Error('SJ tidak ditemukan')
    const updated: SuratJalan = {
      ...store[idx],
      invoice_id: invoiceId,
      invoice_attachment_status: StatusLampiran.ATTACHED,
      invoice: { id: invoiceId, invoice_number: invoiceNumber },
      updated_at: new Date().toISOString(),
    }
    store = store.map(sj => sj.uuid === sjUuid ? updated : sj)
    return updated
  }
}

export const suratJalanRepository = new MockSuratJalanRepository()
