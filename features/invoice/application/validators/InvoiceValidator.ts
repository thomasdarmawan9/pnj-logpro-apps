import { CreateInvoiceDto, CreateDownPaymentDto } from '../dto/CreateInvoiceDto'
import { UpdateInvoiceDto } from '../dto/UpdateInvoiceDto'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

const VALID_PAYMENT_METHODS = ['transfer', 'cash', 'check'] as const
const VALID_SERVICE_TYPES = ['delivery', 'rental'] as const

function validateDownPayment(
  dp: CreateDownPaymentDto | null | undefined,
  errors: Record<string, string>,
  prefix = 'down_payment',
): void {
  if (dp === null || dp === undefined) return

  if (!dp.payment_date) {
    errors[`${prefix}.payment_date`] = 'Tanggal DP wajib diisi'
  }
  if (typeof dp.amount !== 'number' || dp.amount <= 0) {
    errors[`${prefix}.amount`] = 'Nominal DP harus lebih dari 0'
  }
  if (!dp.method || !VALID_PAYMENT_METHODS.includes(dp.method)) {
    errors[`${prefix}.method`] = 'Metode pembayaran tidak valid'
  }
}

export function validateCreateInvoice(dto: CreateInvoiceDto): ValidationResult {
  const errors: Record<string, string> = {}

  if (!dto.project_id && !dto.customer_id) errors.project_id = 'Pilih proyek atau customer'
  if (!dto.service_type || !VALID_SERVICE_TYPES.includes(dto.service_type)) {
    errors.service_type = 'Jenis jasa wajib dipilih'
  }
  if (!dto.invoice_date) errors.invoice_date = 'Tanggal invoice wajib diisi'
  if (!dto.due_date) errors.due_date = 'Tanggal jatuh tempo wajib diisi'
  if (!dto.payment_method || !VALID_PAYMENT_METHODS.includes(dto.payment_method)) {
    errors.payment_method = 'Metode pembayaran wajib dipilih'
  }
  if (dto.payment_method === 'transfer' && !dto.bank_account_id) {
    errors.bank_account_id = 'Rekening tujuan wajib dipilih untuk metode Transfer Bank'
  }
  dto.items?.forEach((item, idx) => {
    if (dto.service_type === 'rental' && !item.fleet_id) {
      errors[`items.${idx}.fleet_id`] = 'Pilih armada aktif dari master untuk invoice penyewaan'
    }
    if (!item.fleet_label?.trim()) errors[`items.${idx}.fleet_label`] = 'Label armada wajib diisi'
    if (!item.unit_price || item.unit_price <= 0) errors[`items.${idx}.unit_price`] = 'Harga per unit wajib diisi'
    if (!item.qty || item.qty <= 0) errors[`items.${idx}.qty`] = 'Qty wajib diisi'
  })

  // Validasi DP jika dikirim.
  if (dto.down_payment) {
    validateDownPayment(dto.down_payment, errors)
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateUpdateInvoice(dto: UpdateInvoiceDto, serviceType?: 'delivery' | 'rental'): ValidationResult {
  const errors: Record<string, string> = {}

  if (dto.due_date !== undefined && !dto.due_date) {
    errors.due_date = 'Tanggal jatuh tempo wajib diisi'
  }

  if (dto.items !== undefined && dto.items.length > 0) {
    dto.items?.forEach((item, idx) => {
      if (serviceType === 'rental' && !item.fleet_id) {
        errors[`items.${idx}.fleet_id`] = 'Pilih armada aktif dari master untuk invoice penyewaan'
      }
      if (!item.fleet_label?.trim()) errors[`items.${idx}.fleet_label`] = 'Label armada wajib diisi'
      if (!item.unit_price || item.unit_price <= 0) errors[`items.${idx}.unit_price`] = 'Harga per unit wajib diisi'
      if (!item.qty || item.qty <= 0) errors[`items.${idx}.qty`] = 'Qty wajib diisi'
    })
  }

  // Validasi DP jika dikirim. `null` valid (clear DP), object butuh validasi.
  if (dto.down_payment !== undefined && dto.down_payment !== null) {
    // Saat update kita tidak hitung total dari sini — BE akan validate dengan
    // total yang akurat (untuk kasus DP-only edit di invoice paid/sent).
    // FE hanya cek shape (date, amount > 0, method valid).
    validateDownPayment(dto.down_payment, errors)
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
