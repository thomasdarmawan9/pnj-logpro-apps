import { Invoice } from '../entities/Invoice'
import { calculateRemainingAmount } from './invoiceAmounts'

// Samakan dengan tarif bawaan pada form invoice. Proyeksi ini hanya untuk baca.
const DEFAULT_PPN_PERCENT = 1.1
const DEFAULT_PPH_PERCENT = 2

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function financeInvoiceView(invoice: Invoice): Invoice {
  const subtotal = Number(invoice.subtotal_amount || 0)
  const taxPercent = Number(invoice.tax_percent || 0) > 0 ? Number(invoice.tax_percent) : DEFAULT_PPN_PERCENT
  const pphPercent = Number(invoice.pph_percent || 0) > 0 ? Number(invoice.pph_percent) : DEFAULT_PPH_PERCENT
  const taxAmount = round2(subtotal * taxPercent / 100)
  const pphAmount = round2(subtotal * pphPercent / 100)
  const total = round2(subtotal + taxAmount - pphAmount + Number(invoice.insurance_amount || 0))

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

export function actualTaxFlag(invoice: Invoice): string {
  const ppn = Number(invoice.tax_percent || 0) > 0
  const pph = Number(invoice.pph_percent || 0) > 0
  if (ppn && pph) return 'actual flag : dengan PPN + PPH'
  if (!ppn && !pph) return 'actual flag : tanpa PPN + PPH'
  return `actual flag : ${ppn ? 'dengan PPN, tanpa PPH' : 'tanpa PPN, dengan PPH'}`
}
