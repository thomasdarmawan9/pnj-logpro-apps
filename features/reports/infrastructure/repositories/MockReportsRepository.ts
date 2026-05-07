import { apiDownload, apiRequest } from '@/lib/apiClient'
import { IReportsRepository } from './IReportsRepository'
import { AgingARCustomer, AgingARSummary } from '../../domain/entities/AgingARReport'
import { AgingARProjectDetail, ProjectDetailInvoice } from '../../domain/entities/AgingARProjectDetail'
import { AgingARCustomerDetail } from '../../domain/entities/AgingARCustomerDetail'
import { ProfitLossProject, ProfitLossSummary } from '../../domain/entities/ProfitLossReport'
import { AuditLog } from '../../domain/entities/AuditLog'
import { FleetUtilization, FleetUtilizationSummary } from '../../domain/entities/FleetUtilizationReport'
import { AgingARFilterDto } from '../../application/dto/AgingARFilterDto'
import { ProfitLossFilterDto } from '../../application/dto/ProfitLossFilterDto'
import { AuditTrailFilterDto } from '../../application/dto/AuditTrailFilterDto'

type ApiId = number | string | null | undefined

type ApiAgingCustomer = Omit<AgingARCustomer, 'customer_id' | 'total_outstanding' | 'oldest_invoice_days' | 'invoice_count'> & {
  customer_id: ApiId
  total_outstanding: number | string
  oldest_invoice_days: number | string
  invoice_count: number | string
}

type ApiAgingSummary = Omit<AgingARSummary, 'total_outstanding' | 'customer_count' | 'invoice_count' | 'customers'> & {
  total_outstanding: number | string
  customer_count: number | string
  invoice_count: number | string
  customers: ApiAgingCustomer[]
}

type ApiProjectDetailInvoice = Omit<ProjectDetailInvoice, 'total_amount' | 'paid_amount' | 'remaining_amount' | 'subtotal_amount' | 'tax_percent' | 'tax_amount' | 'days_overdue'> & {
  subtotal_amount: number | string
  tax_percent: number | string
  tax_amount: number | string
  total_amount: number | string
  paid_amount: number | string
  down_payment_amount?: number | string | null
  remaining_amount: number | string
  days_overdue: number | string
}

type ApiAgingProjectDetail = Omit<
  AgingARProjectDetail,
  | 'project_id'
  | 'customer_id'
  | 'total_invoiced'
  | 'total_paid'
  | 'total_outstanding'
  | 'total_operational_cost'
  | 'invoice_count'
  | 'sj_count'
  | 'sj_delivered_count'
  | 'invoices'
> & {
  project_id: ApiId
  customer_id: ApiId
  total_invoiced: number | string
  total_paid: number | string
  total_outstanding: number | string
  total_operational_cost: number | string
  invoice_count: number | string
  sj_count: number | string
  sj_delivered_count: number | string
  invoices: ApiProjectDetailInvoice[]
}

type ApiAgingCustomerDetail = Omit<
  AgingARCustomerDetail,
  | 'customer_id'
  | 'project_count'
  | 'invoice_count'
  | 'sj_count'
  | 'total_invoiced'
  | 'total_paid'
  | 'total_outstanding'
  | 'projects'
> & {
  customer_id: ApiId
  project_count: number | string
  invoice_count: number | string
  sj_count: number | string
  total_invoiced: number | string
  total_paid: number | string
  total_outstanding: number | string
  projects: ApiAgingProjectDetail[]
}

type ApiProfitLossProject = Omit<
  ProfitLossProject,
  | 'project_id'
  | 'revenue_invoiced'
  | 'revenue_paid'
  | 'invoice_count'
  | 'invoice_paid_count'
  | 'invoice_outstanding_count'
  | 'total_operational_cost'
  | 'sj_count'
  | 'sj_delivered_count'
  | 'gross_profit'
  | 'margin_percent'
> & {
  project_id: ApiId
  revenue_invoiced: number | string
  revenue_paid: number | string
  invoice_count: number | string
  invoice_paid_count: number | string
  invoice_outstanding_count: number | string
  total_operational_cost: number | string
  sj_count: number | string
  sj_delivered_count: number | string
  gross_profit: number | string
  margin_percent: number | string | null
}

