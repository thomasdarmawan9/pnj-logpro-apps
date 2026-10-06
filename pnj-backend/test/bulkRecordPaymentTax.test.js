'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

process.env.DB_HOST ||= '127.0.0.1'
process.env.DB_NAME ||= 'test'
process.env.DB_USER ||= 'test'
process.env.DB_PASSWORD ||= 'test'
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret'
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret'

const { sequelize, Invoice, InvoiceItem, Payment } = require('../src/models')
const repo = require('../src/repositories/invoice.repository')
const { recordBulkPayments, STATUS } = require('../src/services/invoice.service')
const { todayDateOnly } = require('../src/utils/dateOnly')

function makeInvoice(id, overrides = {}) {
  return {
    id,
    uuid: `43e70e3a-73e5-473a-a84e-5a36b9cafc2${id.toString(16)}`,
    invoice_number: `INV-${id}`,
    invoice_date: '2026-01-01',
    status: STATUS.OUTSTANDING,
    subtotal_amount: 10_000_000,
    tax_percent: 0,
    pph_percent: 0,
    insurance_amount: 0,
    total_amount: 10_000_000,
    paid_amount: 0,
    ...overrides,
    async update(changes, options) {
      assert.equal(options.transaction, transaction)
      Object.assign(this, changes)
    },
  }
}

const transaction = { LOCK: { UPDATE: 'UPDATE' } }

async function withBulkStubs(invoices, run) {
  const original = {
    transaction: sequelize.transaction,
    findInvoices: Invoice.findAll,
    findItems: InvoiceItem.findAll,
    findPayment: Payment.findOne,
    createPayment: Payment.create,
    findByUuid: repo.findByUuid,
  }
  const created = []
  const itemReads = []
  sequelize.transaction = async callback => callback(transaction)
  Invoice.findAll = async options => {
    assert.equal(options.transaction, transaction)
    assert.equal(options.lock, transaction.LOCK.UPDATE)
    return invoices
  }
  InvoiceItem.findAll = async options => {
    assert.equal(options.transaction, transaction)
    itemReads.push(options.where.invoice_id)
    return [{ qty: 1, unit_price: 10_000_000 }]
  }
  Payment.findOne = async () => null
  Payment.create = async (payment, options) => {
    assert.equal(options.transaction, transaction)
    created.push(payment)
  }
  repo.findByUuid = async uuid => ({
    ...invoices.find(invoice => invoice.uuid === uuid),
    payments: created.filter(payment => payment.invoice_id === invoices.find(invoice => invoice.uuid === uuid).id),
  })
  try {
    await run({ created, itemReads })
  } finally {
    sequelize.transaction = original.transaction
    Invoice.findAll = original.findInvoices
    InvoiceItem.findAll = original.findItems
    Payment.findOne = original.findPayment
    Payment.create = original.createPayment
    repo.findByUuid = original.findByUuid
  }
}

function entry(invoice, amount, taxPercent, pphPercent, method = 'transfer') {
  return {
    invoice_uuid: invoice.uuid,
    method,
    amount,
    tax_percent: taxPercent,
    pph_percent: pphPercent,
  }
}

test('pelunasan massal menghitung pajak baru per invoice dan mempertahankan pajak yang sudah aktif', async () => {
  const noTax = makeInvoice(1, { paid_amount: 2_000_000 })
  const alreadyTaxed = makeInvoice(2, {
    tax_percent: 1.1,
    pph_percent: 2,
    tax_amount: 110_000,
    pph_amount: 200_000,
    total_amount: 9_910_000,
    paid_amount: 1_000_000,
  })
  await withBulkStubs([noTax, alreadyTaxed], async ({ created, itemReads }) => {
    const result = await recordBulkPayments({
      payment_date: todayDateOnly(),
      payments: [entry(noTax, 7_910_000, 1.1, 2), entry(alreadyTaxed, 8_910_000, 1.1, 2, 'cash')],
    }, { id: 5 })
    assert.deepEqual(created.map(payment => payment.amount), [7_910_000, 8_910_000])
    assert.deepEqual(created.map(payment => payment.method), ['transfer', 'cash'])
    assert.deepEqual(itemReads, [noTax.id])
    assert.deepEqual(result.map(invoice => invoice.total_amount), [9_910_000, 9_910_000])
    assert.ok(result.every(invoice => invoice.status === STATUS.PAID && invoice.remaining_amount === 0))
    assert.equal(result[0].tax_amount, 110_000)
    assert.equal(result[0].pph_amount, 200_000)
    assert.equal(result[0].settlement_date, todayDateOnly())
  })
})

test('pelunasan massal menolak opsi pajak yang membuat netto di bawah pembayaran lama', async () => {
  const invoice = makeInvoice(3, { paid_amount: 9_500_000 })
  await withBulkStubs([invoice], async ({ created }) => {
    await assert.rejects(
      recordBulkPayments({ payment_date: todayDateOnly(), payments: [entry(invoice, 100_000, 0, 10)] }),
      /lebih kecil dari pembayaran yang sudah tercatat/,
    )
    assert.equal(created.length, 0)
    assert.equal(invoice.status, STATUS.OUTSTANDING)
    assert.equal(invoice.pph_percent, 0)
  })
})

test('pelunasan massal dapat menonaktifkan pajak yang sebelumnya aktif', async () => {
  const invoice = makeInvoice(5, {
    tax_percent: 1.1,
    pph_percent: 2,
    tax_amount: 110_000,
    pph_amount: 200_000,
    total_amount: 9_910_000,
    paid_amount: 1_000_000,
  })
  await withBulkStubs([invoice], async ({ created, itemReads }) => {
    const [result] = await recordBulkPayments({
      payment_date: todayDateOnly(),
      payments: [entry(invoice, 9_000_000, 0, 0)],
    })
    assert.deepEqual(itemReads, [invoice.id])
    assert.equal(created[0].amount, 9_000_000)
    assert.equal(result.tax_percent, 0)
    assert.equal(result.pph_percent, 0)
    assert.equal(result.tax_amount, 0)
    assert.equal(result.pph_amount, 0)
    assert.equal(result.total_amount, 10_000_000)
    assert.equal(result.status, STATUS.PAID)
  })
})

test('pelunasan massal menolak nominal popup yang sudah tidak sesuai data terbaru', async () => {
  const invoice = makeInvoice(4, { paid_amount: 2_000_000 })
  await withBulkStubs([invoice], async ({ created, itemReads }) => {
    await assert.rejects(
      recordBulkPayments({ payment_date: todayDateOnly(), payments: [entry(invoice, 8_000_000, 1.1, 2)] }),
      /Nominal pelunasan invoice .* berubah/,
    )
    assert.deepEqual(itemReads, [invoice.id])
    assert.equal(created.length, 0)
  })
})
