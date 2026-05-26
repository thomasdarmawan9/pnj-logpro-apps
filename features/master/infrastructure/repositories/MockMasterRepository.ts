import { apiDownload, apiRequest } from '@/lib/apiClient'
import { IMasterRepository } from './IMasterRepository'
import { Customer } from '../../domain/entities/Customer'
import { Fleet } from '../../domain/entities/Fleet'
import { Driver, computeSIMStatus } from '../../domain/entities/Driver'
import { Project } from '../../domain/entities/Project'

type ApiId = number | string | null | undefined

type ApiCustomer = Omit<Customer, 'id' | 'active_project_count' | 'total_invoice_outstanding'> & {
  id: ApiId
  active_project_count?: number | string
  total_invoice_outstanding?: number | string
}

type ApiFleet = Omit<Fleet, 'id' | 'capacity_ton' | 'total_trips' | 'active_days_this_month' | 'rentals_this_month'> & {
  id: ApiId
  capacity_ton: number | string | null
  total_trips?: number | string
  active_days_this_month?: number | string
  rentals_this_month?: number | string
}

type ApiDriver = Omit<Driver, 'id' | 'sim_status' | 'days_until_sim_expiry' | 'total_trips'> & {
  id: ApiId
  sim_status?: Driver['sim_status']
  days_until_sim_expiry?: number | string | null
  total_trips?: number | string
}

type ApiProject = Omit<
  Project,
  | 'id'
  | 'customer_id'
  | 'customer'
  | 'sj_count'
  | 'sj_delivered_count'
  | 'invoice_count'
  | 'invoice_outstanding_amount'
  | 'invoice_paid_amount'
  | 'total_operational_cost'
  | 'gross_profit'
> & {
  id: ApiId
  customer_id: ApiId
  customer: { id: ApiId; uuid?: string; name: string; is_pkp: boolean }
  sj_count?: number | string
  sj_delivered_count?: number | string
  invoice_count?: number | string
  invoice_outstanding_amount?: number | string
  invoice_paid_amount?: number | string
  total_operational_cost?: number | string
  gross_profit?: number | string
}

type ApiSJ = {
  project_id: ApiId
  fleet_id: ApiId
  driver_id: ApiId
  status: string
  operational_cost?: number | string | null
  delivered_at?: string | null
  sj_date?: string
}

type ApiInvoice = {
  project_id: ApiId
  customer_id: ApiId
  status: string
  total_amount?: number | string | null
  paid_amount?: number | string | null
}

function toNumber(value: ApiId) {
  return Number(value || 0)
}

function toNullableNumber(value: ApiId) {
  if (value === null || value === undefined || value === '') return null
  return Number(value)
}

async function listAll<T>(path: string): Promise<T[]> {
  const response = await apiRequest<T[]>(`${path}${path.includes('?') ? '&' : '?'}page=1&limit=100`, {
    method: 'GET',
  })
  return response.data
}

function normalizeCustomer(customer: ApiCustomer, extras?: Partial<Customer>): Customer {
  return {
    ...customer,
    id: toNumber(customer.id),
    is_pkp: Boolean(customer.is_pkp),
    active_project_count: Number(extras?.active_project_count ?? customer.active_project_count ?? 0),
    total_invoice_outstanding: Number(extras?.total_invoice_outstanding ?? customer.total_invoice_outstanding ?? 0),
  }
}

function normalizeFleet(fleet: ApiFleet, extras?: Partial<Fleet>): Fleet {
  return {
    ...fleet,
    id: toNumber(fleet.id),
    capacity_ton: toNullableNumber(fleet.capacity_ton),
    is_tbd: Boolean(fleet.is_tbd),
    lampiran_paths: fleet.lampiran_paths ?? null,
    rental_status: fleet.rental_status ?? null,
    rental_invoice_item_id: toNullableNumber(fleet.rental_invoice_item_id),
    rental_invoice_id: toNullableNumber(fleet.rental_invoice_id),
    rental_invoice_number: fleet.rental_invoice_number ?? null,
    rental_period_start: fleet.rental_period_start ?? null,
    rental_period_end: fleet.rental_period_end ?? null,
    rentals_this_month: Number(fleet.rentals_this_month ?? 0),
    total_trips: Number(extras?.total_trips ?? fleet.total_trips ?? 0),
    active_days_this_month: Number(extras?.active_days_this_month ?? fleet.active_days_this_month ?? 0),
    last_used_date: extras?.last_used_date ?? fleet.last_used_date ?? null,
  }
}

