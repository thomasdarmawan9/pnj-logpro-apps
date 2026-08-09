'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { bulkGenerateInvoicePdfSchema } = require('../src/validators/pdfJob.validator')

const FIRST_UUID = '7e73d676-570a-4a79-8f38-caaa01c9f74b'
const SECOND_UUID = '15b5c4c2-41a2-4c77-b59e-35a74803d4a9'

test('validator menerima beberapa invoice unik dan menerapkan default PDF invoice', () => {
  const { value, error } = bulkGenerateInvoicePdfSchema.validate({
    invoice_uuids: [FIRST_UUID, SECOND_UUID],
  })

  assert.equal(error, undefined)
  assert.deepEqual(value.invoice_uuids, [FIRST_UUID, SECOND_UUID])
  assert.deepEqual(value.options, {
    includeLogo: true,
    includeSig: true,
    includeSJ: false,
    includeLampiran: true,
    copies: 3,
    copyLabel: false,
  })
})

test('validator menolak UUID invoice duplikat', () => {
  const { error } = bulkGenerateInvoicePdfSchema.validate({
    invoice_uuids: [FIRST_UUID, FIRST_UUID],
  })

  assert.ok(error)
})

test('validator membatasi maksimal 20 invoice per batch', () => {
  const invoiceUuids = Array.from({ length: 21 }, (_, index) => {
    const suffix = String(index + 1).padStart(12, '0')
    return `00000000-0000-4000-8000-${suffix}`
  })
  const { error } = bulkGenerateInvoicePdfSchema.validate({ invoice_uuids: invoiceUuids })

  assert.ok(error)
})
