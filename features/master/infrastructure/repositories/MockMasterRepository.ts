import { IMasterRepository } from './IMasterRepository'
import { Customer, MOCK_CUSTOMERS } from '../../domain/entities/Customer'
import { Fleet, MOCK_FLEETS } from '../../domain/entities/Fleet'
import { Driver, MOCK_DRIVERS, computeSIMStatus } from '../../domain/entities/Driver'
import { Project, MOCK_PROJECTS } from '../../domain/entities/Project'

class MockMasterRepository implements IMasterRepository {
  private customers: Customer[] = [...MOCK_CUSTOMERS]
  private fleets: Fleet[] = [...MOCK_FLEETS]
  private drivers: Driver[] = [...MOCK_DRIVERS]
  private projects: Project[] = [...MOCK_PROJECTS]
  private customerSeq = MOCK_CUSTOMERS.length
  private fleetSeq = MOCK_FLEETS.length
  private driverSeq = MOCK_DRIVERS.length
  private projectSeq = MOCK_PROJECTS.length

  private delay(ms = 500): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
  }

  async getCustomers(): Promise<Customer[]> {
    await this.delay()
    return [...this.customers]
  }

  async createCustomer(data: Omit<Customer, 'id' | 'uuid' | 'created_at' | 'updated_at' | 'deleted_at' | 'active_project_count' | 'total_invoice_outstanding'>): Promise<Customer> {
    await this.delay()
    const newCustomer: Customer = {
      ...data, id: ++this.customerSeq,
      uuid: `cust-${String(this.customerSeq).padStart(3, '0')}`,
      active_project_count: 0, total_invoice_outstanding: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    }
    this.customers.push(newCustomer)
    return newCustomer
  }

  async updateCustomer(uuid: string, data: Partial<Customer>): Promise<Customer> {
    await this.delay()
    const idx = this.customers.findIndex(c => c.uuid === uuid)
    if (idx === -1) throw new Error('Customer tidak ditemukan')
    this.customers[idx] = { ...this.customers[idx], ...data, updated_at: new Date().toISOString() }
    return this.customers[idx]
  }

  async deleteCustomer(uuid: string): Promise<void> {
    await this.delay()
    const idx = this.customers.findIndex(c => c.uuid === uuid)
    if (idx === -1) throw new Error('Customer tidak ditemukan')
    const customer = this.customers[idx]
    if (customer.active_project_count > 0) {
      throw new Error(`${customer.name} tidak bisa dihapus: masih ada ${customer.active_project_count} proyek aktif.`)
    }
    this.customers.splice(idx, 1)
  }

  async getFleets(): Promise<Fleet[]> {
    await this.delay()
    return [...this.fleets]
  }

  async createFleet(data: Omit<Fleet, 'id' | 'uuid' | 'created_at' | 'total_trips' | 'active_days_this_month' | 'last_used_date'>): Promise<Fleet> {
    await this.delay()
    const newFleet: Fleet = {
      ...data, id: ++this.fleetSeq,
      uuid: `fleet-${String(this.fleetSeq).padStart(3, '0')}`,
      total_trips: 0, active_days_this_month: 0, last_used_date: null,
      created_at: new Date().toISOString(),
    }
    this.fleets.push(newFleet)
    return newFleet
  }

  async updateFleet(uuid: string, data: Partial<Fleet>): Promise<Fleet> {
    await this.delay()
    const idx = this.fleets.findIndex(f => f.uuid === uuid)
    if (idx === -1) throw new Error('Armada tidak ditemukan')
    if (this.fleets[idx].is_tbd) throw new Error('TBD Fleet tidak bisa diubah')
    this.fleets[idx] = { ...this.fleets[idx], ...data }
    return this.fleets[idx]
  }

  async toggleFleetStatus(uuid: string): Promise<Fleet> {
    await this.delay()
    const idx = this.fleets.findIndex(f => f.uuid === uuid)
    if (idx === -1) throw new Error('Armada tidak ditemukan')
    if (this.fleets[idx].is_tbd) throw new Error('TBD Fleet tidak bisa diubah')
    const currentStatus = this.fleets[idx].status
    this.fleets[idx] = { ...this.fleets[idx], status: currentStatus === 'active' ? 'inactive' : 'active' }
    return this.fleets[idx]
  }

  async getDrivers(): Promise<Driver[]> {
    await this.delay()
    return [...this.drivers]
  }

  async createDriver(data: Omit<Driver, 'id' | 'uuid' | 'created_at' | 'sim_status' | 'days_until_sim_expiry' | 'total_trips' | 'last_trip_date'>): Promise<Driver> {
    await this.delay()
    const simComputed = computeSIMStatus(data.sim_expired_at)
    const newDriver: Driver = {
      ...data, ...simComputed,
      id: ++this.driverSeq,
      uuid: `drv-${String(this.driverSeq).padStart(3, '0')}`,
      total_trips: 0, last_trip_date: null,
      created_at: new Date().toISOString(),
    }
    this.drivers.push(newDriver)
    return newDriver
  }

  async updateDriver(uuid: string, data: Partial<Driver>): Promise<Driver> {
    await this.delay()
    const idx = this.drivers.findIndex(d => d.uuid === uuid)
    if (idx === -1) throw new Error('Supir tidak ditemukan')
    const simComputed = computeSIMStatus(data.sim_expired_at ?? this.drivers[idx].sim_expired_at)
    this.drivers[idx] = { ...this.drivers[idx], ...data, ...simComputed }
    return this.drivers[idx]
  }

  async toggleDriverStatus(uuid: string): Promise<Driver> {
    await this.delay()
    const idx = this.drivers.findIndex(d => d.uuid === uuid)
    if (idx === -1) throw new Error('Supir tidak ditemukan')
    const current = this.drivers[idx].status
    this.drivers[idx] = { ...this.drivers[idx], status: current === 'active' ? 'inactive' : 'active' }
    return this.drivers[idx]
  }

  async getProjects(): Promise<Project[]> {
    await this.delay()
    return [...this.projects]
  }

  async getProjectDetail(uuid: string): Promise<Project> {
    await this.delay()
    const project = this.projects.find(p => p.uuid === uuid)
    if (!project) throw new Error('Proyek tidak ditemukan')
    return { ...project }
  }

  async createProject(data: Omit<Project, 'id' | 'uuid' | 'code' | 'created_at' | 'sj_count' | 'sj_delivered_count' | 'invoice_count' | 'invoice_outstanding_amount' | 'invoice_paid_amount' | 'total_operational_cost' | 'gross_profit'>): Promise<Project> {
    await this.delay()
    const year = new Date().getFullYear()
    const code = `PRJ-${year}-${String(++this.projectSeq).padStart(3, '0')}`
    const newProject: Project = {
      ...data, id: this.projectSeq, uuid: `proj-${String(this.projectSeq).padStart(3, '0')}`,
      code, sj_count: 0, sj_delivered_count: 0,
      invoice_count: 0, invoice_outstanding_amount: 0,
      invoice_paid_amount: 0, total_operational_cost: 0, gross_profit: 0,
      created_at: new Date().toISOString(),
    }
    this.projects.push(newProject)
    return newProject
  }

  async updateProject(uuid: string, data: Partial<Project>): Promise<Project> {
    await this.delay()
    const idx = this.projects.findIndex(p => p.uuid === uuid)
    if (idx === -1) throw new Error('Proyek tidak ditemukan')
    this.projects[idx] = { ...this.projects[idx], ...data }
    return this.projects[idx]
  }
}

export const masterRepository = new MockMasterRepository()
