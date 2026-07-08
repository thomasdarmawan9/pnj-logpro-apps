export interface CreateInvoiceItemDto {
  uuid?: string | null
  source_sj_id?: number | null
  fleet_id?: number | null
  driver_id?: number | null
  driver_name_manual?: string | null
  fleet_label: string
  description?: string | null
  period_start?: string | null
  period_end?: string | null
  rental_duration_years?: number
  rental_duration_months?: number
  rental_duration_days?: number
  rental_duration_hours?: number
  qty: number
  unit: string
  cargo_qty?: number | null
  cargo_unit?: string | null
  cargo_weight?: number | null
  cargo_volume?: number | null
  cargo_notes?: string | null
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
  project_id?: number | null
  customer_id?: number | null
  invoice_date: string
  due_date: string
  delivery_date?: string | null
  service_type: 'delivery' | 'rental' | 'other'
  custom_service_name?: string | null
  delivery_pricing_mode?: 'shipment' | 'item'
  payment_method: 'transfer' | 'cash' | 'check'
  bank_account_id?: number | null
  tax_percent: number
  pph_percent: number
  insurance_amount?: number
  notes?: string | null
  origin?: string | null
  destination?: string | null
  cargo_description?: string | null
  manual_sj_numbers?: string | null
  linked_sj_uuids?: string[]
  items: CreateInvoiceItemDto[]
  send_immediately?: boolean
  // Auto-create SJ dari manual_sj_numbers (1 nomor). Default aktif di backend.
  auto_create_sj?: boolean
  overwrite_sj_confirmed?: boolean
  // Optional DP saat create. Boleh null/undefined kalau tidak ada DP.
  down_payment?: CreateDownPaymentDto | null
}
