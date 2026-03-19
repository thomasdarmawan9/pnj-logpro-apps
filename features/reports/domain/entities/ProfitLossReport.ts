import { ProfitabilityStatus } from '../value-objects/ProfitMargin'

export interface ProfitLossInvoiceDetail {
  uuid: string
  invoice_number: string
  total_amount: number
  status: string
}

export interface ProfitLossSJDetail {
  uuid: string
  sj_number: string
  driver_name: string
  fleet_label: string
  status: string
  operational_cost: number
}

export interface ProfitLossProject {
  project_id: number
  project_name: string
  project_code: string
  contract_number: string
  customer_name: string
  start_date: string
  end_date: string | null
  status: string
  revenue_invoiced: number
  revenue_paid: number
  invoice_count: number
  invoice_paid_count: number
  invoice_outstanding_count: number
  total_operational_cost: number
  sj_count: number
  sj_delivered_count: number
  gross_profit: number
  margin_percent: number | null
  profitability: ProfitabilityStatus
  invoices?: ProfitLossInvoiceDetail[]
  sj_list?: ProfitLossSJDetail[]
}

export interface ProfitLossSummary {
  period_from: string
  period_to: string
  cached_at: string | null
  total_revenue_paid: number
  total_operational_cost: number
  total_gross_profit: number
  average_margin: number | null
  project_count: number
  profitable_count: number
  loss_count: number
  projects: ProfitLossProject[]
}
