import { CreateInvoiceDto } from '../dto/CreateInvoiceDto'
import { UpdateInvoiceDto } from '../dto/UpdateInvoiceDto'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateCreateInvoice(dto: CreateInvoiceDto): ValidationResult {
  const errors: Record<string, string> = {}

  if (!dto.project_id) errors.project_id = 'Proyek wajib dipilih'
  if (!dto.invoice_date) errors.invoice_date = 'Tanggal invoice wajib diisi'
  if (!dto.due_date) errors.due_date = 'Tanggal jatuh tempo wajib diisi'
  if (!dto.items || dto.items.length === 0) errors.items = 'Minimal 1 item harus diisi'

  dto.items?.forEach((item, idx) => {
    if (!item.fleet_label?.trim()) errors[`items.${idx}.fleet_label`] = 'Label armada wajib diisi'
    if (!item.unit_price || item.unit_price <= 0) errors[`items.${idx}.unit_price`] = 'Harga per unit wajib diisi'
    if (!item.qty || item.qty <= 0) errors[`items.${idx}.qty`] = 'Qty wajib diisi'
  })

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateUpdateInvoice(dto: UpdateInvoiceDto): ValidationResult {
  const errors: Record<string, string> = {}

  if (dto.due_date !== undefined && !dto.due_date) {
    errors.due_date = 'Tanggal jatuh tempo wajib diisi'
  }

  if (dto.items !== undefined) {
    if (dto.items.length === 0) errors.items = 'Minimal 1 item harus diisi'
    dto.items?.forEach((item, idx) => {
      if (!item.fleet_label?.trim()) errors[`items.${idx}.fleet_label`] = 'Label armada wajib diisi'
      if (!item.unit_price || item.unit_price <= 0) errors[`items.${idx}.unit_price`] = 'Harga per unit wajib diisi'
      if (!item.qty || item.qty <= 0) errors[`items.${idx}.qty`] = 'Qty wajib diisi'
    })
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
