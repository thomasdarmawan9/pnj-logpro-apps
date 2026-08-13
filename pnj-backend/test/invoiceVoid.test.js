'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

// invoice.service memuat konfigurasi model saat di-import, tetapi test state
// machine ini tidak membuka koneksi database. Sediakan nilai dummy agar test
// tetap dapat berjalan di CI yang tidak memiliki .env backend.
process.env.DB_HOST ||= '127.0.0.1'
process.env.DB_NAME ||= 'test'
process.env.DB_USER ||= 'test'
process.env.DB_PASSWORD ||= 'test'
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret'
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret'

const { STATUS, canTransition } = require('../src/services/invoice.service')
const { voidInvoiceSchema } = require('../src/validators/invoice.validator')
const { isSuperAdmin } = require('../src/middlewares/rbac.middleware')

test('fitur void menerima status invoice legacy cancelled', () => {
  assert.equal(canTransition(STATUS.CANCELLED, STATUS.VOID), true)
  assert.equal(canTransition(STATUS.CANCELED, STATUS.VOID), true)
})

test('status final tetap tidak dapat di-void ulang', () => {
  assert.equal(canTransition(STATUS.PAID, STATUS.VOID), false)
  assert.equal(canTransition(STATUS.VOID, STATUS.VOID), false)
})

test('payload void mewajibkan alasan dan konfirmasi VOID', () => {
  const valid = voidInvoiceSchema.validate({
    void_reason: 'Salah data invoice',
    confirmation: 'VOID',
  })
  assert.equal(valid.error, undefined)

  assert.ok(voidInvoiceSchema.validate({
    void_reason: 'Terlalu singkat',
    confirmation: '2854',
  }).error)
})

test('endpoint void hanya diizinkan untuk super admin', () => {
  const run = (role) => {
    let statusCode = null
    let nextCalled = false
    const req = { user: { role } }
    const res = {
      status(code) { statusCode = code; return this },
      json() { return this },
    }
    isSuperAdmin(req, res, () => { nextCalled = true })
    return { statusCode, nextCalled }
  }

  assert.deepEqual(run('super_admin'), { statusCode: null, nextCalled: true })
  assert.deepEqual(run('admin_finance'), { statusCode: 403, nextCalled: false })
  assert.deepEqual(run('admin_ops'), { statusCode: 403, nextCalled: false })
})
