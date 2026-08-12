'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  createInvoiceSchema,
  updateInvoiceSchema,
} = require('../src/validators/invoice.validator')

function invoiceItem(qty) {
  return {
    uuid: '0d666175-2974-40ea-9821-834da654a8d2',
    fleet_label: 'Pengiriman',
    description: 'Plat Kapal 16 x 24 , 38 x 12192',
    qty,
    unit: 'Ton',
    unit_price: 1400000,
    sort_order: 0,
  }
}

test('create invoice mempertahankan qty pengiriman sampai 4 desimal', () => {
  const { value, error } = createInvoiceSchema.validate({
    customer_id: 1,
    invoice_date: '2026-08-12',
    due_date: '2026-08-12',
    service_type: 'delivery',
    delivery_pricing_mode: 'shipment',
    payment_method: 'cash',
    items: [invoiceItem(14.932)],
  })

  assert.equal(error, undefined)
  assert.equal(value.items[0].qty, 14.932)
})

test('update invoice tidak membulatkan qty 14.9320 menjadi 14.93', () => {
  const { value, error } = updateInvoiceSchema.validate({
    items: [invoiceItem(14.932)],
  })

  assert.equal(error, undefined)
  assert.equal(value.items[0].qty, 14.932)
})

test('perbaikan presisi tidak mengubah batas minimum qty invoice', () => {
  const { error } = updateInvoiceSchema.validate({
    items: [invoiceItem(0.0099)],
  })

  assert.ok(error)
  assert.match(error.message, /greater than or equal to 0\.01/)
})
