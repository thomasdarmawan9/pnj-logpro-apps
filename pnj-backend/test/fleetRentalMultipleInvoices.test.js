'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')

process.env.DB_HOST ||= '127.0.0.1'
process.env.DB_NAME ||= 'test'
process.env.DB_USER ||= 'test'
process.env.DB_PASSWORD ||= 'test'
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret'
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret'

const { InvoiceItem, FleetRentalCompletion } = require('../src/models')
const repo = require('../src/repositories/fleet.repository')
const fleetService = require('../src/services/fleet.service')

test('armada tetap berstatus rented selama salah satu dari beberapa invoice sewanya masih aktif', async () => {
  const original = {
    list: repo.list,
    findItems: InvoiceItem.findAll,
    findCompletions: FleetRentalCompletion.findAll,
  }
  const invoiceItems = [
    { id: 11, fleet_id: 7, invoice_id: 101, period_start: '2026-10-01', period_end: '2026-10-31', invoice: { invoice_number: 'INV-101' } },
    { id: 12, fleet_id: 7, invoice_id: 102, period_start: '2026-10-01', period_end: '2026-11-30', invoice: { invoice_number: 'INV-102' } },
  ]
  let completed = []
  repo.list = async () => ({ rows: [{ id: 7, name: 'Kendaraan A', plate_number: 'B 1234 AB', status: 'active' }], count: 1 })
  InvoiceItem.findAll = async () => invoiceItems
  FleetRentalCompletion.findAll = async () => completed
  try {
    const first = await fleetService.list({ page: 1, limit: 20 })
    assert.equal(first.rows[0].rental_status, 'rented')
    assert.equal(first.rows[0].rental_invoice_id, 101)

    completed = [{ invoice_item_id: 11, fleet_id: 7 }]
    const second = await fleetService.list({ page: 1, limit: 20 })
    assert.equal(second.rows[0].rental_status, 'rented')
    assert.equal(second.rows[0].rental_invoice_id, 102)
    assert.equal(second.rows[0].rental_invoice_number, 'INV-102')
  } finally {
    repo.list = original.list
    InvoiceItem.findAll = original.findItems
    FleetRentalCompletion.findAll = original.findCompletions
  }
})
