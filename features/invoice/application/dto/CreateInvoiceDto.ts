export interface CreateInvoiceItemDto {
  fleet_id?: number | null
  fleet_label: string
  description?: string | null
  period_start?: string | null
  period_end?: string | null
  qty: number
  unit: string
  unit_price: number
  sort_order: number
}

/**
 * Down Payment payload — opsional saat create invoice.
 * BE akan otomatis membuat Payment row dengan is_down_payment=true.
 */
export interface CreateDownPaymentDto {
  payment_date: string
  amount: number
  method: 'transfer' | 'cash' | 'check'
  proof_path?: string | null
  notes?: string | null
}

export interface CreateInvoiceDto {
  project_id: number
  invoice_date: string
  due_date: string
  service_type: 'delivery' | 'rental'
  payment_method: 'transfer' | 'cash' | 'check'
  bank_account_id?: number | null
  tax_percent: number
  pph_percent: number
  insurance_amount?: number
  notes?: string | null
  items: CreateInvoiceItemDto[]
  send_immediately?: boolean
  // Optional DP saat create. Boleh null/undefined kalau tidak ada DP.
  down_payment?: CreateDownPaymentDto | null
}
