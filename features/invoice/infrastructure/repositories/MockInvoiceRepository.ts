import { Invoice, InvoiceStatus, InvoiceFilterState, PaginationState, AttachedSJ, Payment, AvailableInvoice } from '../../domain/entities/Invoice'
import { IInvoiceRepository, PaginatedResult } from './IInvoiceRepository'
import { CreateInvoiceDto } from '../../application/dto/CreateInvoiceDto'
import { UpdateInvoiceDto } from '../../application/dto/UpdateInvoiceDto'
import { RecordPaymentDto } from '../../application/dto/RecordPaymentDto'
import { MOCK_INVOICES, MOCK_ATTACHABLE_SJ, MOCK_PROJECTS } from '../../../../lib/mockData/invoice'

let store: Invoice[] = [...MOCK_INVOICES]
let nextId = store.length + 1
let nextInvoiceNum = 2832
let nextPaymentId = 10

function simulateDelay(ms = 400): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function applyFilters(list: Invoice[], filters: InvoiceFilterState): Invoice[] {
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

export class MockInvoiceRepository implements IInvoiceRepository {
  async getList(filters: InvoiceFilterState, pagination: PaginationState): Promise<PaginatedResult<Invoice>> {
    await simulateDelay()
    const filtered = applyFilters(store, filters)
    const sorted = [...filtered].sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    const start = (pagination.page - 1) * pagination.perPage
    const data = sorted.slice(start, start + pagination.perPage)
    return { data, total: filtered.length, page: pagination.page, perPage: pagination.perPage }
  }

  async getByUuid(uuid: string): Promise<Invoice | null> {
    await simulateDelay(200)
    return store.find(inv => inv.uuid === uuid) ?? null
  }

  async create(dto: CreateInvoiceDto): Promise<Invoice> {
    await simulateDelay()
    const project = MOCK_PROJECTS.find(p => p.id === dto.project_id) ?? MOCK_PROJECTS[0]
    const now = new Date().toISOString()
    const items = dto.items.map((item, idx) => ({
      id: nextId * 100 + idx,
      uuid: `item-${Date.now()}-${idx}`,
      invoice_id: nextId,
      fleet_id: item.fleet_id ?? null,
      fleet: null,
      fleet_label: item.fleet_label,
      description: item.description ?? 'Tagihan Biaya Jasa Sewa Kendaraan',
      period_start: item.period_start ?? null,
      period_end: item.period_end ?? null,
      qty: item.qty,
      unit: item.unit,
      unit_price: item.unit_price,
      subtotal: item.qty * item.unit_price,
      sort_order: item.sort_order,
    }))
    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0)
    const taxAmount = Math.round(subtotal * dto.tax_percent / 100)
    const inv: Invoice = {
      id: nextId,
      uuid: `inv-${Date.now()}`,
      invoice_number: String(nextInvoiceNum++),
      project_id: dto.project_id,
      project: { id: project.id, name: project.name, code: project.code, contract_number: project.contract_number },
      customer_id: project.customer.id,
      customer: project.customer,
      invoice_date: dto.invoice_date,
      due_date: dto.due_date,
      items,
      subtotal_amount: subtotal,
      tax_percent: dto.tax_percent,
      tax_amount: taxAmount,
      total_amount: subtotal + taxAmount,
      paid_amount: 0,
      remaining_amount: subtotal + taxAmount,
      status: dto.send_immediately ? InvoiceStatus.OUTSTANDING : InvoiceStatus.DRAFT,
      notes: dto.notes ?? null,
      sent_at: dto.send_immediately ? now : null,
      void_reason: null,
      attached_sj: [],
      payments: [],
      created_by: 1,
      created_at: now,
      updated_at: now,
    }
    nextId++
    store = [inv, ...store]
    return inv
  }

  async update(uuid: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    await simulateDelay()
    const idx = store.findIndex(inv => inv.uuid === uuid)
    if (idx === -1) throw new Error('Invoice tidak ditemukan')
    const existing = store[idx]
    const updated: Invoice = { ...existing, updated_at: new Date().toISOString() }
    if (dto.due_date !== undefined) updated.due_date = dto.due_date
    if (dto.invoice_date !== undefined) updated.invoice_date = dto.invoice_date
    if (dto.notes !== undefined) updated.notes = dto.notes
    if (dto.tax_percent !== undefined) {
      updated.tax_percent = dto.tax_percent
      updated.tax_amount = Math.round(updated.subtotal_amount * dto.tax_percent / 100)
      updated.total_amount = updated.subtotal_amount + updated.tax_amount
      updated.remaining_amount = updated.total_amount - updated.paid_amount
    }
    if (dto.items !== undefined) {
      const newItems = dto.items.map((item, idx2) => ({
        id: (existing.id ?? 0) * 100 + idx2,
        uuid: `item-${Date.now()}-${idx2}`,
        invoice_id: existing.id,
        fleet_id: item.fleet_id ?? null,
        fleet: null,
        fleet_label: item.fleet_label,
        description: item.description ?? 'Tagihan Biaya Jasa Sewa Kendaraan',
        period_start: item.period_start ?? null,
        period_end: item.period_end ?? null,
        qty: item.qty,
        unit: item.unit,
        unit_price: item.unit_price,
        subtotal: item.qty * item.unit_price,
        sort_order: item.sort_order,
      }))
      const subtotal = newItems.reduce((sum, i) => sum + i.subtotal, 0)
      const taxAmt = Math.round(subtotal * updated.tax_percent / 100)
      updated.items = newItems
      updated.subtotal_amount = subtotal
      updated.tax_amount = taxAmt
      updated.total_amount = subtotal + taxAmt
      updated.remaining_amount = updated.total_amount - updated.paid_amount
    }
    store = store.map(inv => inv.uuid === uuid ? updated : inv)
    return updated
  }

  async send(uuid: string): Promise<Invoice> {
    await simulateDelay()
    const idx = store.findIndex(inv => inv.uuid === uuid)
    if (idx === -1) throw new Error('Invoice tidak ditemukan')
    const updated: Invoice = {
      ...store[idx],
      status: InvoiceStatus.OUTSTANDING,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    store = store.map(inv => inv.uuid === uuid ? updated : inv)
    return updated
  }

  async recordPayment(uuid: string, dto: RecordPaymentDto): Promise<Invoice> {
    await simulateDelay()
    const idx = store.findIndex(inv => inv.uuid === uuid)
    if (idx === -1) throw new Error('Invoice tidak ditemukan')
    const existing = store[idx]
    const payment: Payment = {
      id: nextPaymentId++,
      uuid: `pay-${Date.now()}`,
      invoice_id: existing.id,
      payment_date: dto.payment_date,
      amount: dto.amount,
      method: dto.method,
      proof_path: dto.proof_path ?? null,
      notes: dto.notes ?? null,
      created_by_name: 'Admin Finance PNJ',
      created_at: new Date().toISOString(),
    }
    const newPaidAmount = existing.paid_amount + dto.amount
    const updated: Invoice = {
      ...existing,
      payments: [...existing.payments, payment],
      paid_amount: newPaidAmount,
      remaining_amount: Math.max(0, existing.total_amount - newPaidAmount),
      status: newPaidAmount >= existing.total_amount ? InvoiceStatus.PAID : existing.status,
      updated_at: new Date().toISOString(),
    }
    store = store.map(inv => inv.uuid === uuid ? updated : inv)
    return updated
  }

  async void(uuid: string, reason: string): Promise<Invoice> {
    await simulateDelay()
    const idx = store.findIndex(inv => inv.uuid === uuid)
    if (idx === -1) throw new Error('Invoice tidak ditemukan')
    const updated: Invoice = {
      ...store[idx],
      status: InvoiceStatus.VOID,
      void_reason: reason,
      attached_sj: [],
      updated_at: new Date().toISOString(),
    }
    store = store.map(inv => inv.uuid === uuid ? updated : inv)
    return updated
  }

  async attachSJ(invoiceUuid: string, sjUuids: string[]): Promise<Invoice> {
    await simulateDelay()
    const idx = store.findIndex(inv => inv.uuid === invoiceUuid)
    if (idx === -1) throw new Error('Invoice tidak ditemukan')
    const existing = store[idx]
    const toAttach = MOCK_ATTACHABLE_SJ.filter(sj => sjUuids.includes(sj.uuid) && !existing.attached_sj.some(a => a.uuid === sj.uuid))
    const updated: Invoice = {
      ...existing,
      attached_sj: [...existing.attached_sj, ...toAttach],
      updated_at: new Date().toISOString(),
    }
    store = store.map(inv => inv.uuid === invoiceUuid ? updated : inv)
    return updated
  }

  async detachSJ(invoiceUuid: string, sjUuid: string): Promise<Invoice> {
    await simulateDelay()
    const idx = store.findIndex(inv => inv.uuid === invoiceUuid)
    if (idx === -1) throw new Error('Invoice tidak ditemukan')
    const existing = store[idx]
    const updated: Invoice = {
      ...existing,
      attached_sj: existing.attached_sj.filter(sj => sj.uuid !== sjUuid),
      updated_at: new Date().toISOString(),
    }
    store = store.map(inv => inv.uuid === invoiceUuid ? updated : inv)
    return updated
  }

  async getAttachableSJ(_projectCode: string): Promise<AttachedSJ[]> {
    await simulateDelay(200)
    return MOCK_ATTACHABLE_SJ
  }

  async getAvailableForAttachment(projectId: number, sjUuid: string): Promise<AvailableInvoice[]> {
    await simulateDelay(200)
    const canAttach: InvoiceStatus[] = [InvoiceStatus.DRAFT, InvoiceStatus.SENT, InvoiceStatus.OUTSTANDING]
    return store
      .filter(inv =>
        inv.project_id === projectId &&
        canAttach.includes(inv.status) &&
        !inv.attached_sj.some(s => s.uuid === sjUuid)
      )
      .map(inv => ({
        id: inv.id!,
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
    await simulateDelay()
    const idx = store.findIndex(inv => inv.uuid === invoiceUuid)
    if (idx === -1) throw new Error('Invoice tidak ditemukan')
    const existing = store[idx]
    if (existing.attached_sj.some(s => s.uuid === sjEntry.uuid)) return existing
    const updated: Invoice = {
      ...existing,
      attached_sj: [...existing.attached_sj, sjEntry],
      updated_at: new Date().toISOString(),
    }
    store = store.map(inv => inv.uuid === invoiceUuid ? updated : inv)
    return updated
  }
}

export const invoiceRepository = new MockInvoiceRepository()
