import { AgingBucket } from '../value-objects/AgingBucket'

export interface AgingInvoice {
  uuid: string
  invoice_number: string
  invoice_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  remaining_amount: number
  days_overdue: number
  aging_bucket: AgingBucket
  project_id: number
  project_code: string
  project_name: string
  contract_number: string
  sent_at: string | null
}

export interface AgingARCustomer {
  customer_id: number
  customer_name: string
  npwp: string | null
  is_pkp: boolean
  invoices: AgingInvoice[]
  bucket_totals: Record<AgingBucket, number>
  total_outstanding: number
  oldest_invoice_days: number
  invoice_count: number
}

export interface AgingARSummary {
  as_of_date: string
  cached_at: string | null
  total_outstanding: number
  customer_count: number
  invoice_count: number
  bucket_totals: Record<AgingBucket, number>
  customers: AgingARCustomer[]
}
