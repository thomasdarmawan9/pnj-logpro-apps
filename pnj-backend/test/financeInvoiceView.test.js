'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { financeInvoiceView } = require('../src/utils/financeInvoiceView')
const { buildFooterTotalRows } = require('../src/pdf/invoice.template')
const { assertPdfAccess } = require('../src/services/pdfJob.service')

test('invoice tanpa pajak diproyeksikan untuk finance tanpa mengubah data asli', () => {
  const actual = Object.freeze({
    subtotal_amount: 10_000_000,
    tax_percent: 0,
    tax_amount: 0,
    pph_percent: 0,
    pph_amount: 0,
    insurance_amount: 100_000,
    total_amount: 10_100_000,
    paid_amount: 2_000_000,
    payments: [],
  })
  const viewed = financeInvoiceView(actual)

  assert.deepEqual({
    tax_percent: viewed.tax_percent,
    tax_amount: viewed.tax_amount,
    pph_percent: viewed.pph_percent,
    pph_amount: viewed.pph_amount,
    total_amount: viewed.total_amount,
    remaining_amount: viewed.remaining_amount,
  }, {
    tax_percent: 1.1,
    tax_amount: 110_000,
    pph_percent: 2,
    pph_amount: 200_000,
    total_amount: 10_010_000,
    remaining_amount: 8_010_000,
  })
  assert.equal(actual.total_amount, 10_100_000)
  assert.equal(actual.tax_percent, 0)
  assert.deepEqual(buildFooterTotalRows(viewed).slice(0, 3).map(row => row.label), [
    'Sub Total', 'PPN (1.1%)', 'PPh (2%)',
  ])
})

test('tarif pajak asli tetap dipakai dan hanya pajak yang absen ditambahkan', () => {
  const viewed = financeInvoiceView({
    subtotal_amount: 1_000_000,
    tax_percent: 11,
    pph_percent: 0,
    insurance_amount: 0,
    paid_amount: 0,
  })
  assert.equal(viewed.tax_percent, 11)
  assert.equal(viewed.tax_amount, 110_000)
  assert.equal(viewed.pph_percent, 2)
  assert.equal(viewed.pph_amount, 20_000)
  assert.equal(viewed.total_amount, 1_090_000)
})

test('PDF finance hanya dapat dibaca oleh akun finance pembuatnya', () => {
  const job = { job_type: 'invoice', options: { financeTaxView: true }, requested_by: 42 }
  assert.doesNotThrow(() => assertPdfAccess(job, { role: 'admin_finance', id: 42 }))
  assert.throws(() => assertPdfAccess(job, { role: 'super_admin', id: 42 }), { statusCode: 403 })
  assert.throws(() => assertPdfAccess(job, { role: 'admin_finance', id: 43 }), { statusCode: 403 })
  assert.doesNotThrow(() => assertPdfAccess({ ...job, options: { financeTaxView: false } }, { role: 'super_admin', id: 43 }))
})
