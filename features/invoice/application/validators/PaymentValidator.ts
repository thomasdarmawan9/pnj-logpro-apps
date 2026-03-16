import { RecordPaymentDto } from '../dto/RecordPaymentDto'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validatePayment(dto: RecordPaymentDto, remainingAmount: number): ValidationResult {
  const errors: Record<string, string> = {}

  if (!dto.payment_date) errors.payment_date = 'Tanggal pembayaran wajib diisi'
  if (!dto.amount || dto.amount <= 0) errors.amount = 'Nominal pembayaran wajib diisi'
  if (dto.amount > remainingAmount + 0.01) errors.amount = `Nominal melebihi sisa tagihan (Rp ${remainingAmount.toLocaleString('id-ID')})`
  if (!dto.method) errors.method = 'Metode pembayaran wajib dipilih'

  return { valid: Object.keys(errors).length === 0, errors }
}
