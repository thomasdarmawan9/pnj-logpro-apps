'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  createSJSchema,
  updateSJSchema,
} = require('../src/validators/suratJalan.validator')

test('create SJ menerima nama pengirim dan penerima dari customer atau input manual', () => {
  const { value, error } = createSJSchema.validate({
    customer_id: 1,
    sj_date: '2026-08-09',
    origin: 'Pontianak',
    destination: 'Kubu Raya',
    sender_name: '  PT Pengirim  ',
    recipient_name: '  Nama Penerima Manual  ',
  })

  assert.equal(error, undefined)
  assert.equal(value.sender_name, 'PT Pengirim')
  assert.equal(value.recipient_name, 'Nama Penerima Manual')
})

test('update SJ menerima penerima null dan menolak nama lebih dari 255 karakter', () => {
  assert.equal(updateSJSchema.validate({ recipient_name: null }).error, undefined)
  assert.ok(updateSJSchema.validate({ recipient_name: 'x'.repeat(256) }).error)
  assert.ok(updateSJSchema.validate({ sender_name: 'x'.repeat(256) }).error)
})