function normalizeDriver(driver: ApiDriver, extras?: Partial<Driver>): Driver {
  const sim = driver.sim_status
    ? {
        sim_status: driver.sim_status,
        days_until_sim_expiry: toNullableNumber(driver.days_until_sim_expiry),
      }
    : computeSIMStatus(driver.sim_expired_at)

  return {
    ...driver,
    id: toNumber(driver.id),
    ...sim,
    lampiran_paths: driver.lampiran_paths ?? null,
    total_trips: Number(extras?.total_trips ?? driver.total_trips ?? 0),
    last_trip_date: extras?.last_trip_date ?? driver.last_trip_date ?? null,
  }
}

function normalizeProject(project: ApiProject, extras?: Partial<Project>): Project {
  return {
    ...project,
    id: toNumber(project.id),
    customer_id: toNumber(project.customer_id ?? project.customer?.id),
    customer: {
      id: toNumber(project.customer?.id),
      uuid: project.customer?.uuid,
      name: project.customer?.name || '-',
      is_pkp: Boolean(project.customer?.is_pkp),
    },
    contract_number: project.contract_number || null,
    sj_count: Number(extras?.sj_count ?? project.sj_count ?? 0),
    sj_delivered_count: Number(extras?.sj_delivered_count ?? project.sj_delivered_count ?? 0),
    invoice_count: Number(extras?.invoice_count ?? project.invoice_count ?? 0),
    invoice_outstanding_amount: Number(extras?.invoice_outstanding_amount ?? project.invoice_outstanding_amount ?? 0),
    invoice_paid_amount: Number(extras?.invoice_paid_amount ?? project.invoice_paid_amount ?? 0),
    total_operational_cost: Number(extras?.total_operational_cost ?? project.total_operational_cost ?? 0),
    gross_profit: Number(extras?.gross_profit ?? project.gross_profit ?? 0),
  }
}

function customerStats(projects: ApiProject[], invoices: ApiInvoice[]) {
  const stats = new Map<number, Pick<Customer, 'active_project_count' | 'total_invoice_outstanding'>>()

  for (const project of projects) {
    const customerId = toNumber(project.customer_id ?? project.customer?.id)
    const current = stats.get(customerId) || { active_project_count: 0, total_invoice_outstanding: 0 }
    if (project.status === 'active') current.active_project_count += 1
    stats.set(customerId, current)
  }

  for (const invoice of invoices) {
    if (invoice.status === 'void' || invoice.status === 'paid') continue
    const customerId = toNumber(invoice.customer_id)
    const current = stats.get(customerId) || { active_project_count: 0, total_invoice_outstanding: 0 }
    const total = Number(invoice.total_amount || 0)
    const paid = Number(invoice.paid_amount || 0)
    current.total_invoice_outstanding += Math.max(0, total - paid)
    stats.set(customerId, current)
  }

  return stats
}

