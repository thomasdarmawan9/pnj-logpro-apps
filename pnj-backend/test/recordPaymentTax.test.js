'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

// Service dapat diuji tanpa membuka koneksi PostgreSQL.
process.env.DB_HOST ||= '127.0.0.1'
process.env.DB_NAME ||= 'test'
process.env.DB_USER ||= 'test'
process.env.DB_PASSWORD ||= 'test'
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret'
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret'

const { sequelize, Invoice, InvoiceItem, Payment } = require('../src/models')
const repo = require('../src/repositories/invoice.repository')
const { recordPayment, STATUS } = require('../src/services/invoice.service')
const { todayDateOnly } = require('../src/utils/dateOnly')

async function withPaymentStubs(invoiceData, run) {
  const original = {
    transaction: sequelize.transaction,
    findInvoice: Invoice.findOne,
    findItems: InvoiceItem.findAll,
    findPayment: Payment.findOne,
    createPayment: Payment.create,
    findByUuid: repo.findByUuid,
  }
  const invoice = {
    id: 17,
    uuid: '43e70e3a-73e5-473a-a84e-5a36b9cafc2b',
    invoice_date: '2026-01-01',
    status: STATUS.OUTSTANDING,
    subtotal_amount: 10_000_000,
    tax_percent: 0,
    pph_percent: 0,
    insurance_amount: 0,
    total_amount: 10_000_000,
    paid_amount: 2_000_000,
    ...invoiceData,
    async update(changes) { Object.assign(this, changes) },
  }
  const created = []
  let itemReads = 0
  sequelize.transaction = async callback => callback({ LOCK: { UPDATE: 'UPDATE' } })
  Invoice.findOne = async () => invoice
  InvoiceItem.findAll = async () => {
    itemReads += 1
    return [{ qty: 1, unit_price: 10_000_000 }]
  }
  Payment.findOne = async () => null
  Payment.create = async payment => { created.push(payment) }
  repo.findByUuid = async () => ({ ...invoice, payments: created })
  try {
    await run({ invoice, created, getItemReads: () => itemReads })
  } finally {
    sequelize.transaction = original.transaction
    Invoice.findOne = original.findInvoice
    InvoiceItem.findAll = original.findItems
    Payment.findOne = original.findPayment
    Payment.create = original.createPayment
    repo.findByUuid = original.findByUuid
  }
}

function payment(amount, taxes = {}) {
  return { payment_date: todayDateOnly(), amount, method: 'transfer', ...taxes }
}

test('pembayaran biasa mempertahankan total dan tidak menghitung ulang item', async () => {
  await withPaymentStubs({ total_amount: 10_050_000 }, async ({ invoice, created, getItemReads }) => {
    const result = await recordPayment(invoice.uuid, payment(8_050_000, { tax_percent: 0, pph_percent: 0 }))
    assert.equal(result.status, STATUS.PAID)
    assert.equal(result.total_amount, 10_050_000)
    assert.equal(result.remaining_amount, 0)
    assert.equal(created.length, 1)
    assert.equal(getItemReads(), 0)
  })
})

test('PPN dan PPh diaktifkan bersamaan dengan pelunasan', async () => {
  await withPaymentStubs({}, async ({ invoice, created, getItemReads }) => {
    const result = await recordPayment(invoice.uuid, payment(7_910_000, { tax_percent: 1.1, pph_percent: 2 }))
    assert.equal(result.tax_percent, 1.1)
    assert.equal(result.tax_amount, 110_000)
    assert.equal(result.pph_percent, 2)
    assert.equal(result.pph_amount, 200_000)
    assert.equal(result.total_amount, 9_910_000)
    assert.equal(result.paid_amount, 9_910_000)
    assert.equal(result.remaining_amount, 0)
    assert.equal(result.status, STATUS.PAID)
    assert.equal(result.settlement_date, todayDateOnly())
    assert.equal(created[0].amount, 7_910_000)
    assert.equal(getItemReads(), 1)
  })
})

test('pembayaran sebagian dengan PPN saja mempertahankan status terbit dan asuransi', async () => {
  await withPaymentStubs({ status: STATUS.SENT, insurance_amount: 50_000 }, async ({ invoice }) => {
    const result = await recordPayment(invoice.uuid, payment(1_000_000, { tax_percent: 1.1, pph_percent: 0 }))
    assert.equal(result.total_amount, 10_160_000)
    assert.equal(result.insurance_amount, 50_000)
    assert.equal(result.paid_amount, 3_000_000)
    assert.equal(result.remaining_amount, 7_160_000)
    assert.equal(result.status, STATUS.SENT)
    assert.equal(result.settlement_date, null)
  })
})

test('pajak yang menurunkan netto di bawah pembayaran lama ditolak sebelum mencatat pembayaran', async () => {
  await withPaymentStubs({ paid_amount: 9_500_000 }, async ({ invoice, created }) => {
    await assert.rejects(
      recordPayment(invoice.uuid, payment(100_000, { pph_percent: 10 })),
      /lebih kecil dari pembayaran yang sudah tercatat/,
    )
    assert.equal(invoice.total_amount, 10_000_000)
    assert.equal(invoice.pph_percent, 0)
    assert.equal(created.length, 0)
  })
})
