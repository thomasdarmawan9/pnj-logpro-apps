'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  roundInvoiceAmount,
  calculateRemainingAmount,
  calculatePaidAmountAfterDownPaymentChange,
} = require('../src/utils/invoiceAmounts')
const { buildFooterTotalRows } = require('../src/pdf/invoice.template')

test('sisa tagihan menghitung netto dikurangi DP dan pembayaran reguler', () => {
  assert.equal(calculateRemainingAmount(12_500_000, 4_750_000), 7_750_000)
})

test('sisa tagihan memakai presisi dua desimal dan tidak pernah negatif', () => {
  assert.equal(roundInvoiceAmount('1000.555'), 1000.56)
  assert.equal(calculateRemainingAmount('1000.555', '250.125'), 750.43)
  assert.equal(calculateRemainingAmount(1_000, 1_100), 0)
})

test('perubahan total dan DP bersamaan divalidasi terhadap pembayaran akhir', () => {
  assert.equal(
    calculatePaidAmountAfterDownPaymentChange(8_000_000, 2_000_000, { amount: 3_000_000 }),
    5_000_000,
  )
  assert.equal(
    calculatePaidAmountAfterDownPaymentChange(8_000_000, 2_000_000, null),
    2_000_000,
  )
  assert.equal(
    calculatePaidAmountAfterDownPaymentChange(8_000_000, 2_000_000, undefined),
    8_000_000,
  )
})

test('footer PDF menaruh Sisa Tagihan setelah Down Payment dan sebelum Netto', () => {
  const rows = buildFooterTotalRows({
    subtotal_amount: 10_000_000,
    tax_percent: 11,
    tax_amount: 1_100_000,
    pph_percent: 0,
    insurance_amount: 0,
    total_amount: 11_100_000,
    paid_amount: 3_500_000,
    payments: [{ amount: 2_500_000, is_down_payment: true }],
  })

  assert.deepEqual(rows.slice(-3).map(row => row.label), [
    'Down Payment',
    'Sisa Tagihan',
    'Netto',
  ])
  assert.equal(rows.at(-2).amount, 7_600_000)
})

test('footer PDF tetap mencetak Sisa Tagihan Rp 0 untuk invoice lunas tanpa DP', () => {
  const rows = buildFooterTotalRows({
    subtotal_amount: 5_000_000,
    tax_percent: 0,
    pph_percent: 0,
    insurance_amount: 0,
    total_amount: 5_000_000,
    paid_amount: 5_000_000,
    payments: [],
  })

  assert.deepEqual(rows.slice(-2).map(row => row.label), ['Sisa Tagihan', 'Netto'])
  assert.equal(rows.at(-2).amount, 0)
})
