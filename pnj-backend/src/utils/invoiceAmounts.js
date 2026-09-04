'use strict'

/**
 * Normalisasi nominal invoice ke presisi penyimpanan DECIMAL(15, 2).
 */
function roundInvoiceAmount(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100) / 100
}

/**
 * Satu sumber rumus sisa tagihan untuk response API dan PDF.
 * paidAmount sudah mencakup DP dan pembayaran reguler.
 */
function calculateRemainingAmount(totalAmount, paidAmount) {
  const total = roundInvoiceAmount(totalAmount)
  const paid = roundInvoiceAmount(paidAmount)
  return roundInvoiceAmount(Math.max(0, total - paid))
}

/**
 * Nilai paid_amount yang akan berlaku setelah perubahan DP.
 * `undefined` berarti DP tidak disentuh, sedangkan `null` berarti DP dihapus.
 */
function calculatePaidAmountAfterDownPaymentChange(
  currentPaidAmount,
  regularPaidAmount,
  downPayment,
) {
  if (downPayment === undefined) return roundInvoiceAmount(currentPaidAmount)
  const nextDownPaymentAmount = downPayment === null
    ? 0
    : roundInvoiceAmount(downPayment.amount)
  return roundInvoiceAmount(roundInvoiceAmount(regularPaidAmount) + nextDownPaymentAmount)
}

module.exports = {
  roundInvoiceAmount,
  calculateRemainingAmount,
  calculatePaidAmountAfterDownPaymentChange,
}
