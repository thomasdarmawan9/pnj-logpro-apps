import { apiRequest } from './apiClient'

// ── Types ─────────────────────────────────────────────────────────────────

export interface DashboardTrend {
  value: number | null
  label: string
  color: string
}

export interface DashboardMetric {
  id: string
  badge: string
  badge_variant: 'gray' | 'red' | 'green' | 'amber'
  label: string
  value: number
  value_label: string
  trend: DashboardTrend
}

export interface DonutEntry {
  name: string
  value: number
  color: string
}

export interface ArmadaEntry {
  fleet_id: number
  fleet_uuid: string
  plat: string
  nama: string
  status: string
  active_days: number
  hari: string
  aktif: boolean
  total_trips: number
}

export interface RevenueMonthEntry {
  bulan: string
  bulan_year: string
  revenue: number
  biaya: number
  revenue_raw: number
  biaya_raw: number
  from: string
  to: string
}

export interface RevenueSummary {
  avg_revenue: number
  total_biaya: number
  avg_margin: number | null
  highest_revenue: { bulan: string; value: number } | null
  highest_biaya: { bulan: string; value: number } | null
  best_margin: { bulan: string; percent: number } | null
}

export interface DashboardSummary {
  as_of: string
  metrics: DashboardMetric[]
  donut: DonutEntry[]
  armada: ArmadaEntry[]
  revenue: {
    data: RevenueMonthEntry[]
    summary: RevenueSummary
  }
}

export interface ActivityRow {
  id: string
  type: 'sj' | 'invoice'
  record_uuid: string
  noDokumen: string
  proyek: string
  armada: string
  statusOps: string
  statusInvoice: string | null
  invoiceNo: string | null
  tanggal: string
  tanggalISO: string
}

export interface ActivityMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ActivityResponse {
  data: ActivityRow[]
  meta: ActivityMeta
}

export interface ActivityFilters {
  module: 'all' | 'sj' | 'invoice'
  status: string
  period: 'all' | 'this_month' | 'last_month'
  page: number
  limit: number
}

// ── API Functions ─────────────────────────────────────────────────────────

export interface SummaryFilters {
  period: 'all' | 'this_month' | 'last_month'
  module: 'all' | 'sj' | 'invoice'
  status: string
}

export async function fetchDashboardSummary(filters: SummaryFilters): Promise<DashboardSummary> {
  const params = new URLSearchParams({
    period: filters.period,
    module: filters.module,
    status: filters.status,
  })
  const res = await apiRequest<DashboardSummary>(`/dashboard/summary?${params}`)
  return res.data
}

export async function fetchDashboardActivity(filters: ActivityFilters): Promise<ActivityResponse> {
  const params = new URLSearchParams({
    module: filters.module,
    status: filters.status,
    period: filters.period,
    page: String(filters.page),
    limit: String(filters.limit),
  })
  const res = await apiRequest<ActivityResponse>(`/dashboard/activity?${params}`)
  return res.data
}
