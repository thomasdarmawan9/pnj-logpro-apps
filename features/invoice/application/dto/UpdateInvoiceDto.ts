import { CreateInvoiceItemDto } from './CreateInvoiceDto'

export interface UpdateInvoiceDto {
  invoice_date?: string
  due_date?: string
  tax_percent?: number
  notes?: string | null
  items?: CreateInvoiceItemDto[]
}