function projectStats(sjs: ApiSJ[], invoices: ApiInvoice[]) {
  const stats = new Map<number, Pick<Project, 'sj_count' | 'sj_delivered_count' | 'invoice_count' | 'invoice_outstanding_amount' | 'invoice_paid_amount' | 'total_operational_cost' | 'gross_profit'>>()
  const get = (projectId: number) => {
    const current = stats.get(projectId) || {
      sj_count: 0,
      sj_delivered_count: 0,
      invoice_count: 0,
      invoice_outstanding_amount: 0,
      invoice_paid_amount: 0,
      total_operational_cost: 0,
      gross_profit: 0,
    }
    stats.set(projectId, current)
    return current
  }

  for (const sj of sjs) {
    const projectId = toNumber(sj.project_id)
    const current = get(projectId)
    current.sj_count += 1
    if (sj.status === 'delivered') current.sj_delivered_count += 1
    current.total_operational_cost += Number(sj.operational_cost || 0)
  }

  for (const invoice of invoices) {
    if (invoice.status === 'void') continue
    const projectId = toNumber(invoice.project_id)
    const current = get(projectId)
    const total = Number(invoice.total_amount || 0)
    const paid = Number(invoice.paid_amount || 0)
    current.invoice_count += 1
    current.invoice_paid_amount += paid
    current.invoice_outstanding_amount += Math.max(0, total - paid)
    current.gross_profit = current.invoice_paid_amount - current.total_operational_cost
  }

  return stats
}

function fleetStats(sjs: ApiSJ[]) {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const stats = new Map<number, Partial<Fleet>>()
  for (const sj of sjs) {
    const fleetId = toNumber(sj.fleet_id)
    const current = stats.get(fleetId) || { total_trips: 0, active_days_this_month: 0, last_used_date: null }
    current.total_trips = Number(current.total_trips || 0) + 1
    const dateText = sj.delivered_at || sj.sj_date || null
    if (dateText) {
      const date = new Date(dateText)
      const prev = current.last_used_date ? new Date(current.last_used_date) : null
      if (!prev || date > prev) current.last_used_date = dateText.slice(0, 10)
      if (date >= startOfMonth) current.active_days_this_month = Number(current.active_days_this_month || 0) + 1
    }
    stats.set(fleetId, current)
  }
  return stats
}

function driverStats(sjs: ApiSJ[]) {
  const stats = new Map<number, Partial<Driver>>()
  for (const sj of sjs) {
    const driverId = toNumber(sj.driver_id)
    if (!driverId) continue
    const current = stats.get(driverId) || { total_trips: 0, last_trip_date: null }
    current.total_trips = Number(current.total_trips || 0) + 1
    const dateText = sj.delivered_at || sj.sj_date || null
    if (dateText) {
      const date = new Date(dateText)
      const prev = current.last_trip_date ? new Date(current.last_trip_date) : null
      if (!prev || date > prev) current.last_trip_date = dateText.slice(0, 10)
    }
    stats.set(driverId, current)
  }
  return stats
}

class MockMasterRepository implements IMasterRepository {
  async getCustomers(): Promise<Customer[]> {
    const [customers, projects, invoices] = await Promise.all([
      listAll<ApiCustomer>('/customers?'),
      listAll<ApiProject>('/projects?'),
      listAll<ApiInvoice>('/invoices?status=all&period=all'),
    ])
    const stats = customerStats(projects, invoices)
    return customers.map(customer => normalizeCustomer(customer, stats.get(toNumber(customer.id))))
  }

  async createCustomer(data: Omit<Customer, 'id' | 'uuid' | 'created_at' | 'updated_at' | 'deleted_at' | 'active_project_count' | 'total_invoice_outstanding'>): Promise<Customer> {
    const response = await apiRequest<ApiCustomer>('/customers', { method: 'POST', body: data })
    return normalizeCustomer(response.data)
  }

  async updateCustomer(uuid: string, data: Partial<Customer>): Promise<Customer> {
    const response = await apiRequest<ApiCustomer>(`/customers/${uuid}`, { method: 'PUT', body: data })
    return normalizeCustomer(response.data)
  }

  async deleteCustomer(uuid: string): Promise<void> {
    await apiRequest<null>(`/customers/${uuid}`, { method: 'DELETE' })
  }

  async getFleets(): Promise<Fleet[]> {
    const [fleets, sjs] = await Promise.all([
      listAll<ApiFleet>('/fleets?include_tbd=true'),
      listAll<ApiSJ>('/surat-jalan?status=all&invoice_status=all&period=all'),
    ])
    const stats = fleetStats(sjs)
    return fleets.map(fleet => normalizeFleet(fleet, stats.get(toNumber(fleet.id))))
  }

