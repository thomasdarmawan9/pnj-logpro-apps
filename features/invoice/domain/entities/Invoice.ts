export enum InvoiceStatus {
  DRAFT       = 'draft',
  SENT        = 'sent',
  OUTSTANDING = 'outstanding',
  PAID        = 'paid',
  VOID        = 'void',
}

export interface InvoiceItem {
  id?: number
  uuid: string
  invoice_id?: number
  fleet_id?: number | null
  fleet?: {
    id: number
    name: string
    plate_number: string
  } | null
  fleet_label: string
  description: string | null
  period_start: string | null
  period_end: string | null
  qty: number
  unit: string
  unit_price: number
  subtotal: number
  sort_order: number
}

export interface AttachedSJ {
  uuid: string
  sj_number: string
  sj_date: string
  origin: string
  destination: string
  fleet_label: string
  driver_name: string
  status: string
}

export interface Payment {
  id?: number
  uuid: string
  invoice_id?: number
  payment_date: string
  amount: number
  method: 'transfer' | 'cash' | 'check'
  proof_path: string | null
  notes: string | null
  created_by_name: string
  created_at: string
}

export interface Invoice {
  id?: number
  uuid: string
  invoice_number: string
  project_id?: number
  project: {
    id?: number
    name: string
    code: string
    contract_number: string
  }
  customer_id?: number
  customer: {
    id?: number
    name: string
    address?: string | null
    npwp?: string | null
    is_pkp: boolean
  }
  invoice_date: string
  due_date: string
  items: InvoiceItem[]
  subtotal_amount: number
  tax_percent: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  remaining_amount: number
  status: InvoiceStatus
  notes: string | null
  sent_at: string | null
  void_reason: string | null
  attached_sj: AttachedSJ[]
  payments: Payment[]
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface InvoiceFilterState {
  search: string
  status: string
  customer: string
  proyek: string
  periode: string
}

export interface PaginationState {
  page: number
  perPage: number
  total: number
}

export const INVOICE_TRANSITIONS: Record<string, InvoiceStatus[]> = {
  draft:       [InvoiceStatus.SENT, InvoiceStatus.OUTSTANDING, InvoiceStatus.VOID],
  sent:        [InvoiceStatus.OUTSTANDING, InvoiceStatus.VOID],
  outstanding: [InvoiceStatus.PAID, InvoiceStatus.VOID],
  paid:        [],
  void:        [],
}
