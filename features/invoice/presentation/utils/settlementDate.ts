import { Invoice, InvoiceStatus } from '../../domain/entities/Invoice'

/**
 * Gunakan field settlement_date persisten agar tanggal tetap tersedia pada
 * response list. Perhitungan dari pembayaran dipertahankan sebagai fallback
 * untuk response/data lama sebelum migrasi.
 */
export function getSettlementDate(invoice: Invoice): string | null {
  if (invoice.status !== InvoiceStatus.PAID) return null
  if (invoice.settlement_date) return invoice.settlement_date
  const dates = invoice.payments.map(p => p.payment_date)
  if (invoice.down_payment) dates.push(invoice.down_payment.payment_date)
  if (dates.length === 0) return null
  return dates.reduce((latest, d) => (d > latest ? d : latest))
}