  async createFleet(data: Omit<Fleet, 'id' | 'uuid' | 'created_at' | 'total_trips' | 'active_days_this_month' | 'last_used_date' | 'rental_status' | 'rental_invoice_item_id' | 'rental_invoice_id' | 'rental_invoice_number' | 'rental_period_start' | 'rental_period_end' | 'rentals_this_month'>): Promise<Fleet> {
    const response = await apiRequest<ApiFleet>('/fleets', { method: 'POST', body: data })
    return normalizeFleet(response.data)
  }

  async updateFleet(uuid: string, data: Partial<Fleet>): Promise<Fleet> {
    const response = await apiRequest<ApiFleet>(`/fleets/${uuid}`, { method: 'PUT', body: data })
    return normalizeFleet(response.data)
  }

  async toggleFleetStatus(uuid: string): Promise<Fleet> {
    const response = await apiRequest<ApiFleet>(`/fleets/${uuid}/toggle-status`, { method: 'PATCH' })
    return normalizeFleet(response.data)
  }

  async completeFleetRental(uuid: string): Promise<Fleet> {
    const response = await apiRequest<ApiFleet>(`/fleets/${uuid}/complete-rental`, { method: 'POST' })
    return normalizeFleet(response.data)
  }

  async uploadFleetLampiran(uuid: string, file: File): Promise<Fleet> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiRequest<ApiFleet>(`/fleets/${uuid}/lampiran`, {
      method: 'POST',
      body: formData,
    })
    return normalizeFleet(response.data)
  }

  async deleteFleetLampiran(uuid: string, filePath: string): Promise<Fleet> {
    const filename = filePath.split('/').pop()!
    const response = await apiRequest<ApiFleet>(`/fleets/${uuid}/lampiran/${filename}`, {
      method: 'DELETE',
    })
    return normalizeFleet(response.data)
  }

  async getDrivers(): Promise<Driver[]> {
    const [drivers, sjs] = await Promise.all([
      listAll<ApiDriver>('/drivers?'),
      listAll<ApiSJ>('/surat-jalan?status=all&invoice_status=all&period=all'),
    ])
    const stats = driverStats(sjs)
    return drivers.map(driver => normalizeDriver(driver, stats.get(toNumber(driver.id))))
  }

  async createDriver(data: Omit<Driver, 'id' | 'uuid' | 'created_at' | 'sim_status' | 'days_until_sim_expiry' | 'total_trips' | 'last_trip_date'>): Promise<Driver> {
    const response = await apiRequest<ApiDriver>('/drivers', { method: 'POST', body: data })
    return normalizeDriver(response.data)
  }

  async updateDriver(uuid: string, data: Partial<Driver>): Promise<Driver> {
    const response = await apiRequest<ApiDriver>(`/drivers/${uuid}`, { method: 'PUT', body: data })
    return normalizeDriver(response.data)
  }

  async toggleDriverStatus(uuid: string): Promise<Driver> {
    const response = await apiRequest<ApiDriver>(`/drivers/${uuid}/toggle-status`, { method: 'PATCH' })
    return normalizeDriver(response.data)
  }

  async uploadDriverLampiran(uuid: string, file: File): Promise<Driver> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiRequest<ApiDriver>(`/drivers/${uuid}/lampiran`, {
      method: 'POST',
      body: formData,
    })
    return normalizeDriver(response.data)
  }

  async deleteDriverLampiran(uuid: string, filePath: string): Promise<Driver> {
    const filename = filePath.split('/').pop()!
    const response = await apiRequest<ApiDriver>(`/drivers/${uuid}/lampiran/${filename}`, {
      method: 'DELETE',
    })
    return normalizeDriver(response.data)
  }

  async getProjects(): Promise<Project[]> {
    const [projects, sjs, invoices] = await Promise.all([
      listAll<ApiProject>('/projects?'),
      listAll<ApiSJ>('/surat-jalan?status=all&invoice_status=all&period=all'),
      listAll<ApiInvoice>('/invoices?status=all&period=all'),
    ])
    const stats = projectStats(sjs, invoices)
    return projects.map(project => normalizeProject(project, stats.get(toNumber(project.id))))
  }

  async getProjectDetail(uuid: string): Promise<Project> {
    const [projectResponse, sjs, invoices] = await Promise.all([
      apiRequest<ApiProject>(`/projects/${uuid}`, { method: 'GET' }),
      listAll<ApiSJ>('/surat-jalan?status=all&invoice_status=all&period=all'),
      listAll<ApiInvoice>('/invoices?status=all&period=all'),
    ])
    const stats = projectStats(sjs, invoices)
    return normalizeProject(projectResponse.data, stats.get(toNumber(projectResponse.data.id)))
  }

  async createProject(data: Omit<Project, 'id' | 'uuid' | 'code' | 'created_at' | 'sj_count' | 'sj_delivered_count' | 'invoice_count' | 'invoice_outstanding_amount' | 'invoice_paid_amount' | 'total_operational_cost' | 'gross_profit'>): Promise<Project> {
    const customers = await listAll<ApiCustomer>('/customers?')
    const customer = customers.find(item => toNumber(item.id) === data.customer_id)
    if (!customer) throw new Error('Customer tidak ditemukan')

    const response = await apiRequest<ApiProject>('/projects', {
      method: 'POST',
      body: {
        customer_uuid: customer.uuid,
        name: data.name,
        contract_number: data.contract_number || '-',
        description: data.description,
        start_date: data.start_date,
        end_date: data.end_date,
        status: data.status,
      },
    })
    return normalizeProject(response.data)
  }

  async updateProject(uuid: string, data: Partial<Project>): Promise<Project> {
    const body: Record<string, unknown> = { ...data }
    delete body.id
    delete body.uuid
    delete body.code
    delete body.customer
    delete body.customer_id
    delete body.sj_count
    delete body.sj_delivered_count
    delete body.invoice_count
    delete body.invoice_outstanding_amount
    delete body.invoice_paid_amount
    delete body.total_operational_cost
    delete body.gross_profit
    delete body.created_at

    if ('contract_number' in body) body.contract_number = body.contract_number || '-'
    if (data.customer_id) {
      const customers = await listAll<ApiCustomer>('/customers?')
      const customer = customers.find(item => toNumber(item.id) === data.customer_id)
      if (!customer) throw new Error('Customer tidak ditemukan')
      body.customer_uuid = customer.uuid
    }

    const response = await apiRequest<ApiProject>(`/projects/${uuid}`, { method: 'PUT', body })
    return normalizeProject(response.data)
  }
}

export const masterRepository = new MockMasterRepository()

export async function uploadFleetLampiran(uuid: string, file: File): Promise<Fleet> {
  return masterRepository.uploadFleetLampiran(uuid, file)
}

export async function deleteFleetLampiran(uuid: string, filePath: string): Promise<Fleet> {
  return masterRepository.deleteFleetLampiran(uuid, filePath)
}

export async function downloadFleetLampiran(uuid: string, filePath: string): Promise<Blob> {
  const filename = filePath.split('/').pop()!
  return apiDownload(`/fleets/${uuid}/lampiran/${filename}`)
}

export async function uploadDriverLampiran(uuid: string, file: File): Promise<Driver> {
  return masterRepository.uploadDriverLampiran(uuid, file)
}

export async function deleteDriverLampiran(uuid: string, filePath: string): Promise<Driver> {
  return masterRepository.deleteDriverLampiran(uuid, filePath)
}

export async function downloadDriverLampiran(uuid: string, filePath: string): Promise<Blob> {
  const filename = filePath.split('/').pop()!
  return apiDownload(`/drivers/${uuid}/lampiran/${filename}`)
}