type ApiProfitLossSummary = Omit<
  ProfitLossSummary,
  | 'total_revenue_paid'
  | 'total_operational_cost'
  | 'total_gross_profit'
  | 'average_margin'
  | 'project_count'
  | 'profitable_count'
  | 'loss_count'
  | 'projects'
> & {
  total_revenue_paid: number | string
  total_operational_cost: number | string
  total_gross_profit: number | string
  average_margin: number | string | null
  project_count: number | string
  profitable_count: number | string
  loss_count: number | string
  projects: ApiProfitLossProject[]
}

type ApiFleetUtilization = Omit<
  FleetUtilization,
  | 'fleet_id'
  | 'year'
  | 'total_trips'
  | 'delivered_trips'
  | 'assigned_trips'
  | 'draft_trips'
  | 'void_trips'
  | 'active_days'
  | 'total_days_in_period'
  | 'utilization_percent'
  | 'total_operational_cost'
  | 'avg_cost_per_trip'
  | 'unique_projects'
  | 'unique_customers'
> & {
  fleet_id: ApiId
  year: number | string | null
  total_trips: number | string
  delivered_trips: number | string
  assigned_trips: number | string
  draft_trips: number | string
  void_trips: number | string
  active_days: number | string
  total_days_in_period: number | string
  utilization_percent: number | string
  total_operational_cost: number | string
  avg_cost_per_trip: number | string
  unique_projects: number | string
  unique_customers: number | string
}

type ApiFleetUtilizationSummary = Omit<
  FleetUtilizationSummary,
  | 'total_fleets'
  | 'active_fleets'
  | 'idle_fleets'
  | 'avg_utilization'
  | 'total_trips'
  | 'total_operational_cost'
  | 'fleets'
> & {
  total_fleets: number | string
  active_fleets: number | string
  idle_fleets: number | string
  avg_utilization: number | string
  total_trips: number | string
  total_operational_cost: number | string
  fleets: ApiFleetUtilization[]
}

function toNumber(value: ApiId) {
  return Number(value || 0)
}

function toNullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  return Number(value)
}

