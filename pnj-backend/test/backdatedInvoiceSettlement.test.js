'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

process.env.DB_HOST ||= '127.0.0.1'
process.env.DB_NAME ||= 'test'
process.env.DB_USER ||= 'test'
process.env.DB_PASSWORD ||= 'test'
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret'
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret'

const { sequelize, Invoice, Payment } = require('../src/models')
const repo = require('../src/repositories/invoice.repository')
const { update, STATUS } = require('../src/services/invoice.service')

test('tanggal pelunasan invoice lunas bisa diubah ke bulan sebelum invoice', async () => {
  const original = {
    transaction: sequelize.transaction,
    findInvoice: Invoice.findOne,
    findPayments: Payment.findAll,
    findByUuid: repo.findByUuid,
  }
  const invoice = {
    id: 17,
    uuid: '43e70e3a-73e5-473a-a84e-5a36b9cafc2b',
    invoice_date: '2025-08-10',
    due_date: '2025-08-31',
    status: STATUS.PAID,
    total_amount: 10_000_000,
    paid_amount: 10_000_000,
    settlement_date: '2025-08-10',
    async update(changes) { Object.assign(this, changes) },
  }
  const payment = {
    id: 1,
    payment_date: '2025-08-10',
    is_down_payment: false,
    amount: 10_000_000,
    async update(changes) { Object.assign(this, changes) },
  }
  sequelize.transaction = async callback => callback({ LOCK: { UPDATE: 'UPDATE' } })
  Invoice.findOne = async () => invoice
  Payment.findAll = async () => [payment]
  repo.findByUuid = async () => ({ ...invoice, payments: [payment] })
  try {
    const result = await update(invoice.uuid, { settlement_date: '2025-07-15' })
    assert.equal(payment.payment_date, '2025-07-15')
    assert.equal(result.settlement_date, '2025-07-15')
    assert.equal(result.status, STATUS.PAID)
  } finally {
    sequelize.transaction = original.transaction
    Invoice.findOne = original.findInvoice
    Payment.findAll = original.findPayments
    repo.findByUuid = original.findByUuid
  }
})
