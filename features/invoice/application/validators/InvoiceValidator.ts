import { CreateInvoiceDto, CreateDownPaymentDto } from '../dto/CreateInvoiceDto'
import { UpdateInvoiceDto } from '../dto/UpdateInvoiceDto'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

const VALID_PAYMENT_METHODS = ['transfer', 'cash', 'check'] as const

/**
 * Validasi shape down_payment payload. Dipanggil dari validateCreate/Update.
 * Total invoice di-passing untuk validasi `amount <= totalAmount`.
 *
 * @param dp DP payload (boleh null untuk clear DP existing)
 * @param totalAmount total invoice (subtotal + tax - pph). Boleh 0 untuk skip
 *                    cap check (dipakai saat update — BE tahu total final).
 */
function validateDownPayment(
  dp: CreateDownPaymentDto | null | undefined,
  totalAmount: number,
  errors: Record<string, string>,
  prefix = 'down_payment',
): void {
  if (dp === null || dp === undefined) return

  if (!dp.payment_date) {
    errors[`${prefix}.payment_date`] = 'Tanggal DP wajib diisi'
  }
  if (typeof dp.amount !== 'number' || dp.amount <= 0) {
    errors[`${prefix}.amount`] = 'Nominal DP harus lebih dari 0'
  } else if (totalAmount > 0 && dp.amount > totalAmount) {
    errors[`${prefix}.amount`] = `DP tidak boleh melebihi total invoice (${totalAmount.toLocaleString('id-ID')})`
  }
  if (!dp.method || !VALID_PAYMENT_METHODS.includes(dp.method)) {
    errors[`${prefix}.method`] = 'Metode pembayaran tidak valid'
  }
}

function calculateInvoiceTotal(dto: { items?: { qty?: number; unit_price?: number }[]; tax_percent?: number; pph_percent?: number }): number {
  if (!dto.items?.length) return 0
  const subtotal = dto.items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.unit_price || 0), 0)
  const tax = subtotal * Number(dto.tax_percent || 0) / 100
  const pph = subtotal * Number(dto.pph_percent || 0) / 100
  return Math.round((subtotal + tax - pph) * 100) / 100
}

export function validateCreateInvoice(dto: CreateInvoiceDto): ValidationResult {
  const errors: Record<string, string> = {}

  if (!dto.project_id) errors.project_id = 'Proyek wajib dipilih'
  if (!dto.invoice_date) errors.invoice_date = 'Tanggal invoice wajib diisi'
  if (!dto.due_date) errors.due_date = 'Tanggal jatuh tempo wajib diisi'
  if (!dto.payment_method || !VALID_PAYMENT_METHODS.includes(dto.payment_method)) {
    errors.payment_method = 'Metode pembayaran wajib dipilih'
  }
  if (dto.payment_method === 'transfer' && !dto.bank_account_id) {
    errors.bank_account_id = 'Rekening tujuan wajib dipilih untuk metode Transfer Bank'
  }
  if (!dto.items || dto.items.length === 0) errors.items = 'Minimal 1 item harus diisi'

  dto.items?.forEach((item, idx) => {
    if (!item.fleet_label?.trim()) errors[`items.${idx}.fleet_label`] = 'Label armada wajib diisi'
    if (!item.unit_price || item.unit_price <= 0) errors[`items.${idx}.unit_price`] = 'Harga per unit wajib diisi'
    if (!item.qty || item.qty <= 0) errors[`items.${idx}.qty`] = 'Qty wajib diisi'
  })

  // Validasi DP jika dikirim.
  if (dto.down_payment) {
    const total = calculateInvoiceTotal(dto)
    validateDownPayment(dto.down_payment, total, errors)
  }

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

  // Validasi DP jika dikirim. `null` valid (clear DP), object butuh validasi.
  if (dto.down_payment !== undefined && dto.down_payment !== null) {
    // Saat update kita tidak hitung total dari sini — BE akan validate dengan
    // total yang akurat (untuk kasus DP-only edit di invoice paid/sent).
    // FE hanya cek shape (date, amount > 0, method valid).
    validateDownPayment(dto.down_payment, 0, errors)
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
