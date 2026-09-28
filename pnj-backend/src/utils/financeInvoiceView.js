'use strict'

const { roundInvoiceAmount, calculateRemainingAmount } = require('./invoiceAmounts')

const DEFAULT_PPN_PERCENT = 1.1
const DEFAULT_PPH_PERCENT = 2

// Digunakan oleh filter/summary agar hasil agregat finance cocok dengan barisnya.
const financeTotalSql = `ROUND((
  COALESCE(subtotal_amount, 0)
  + ROUND(COALESCE(subtotal_amount, 0) *
    (CASE WHEN COALESCE(tax_percent, 0) > 0 THEN tax_percent ELSE ${DEFAULT_PPN_PERCENT} END) / 100, 2)
  - ROUND(COALESCE(subtotal_amount, 0) *
    (CASE WHEN COALESCE(pph_percent, 0) > 0 THEN pph_percent ELSE ${DEFAULT_PPH_PERCENT} END) / 100, 2)
  + COALESCE(insurance_amount, 0)
)::numeric, 2)`

// Salin plain object, jangan pernah mengubah instance Sequelize atau data DB.
function financeInvoiceView(invoice) {
  const subtotal = Number(invoice.subtotal_amount || 0)
  const taxPercent = Number(invoice.tax_percent || 0) > 0
    ? Number(invoice.tax_percent) : DEFAULT_PPN_PERCENT
  const pphPercent = Number(invoice.pph_percent || 0) > 0
    ? Number(invoice.pph_percent) : DEFAULT_PPH_PERCENT
  const taxAmount = roundInvoiceAmount(subtotal * taxPercent / 100)
  const pphAmount = roundInvoiceAmount(subtotal * pphPercent / 100)
  const total = roundInvoiceAmount(
    subtotal + taxAmount - pphAmount + Number(invoice.insurance_amount || 0),
  )

  return {
    ...invoice,
    tax_percent: taxPercent,
    tax_amount: taxAmount,
    pph_percent: pphPercent,
    pph_amount: pphAmount,
    total_amount: total,
    remaining_amount: calculateRemainingAmount(total, invoice.paid_amount),
  }
}

module.exports = { financeInvoiceView, financeTotalSql, DEFAULT_PPN_PERCENT, DEFAULT_PPH_PERCENT }
