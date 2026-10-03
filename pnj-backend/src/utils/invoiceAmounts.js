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

/** Hitung ulang invoice saat rincian atau pilihan pajak berubah. */
function calculateInvoiceTotals(items, taxPercent, pphPercent, insuranceAmount = 0) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.qty || 0) * Number(item.unit_price || 0),
    0,
  )
  const taxAmount = subtotal * Number(taxPercent || 0) / 100
  const pphAmount = subtotal * Number(pphPercent || 0) / 100
  const insurance = roundInvoiceAmount(insuranceAmount)
  return {
    subtotal_amount: roundInvoiceAmount(subtotal),
    tax_amount: roundInvoiceAmount(taxAmount),
    pph_amount: roundInvoiceAmount(pphAmount),
    insurance_amount: insurance,
    total_amount: roundInvoiceAmount(subtotal + taxAmount - pphAmount + insurance),
  }
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
  calculateInvoiceTotals,
  calculatePaidAmountAfterDownPaymentChange,
}
