/**
 * Normalisasi nominal invoice ke presisi yang sama dengan backend (2 desimal).
 */
export function roundInvoiceAmount(value: number | string | null | undefined): number {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100) / 100
}

/**
 * paidAmount mencakup DP dan seluruh pembayaran reguler.
 */
export function calculateRemainingAmount(
  totalAmount: number | string | null | undefined,
  paidAmount: number | string | null | undefined,
): number {
  const total = roundInvoiceAmount(totalAmount)
  const paid = roundInvoiceAmount(paidAmount)
  return roundInvoiceAmount(Math.max(0, total - paid))
}
