import { Invoice, InvoiceStatus } from '../../domain/entities/Invoice'

/**
 * Tanggal pelunasan = tanggal pembayaran TERAKHIR (reguler + DP) untuk invoice
 * yang sudah lunas. Bukan field tersimpan — diturunkan dari daftar pembayaran.
 * Mengembalikan null jika invoice belum lunas atau belum ada pembayaran.
 */
export function getSettlementDate(invoice: Invoice): string | null {
  if (invoice.status !== InvoiceStatus.PAID) return null
  const dates = invoice.payments.map(p => p.payment_date)
  if (invoice.down_payment) dates.push(invoice.down_payment.payment_date)
  if (dates.length === 0) return null
  return dates.reduce((latest, d) => (d > latest ? d : latest))
}
