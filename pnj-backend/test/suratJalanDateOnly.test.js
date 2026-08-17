'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  createSJSchema,
  updateSJSchema,
  listSJQuery,
} = require('../src/validators/suratJalan.validator')

const validCreatePayload = {
  customer_id: 1,
  sj_date: '2026-08-18',
  origin: 'Pontianak',
  destination: 'Kubu Raya',
}

test('validator create SJ mempertahankan sj_date sebagai string DATEONLY', () => {
  const { value, error } = createSJSchema.validate(validCreatePayload, { convert: true })

  assert.equal(error, undefined)
  assert.equal(value.sj_date, '2026-08-18')
  assert.equal(typeof value.sj_date, 'string')
})

test('validator edit dan filter SJ mempertahankan tanggal sebagai string DATEONLY', () => {
  const update = updateSJSchema.validate({ sj_date: '2026-08-19' }, { convert: true })
  const list = listSJQuery.validate({ from: '2026-08-01', to: '2026-08-31' }, { convert: true })

  assert.equal(update.error, undefined)
  assert.equal(update.value.sj_date, '2026-08-19')
  assert.equal(typeof update.value.sj_date, 'string')
  assert.equal(list.error, undefined)
  assert.equal(list.value.from, '2026-08-01')
  assert.equal(list.value.to, '2026-08-31')
})

test('validator SJ menolak timestamp dan tanggal kalender tidak valid untuk DATEONLY', () => {
  assert.ok(createSJSchema.validate({
    ...validCreatePayload,
    sj_date: '2026-08-18T00:00:00.000Z',
  }).error)
  assert.ok(updateSJSchema.validate({ sj_date: '2026-02-30' }).error)
  assert.ok(listSJQuery.validate({ from: '2026-08-01T00:00:00.000Z' }).error)
})
