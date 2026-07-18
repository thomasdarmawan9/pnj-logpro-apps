'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  addMonthsDateOnly,
  differenceInCalendarDays,
  normalizeDateOnly,
  todayDateOnly,
} = require('../src/utils/dateOnly')
const {
  recordPaymentSchema,
  bulkRecordPaymentSchema,
} = require('../src/validators/invoice.validator')
const { formatDateShort } = require('../src/pdf/utils')

test('todayDateOnly mengikuti pergantian hari Asia/Jakarta', () => {
  assert.equal(todayDateOnly(new Date('2026-07-17T16:59:59Z')), '2026-07-17')
  assert.equal(todayDateOnly(new Date('2026-07-17T17:00:00Z')), '2026-07-18')
  assert.equal(todayDateOnly(new Date('2026-07-17T23:59:59Z')), '2026-07-18')
})

test('normalizeDateOnly menolak timestamp dan tanggal kalender tidak valid', () => {
  assert.equal(normalizeDateOnly('2026-07-18'), '2026-07-18')
  assert.equal(normalizeDateOnly('2026-02-30'), null)
  assert.equal(normalizeDateOnly('2026-07-18T00:00:00.000Z'), null)
})

test('operasi kalender date-only tidak dipengaruhi timezone', () => {
  assert.equal(differenceInCalendarDays('2026-07-18', '2026-07-17'), 1)
  assert.equal(addMonthsDateOnly('2026-08-31', -6), '2026-02-28')
})

test('validator pembayaran mempertahankan DATEONLY sebagai string', () => {
  const { value, error } = recordPaymentSchema.validate({
    payment_date: '2026-07-18',
    amount: 1000,
    method: 'transfer',
  }, { convert: true })
  assert.equal(error, undefined)
  assert.equal(value.payment_date, '2026-07-18')
  assert.equal(typeof value.payment_date, 'string')
})

test('validator pembayaran menolak ISO timestamp', () => {
  const { error } = recordPaymentSchema.validate({
    payment_date: '2026-07-18T00:00:00.000Z',
    amount: 1000,
    method: 'transfer',
  }, { convert: true })
  assert.ok(error)
})

test('validator bulk menolak invoice duplikat', () => {
  const invoiceUuid = '7e73d676-570a-4a79-8f38-caaa01c9f74b'
  const { error } = bulkRecordPaymentSchema.validate({
    payment_date: '2026-07-18',
    payments: [
      { invoice_uuid: invoiceUuid, method: 'transfer' },
      { invoice_uuid: invoiceUuid, method: 'cash' },
    ],
  })
  assert.ok(error)
})

test('formatter PDF tidak menggeser date-only', () => {
  assert.equal(formatDateShort('2026-07-18'), '18/07/26')
})
