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

export interface CreateInvoiceDto {
  project_id: number
  invoice_date: string
  due_date: string
  tax_percent: number
  pph_percent: number
  notes?: string | null
  items: CreateInvoiceItemDto[]
  send_immediately?: boolean
}
