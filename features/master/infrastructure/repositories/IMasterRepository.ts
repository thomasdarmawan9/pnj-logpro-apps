import { Customer } from '../../domain/entities/Customer'
import { Fleet } from '../../domain/entities/Fleet'
import { Driver } from '../../domain/entities/Driver'
import { Project } from '../../domain/entities/Project'

export interface IMasterRepository {
  // Customer
  getCustomers(): Promise<Customer[]>
  createCustomer(data: Omit<Customer, 'id' | 'uuid' | 'created_at' | 'updated_at' | 'deleted_at' | 'active_project_count' | 'total_invoice_outstanding'>): Promise<Customer>
  updateCustomer(uuid: string, data: Partial<Customer>): Promise<Customer>
  deleteCustomer(uuid: string): Promise<void>

  // Fleet
  getFleets(): Promise<Fleet[]>
  createFleet(data: Omit<Fleet, 'id' | 'uuid' | 'created_at' | 'total_trips' | 'active_days_this_month' | 'last_used_date'>): Promise<Fleet>
  updateFleet(uuid: string, data: Partial<Fleet>): Promise<Fleet>
  toggleFleetStatus(uuid: string): Promise<Fleet>

  // Driver
  getDrivers(): Promise<Driver[]>
  createDriver(data: Omit<Driver, 'id' | 'uuid' | 'created_at' | 'sim_status' | 'days_until_sim_expiry' | 'total_trips' | 'last_trip_date'>): Promise<Driver>
  updateDriver(uuid: string, data: Partial<Driver>): Promise<Driver>
  toggleDriverStatus(uuid: string): Promise<Driver>

  // Project
  getProjects(): Promise<Project[]>
  getProjectDetail(uuid: string): Promise<Project>
  createProject(data: Omit<Project, 'id' | 'uuid' | 'code' | 'created_at' | 'sj_count' | 'sj_delivered_count' | 'invoice_count' | 'invoice_outstanding_amount' | 'invoice_paid_amount' | 'total_operational_cost' | 'gross_profit'>): Promise<Project>
  updateProject(uuid: string, data: Partial<Project>): Promise<Project>
}
