import { AgingBucket } from '../value-objects/AgingBucket'

export interface ProjectDetailInvoiceItem {
  uuid: string
  fleet_label: string
  description: string | null
  period_start: string | null
  period_end: string | null
  qty: number
  unit: string
  unit_price: number
  subtotal: number
}

export interface ProjectDetailPayment {
  uuid: string
  payment_date: string
  amount: number
  method: 'transfer' | 'cash' | 'check'
  notes: string | null
  created_by_name: string
  created_at: string
}

export interface ProjectDetailInvoice {
  uuid: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: 'draft' | 'sent' | 'outstanding' | 'paid' | 'void'
  subtotal_amount: number
  tax_percent: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  remaining_amount: number
  days_overdue: number
  aging_bucket: AgingBucket | null
  sent_at: string | null
  notes: string | null
  items: ProjectDetailInvoiceItem[]
  payments: ProjectDetailPayment[]
  attached_sj_numbers: string[]
}

export interface ProjectDetailSuratJalan {
  uuid: string
  sj_number: string
  sj_date: string
  origin: string
  destination: string
  cargo_description: string | null
  operational_cost: number
  status: 'draft' | 'assigned' | 'delivered' | 'void'
  fleet_label: string
  fleet_plate: string
  driver_name: string | null
  delivered_at: string | null
  pod_photo_path: string | null
  internal_notes: string | null
  void_reason: string | null
  invoice_number: string | null
}

export interface AgingARProjectDetail {
  project_id: number
  project_code: string
  project_name: string
  contract_number: string
  customer_id: number
  customer_name: string
  npwp: string | null
  is_pkp: boolean
  start_date: string
  end_date: string | null
  status: 'active' | 'completed' | 'cancelled'

  // Financial summary
  total_invoiced: number
  total_paid: number
  total_outstanding: number
  total_operational_cost: number
  invoice_count: number
  sj_count: number
  sj_delivered_count: number

  invoices: ProjectDetailInvoice[]
  surat_jalan: ProjectDetailSuratJalan[]
}