function query(params: Record<string, unknown>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

function normalizeAgingSummary(data: ApiAgingSummary): AgingARSummary {
  return {
    ...data,
    total_outstanding: Number(data.total_outstanding || 0),
    customer_count: Number(data.customer_count || 0),
    invoice_count: Number(data.invoice_count || 0),
    bucket_totals: {
      current: Number(data.bucket_totals.current || 0),
      '1-30': Number(data.bucket_totals['1-30'] || 0),
      '31-60': Number(data.bucket_totals['31-60'] || 0),
      '61-90': Number(data.bucket_totals['61-90'] || 0),
      '>90': Number(data.bucket_totals['>90'] || 0),
    },
    customers: data.customers.map(customer => ({
      ...customer,
      customer_id: toNumber(customer.customer_id),
      invoices: customer.invoices.map(invoice => ({
        ...invoice,
        project_id: toNumber(invoice.project_id),
        total_amount: Number(invoice.total_amount || 0),
        paid_amount: Number(invoice.paid_amount || 0),
        remaining_amount: Number(invoice.remaining_amount || 0),
        days_overdue: Number(invoice.days_overdue || 0),
      })),
      bucket_totals: {
        current: Number(customer.bucket_totals.current || 0),
        '1-30': Number(customer.bucket_totals['1-30'] || 0),
        '31-60': Number(customer.bucket_totals['31-60'] || 0),
        '61-90': Number(customer.bucket_totals['61-90'] || 0),
        '>90': Number(customer.bucket_totals['>90'] || 0),
      },
      total_outstanding: Number(customer.total_outstanding || 0),
      oldest_invoice_days: Number(customer.oldest_invoice_days || 0),
      invoice_count: Number(customer.invoice_count || 0),
    })),
  }
}

function normalizeProjectDetail(data: ApiAgingProjectDetail): AgingARProjectDetail {
  return {
    ...data,
    project_id: toNumber(data.project_id),
    customer_id: toNumber(data.customer_id),
    status: data.status,
    total_invoiced: Number(data.total_invoiced || 0),
    total_paid: Number(data.total_paid || 0),
    total_outstanding: Number(data.total_outstanding || 0),
    total_operational_cost: Number(data.total_operational_cost || 0),
    invoice_count: Number(data.invoice_count || 0),
    sj_count: Number(data.sj_count || 0),
    sj_delivered_count: Number(data.sj_delivered_count || 0),
    invoices: data.invoices.map(invoice => ({
      ...invoice,
      subtotal_amount: Number(invoice.subtotal_amount || 0),
      tax_percent: Number(invoice.tax_percent || 0),
      tax_amount: Number(invoice.tax_amount || 0),
      total_amount: Number(invoice.total_amount || 0),
      paid_amount: Number(invoice.paid_amount || 0),
      down_payment_amount: Number(invoice.down_payment_amount || 0),
      has_down_payment: Boolean(invoice.has_down_payment || Number(invoice.down_payment_amount || 0) > 0),
      remaining_amount: Number(invoice.remaining_amount || 0),
      days_overdue: Number(invoice.days_overdue || 0),
      items: invoice.items.map(item => ({
        ...item,
        qty: Number(item.qty || 0),
        unit_price: Number(item.unit_price || 0),
        subtotal: Number(item.subtotal || 0),
      })),
      payments: invoice.payments.map(payment => ({
        ...payment,
        amount: Number(payment.amount || 0),
      })),
    })),
    surat_jalan: data.surat_jalan.map(sj => ({
      ...sj,
      operational_cost: Number(sj.operational_cost || 0),
    })),
  }
}

function normalizeCustomerDetail(data: ApiAgingCustomerDetail): AgingARCustomerDetail {
  return {
    ...data,
    customer_id: toNumber(data.customer_id),
    project_count: Number(data.project_count || 0),
    invoice_count: Number(data.invoice_count || 0),
    sj_count: Number(data.sj_count || 0),
    total_invoiced: Number(data.total_invoiced || 0),
    total_paid: Number(data.total_paid || 0),
    total_outstanding: Number(data.total_outstanding || 0),
    projects: data.projects.map(normalizeProjectDetail),
  }
}

function normalizeProfitLoss(data: ApiProfitLossSummary): ProfitLossSummary {
  return {
    ...data,
    total_revenue_paid: Number(data.total_revenue_paid || 0),
    total_operational_cost: Number(data.total_operational_cost || 0),
    total_gross_profit: Number(data.total_gross_profit || 0),
    average_margin: toNullableNumber(data.average_margin),
    project_count: Number(data.project_count || 0),
    profitable_count: Number(data.profitable_count || 0),
    loss_count: Number(data.loss_count || 0),
    projects: data.projects.map(project => ({
      ...project,
      project_id: toNumber(project.project_id),
      revenue_invoiced: Number(project.revenue_invoiced || 0),
      revenue_paid: Number(project.revenue_paid || 0),
      invoice_count: Number(project.invoice_count || 0),
      invoice_paid_count: Number(project.invoice_paid_count || 0),
      invoice_outstanding_count: Number(project.invoice_outstanding_count || 0),
      total_operational_cost: Number(project.total_operational_cost || 0),
      sj_count: Number(project.sj_count || 0),
      sj_delivered_count: Number(project.sj_delivered_count || 0),
      gross_profit: Number(project.gross_profit || 0),
      margin_percent: toNullableNumber(project.margin_percent),
    })),
  }
}

export function normalizeFleetUtilization(data: ApiFleetUtilizationSummary): FleetUtilizationSummary {
  return {
    ...data,
    total_fleets: Number(data.total_fleets || 0),
    active_fleets: Number(data.active_fleets || 0),
    idle_fleets: Number(data.idle_fleets || 0),
    avg_utilization: Number(data.avg_utilization || 0),
    total_trips: Number(data.total_trips || 0),
    total_operational_cost: Number(data.total_operational_cost || 0),
    fleets: data.fleets.map(fleet => ({
      ...fleet,
      fleet_id: toNumber(fleet.fleet_id),
      year: toNullableNumber(fleet.year),
      total_trips: Number(fleet.total_trips || 0),
      delivered_trips: Number(fleet.delivered_trips || 0),
      assigned_trips: Number(fleet.assigned_trips || 0),
      draft_trips: Number(fleet.draft_trips || 0),
      void_trips: Number(fleet.void_trips || 0),
      active_days: Number(fleet.active_days || 0),
      total_days_in_period: Number(fleet.total_days_in_period || 0),
      utilization_percent: Number(fleet.utilization_percent || 0),
      total_operational_cost: Number(fleet.total_operational_cost || 0),
      avg_cost_per_trip: Number(fleet.avg_cost_per_trip || 0),
      unique_projects: Number(fleet.unique_projects || 0),
      unique_customers: Number(fleet.unique_customers || 0),
    })),
  }
}

function agingQuery(filters: AgingARFilterDto) {
  return query({
    customer_id: filters.customerId,
    bucket: filters.bucket,
    period_from: filters.periodFrom,
    period_to: filters.periodTo,
    search: filters.search,
  })
}

function profitLossQuery(filters: ProfitLossFilterDto) {
  return query({
    period_preset: filters.periodPreset,
    period_from: filters.periodFrom,
    period_to: filters.periodTo,
    customer_id: filters.customerId,
    project_status: filters.projectStatus,
    profitability: filters.profitability,
    include_details: true,
  })
}

function auditQuery(filters: AuditTrailFilterDto) {
  return query({
    search: filters.search,
    user_id: filters.userId,
    module: filters.module,
    action: filters.action,
    period_preset: filters.periodPreset,
    period_from: filters.periodFrom,
    period_to: filters.periodTo,
    page: filters.page,
    perPage: filters.perPage,
  })
}

export function fleetUtilizationQuery(filters: {
  periodPreset?: string
  periodFrom?: string
  periodTo?: string
  category?: string
  statusFilter?: string
}) {
  return query({
    period_preset: filters.periodPreset,
    period_from: filters.periodFrom,
    period_to: filters.periodTo,
    category: filters.category,
    status: filters.statusFilter,
  })
}

class MockReportsRepository implements IReportsRepository {
  async getAgingAR(filters: AgingARFilterDto): Promise<AgingARSummary> {
    const response = await apiRequest<ApiAgingSummary>(`/reports/aging-ar${agingQuery(filters)}`, { method: 'GET' })
    return normalizeAgingSummary(response.data)
  }

  async getAgingARProjectDetail(projectId: number): Promise<AgingARProjectDetail> {
    const response = await apiRequest<ApiAgingProjectDetail>(`/reports/aging-ar/projects/${projectId}`, { method: 'GET' })
    return normalizeProjectDetail(response.data)
  }

  async getAgingARCustomerDetail(customerId: number): Promise<AgingARCustomerDetail> {
    const response = await apiRequest<ApiAgingCustomerDetail>(`/reports/aging-ar/customers/${customerId}`, { method: 'GET' })
    return normalizeCustomerDetail(response.data)
  }

  async getProfitLoss(filters: ProfitLossFilterDto): Promise<ProfitLossSummary> {
    const response = await apiRequest<ApiProfitLossSummary>(`/reports/profit-loss${profitLossQuery(filters)}`, { method: 'GET' })
    return normalizeProfitLoss(response.data)
  }

  async getAuditTrail(filters: AuditTrailFilterDto): Promise<{ logs: AuditLog[]; total: number }> {
    const response = await apiRequest<{ logs: AuditLog[]; total: number }>(`/reports/audit-trail${auditQuery(filters)}`, { method: 'GET' })
    return {
      logs: response.data.logs.map(log => ({ ...log, id: Number(log.id || 0) })),
      total: Number(response.data.total || 0),
    }
  }
}

export async function getFleetUtilizationReport(filters: Parameters<typeof fleetUtilizationQuery>[0]) {
  const response = await apiRequest<ApiFleetUtilizationSummary>(`/reports/fleet-utilization${fleetUtilizationQuery(filters)}`, { method: 'GET' })
  return normalizeFleetUtilization(response.data)
}

export async function exportAgingARReport(filters: AgingARFilterDto) {
  return apiDownload(`/reports/aging-ar/export${agingQuery(filters)}`)
}

export async function exportProfitLossReport(filters: ProfitLossFilterDto) {
  return apiDownload(`/reports/profit-loss/export${profitLossQuery(filters)}`)
}

export async function exportFleetUtilizationReport(filters: Parameters<typeof fleetUtilizationQuery>[0]) {
  return apiDownload(`/reports/fleet-utilization/export${fleetUtilizationQuery(filters)}`)
}

export const reportsRepository = new MockReportsRepository()
