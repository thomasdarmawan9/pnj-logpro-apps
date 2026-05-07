'use strict'

const { Op } = require('sequelize')
const {
  StockItem,
  StockReceipt,
  StockReceiptItem,
  StockDisbursement,
  Customer,
  DeliveryOrder,
} = require('../models')
const { NotFoundError } = require('../utils/AppError')
const { computeStockLevel } = require('./stockItem.service')
const { round2 } = require('../utils/stockBalance')

const PERIODS = ['this_month', 'last_month', 'all', 'custom']

function periodToRange(period) {
  if (!period || period === 'all' || period === 'custom') return null
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()

  switch (period) {
    case 'this_month':
      return {
        from: new Date(year, month, 1),
        to:   new Date(year, month + 1, 0, 23, 59, 59),
      }
    case 'last_month':
      return {
        from: new Date(year, month - 1, 1),
        to:   new Date(year, month, 0, 23, 59, 59),
      }
    default: return null
  }
}

/**
 * Recap per stock item: kombinasi receipt + disbursement, sorted by date,
 * dengan running balance. Mirip behavior FE GetStockRecap.calculateRunningBalance.
 *
 * Filter customerId optional. Period filter: balance dihitung dari awal
 * (lifetime) lalu di-trim ke period.
 */
async function recap(params) {
  const { stock_item_uuid, customer_uuid, period, from, to } = params

  const stockItem = await StockItem.findOne({ where: { uuid: stock_item_uuid } })
  if (!stockItem) throw new NotFoundError('Stock item tidak ditemukan.')

  let customerId = null
  if (customer_uuid) {
    const c = await Customer.findOne({ where: { uuid: customer_uuid }, attributes: ['id'] })
    if (!c) {
      return {
        stock_item: decorateItem(stockItem),
        rows:       [],
        totals:     {
          total_in: 0, total_out: 0, ending_balance: 0,
          lifetime_in: 0, lifetime_out: 0,
          current_balance: round2(Number(stockItem.current_stock || 0)),
        },
      }
    }
    customerId = c.id
  }

  // 1) Ambil seluruh riwayat untuk hitung running balance dari nol.
  const receiptItems = await StockReceiptItem.findAll({
    where: { stock_item_id: stockItem.id },
    include: [{
      model:    StockReceipt,
      as:       'receipt',
      where:    customerId ? { customer_id: customerId } : undefined,
      required: true,
    }],
  })

  const disbursements = await StockDisbursement.findAll({
    where: {
      stock_item_id: stockItem.id,
      ...(customerId ? { customer_id: customerId } : {}),
    },
    include: [{
      model:      DeliveryOrder,
      as:         'delivery_order',
      attributes: ['id', 'uuid', 'sj_number', 'driver_name_manual', 'destination'],
      required:   false,
    }],
  })

  const rows = []

  for (const ri of receiptItems) {
    const r = ri.receipt
    rows.push({
      date:               r.receipt_date,
      type:               'receipt',
      reference_number:   r.receipt_number,
      sj_or_spal:         r.document_number || r.receipt_number,
      supplier_or_driver: r.supplier_name || '—',
      vehicle_plate:      null,
      destination:        null,
      qty_in:             round2(Number(ri.qty)),
      qty_out:            null,
      balance:            0,
      notes:              ri.notes,
      kategori_name:      ri.kategori_name || null,
    })
  }

  for (const d of disbursements) {
    const sjLabel = d.sj_number_manual
      ? `SJ ${d.sj_number_manual}`
      : (d.delivery_order?.sj_number || d.disbursement_number)
    const driver = d.driver_name || d.delivery_order?.driver_name_manual || '—'
    rows.push({
      date:               d.disbursement_date,
      type:               'disbursement',
      reference_number:   d.disbursement_number,
      sj_or_spal:         sjLabel,
      supplier_or_driver: driver,
      vehicle_plate:      d.vehicle_plate,
      destination:        d.destination || d.delivery_order?.destination || null,
      qty_in:             null,
      qty_out:            round2(Number(d.qty)),
      balance:            0,
      notes:              d.notes,
      kategori_name:      null,
    })
  }

  // Sort by date ASC. Tiebreaker: receipt sebelum disbursement pada tanggal sama.
  rows.sort((a, b) => {
    const da = new Date(a.date).getTime()
    const db = new Date(b.date).getTime()
    if (da !== db) return da - db
    if (a.type === b.type) return 0
    return a.type === 'receipt' ? -1 : 1
  })

  let balance  = 0
  let totalIn  = 0
  let totalOut = 0
  const withBalance = rows.map(row => {
    if (row.qty_in)  { balance = round2(balance + row.qty_in);  totalIn  = round2(totalIn  + row.qty_in)  }
    if (row.qty_out) { balance = round2(balance - row.qty_out); totalOut = round2(totalOut + row.qty_out) }
    return { ...row, balance }
  })

  // 2) Apply period filter (in-place trim).
  let filtered = withBalance
  let periodRange = null
  if (from || to) periodRange = { from: from || null, to: to || null }
  else            periodRange = periodToRange(period)

  if (periodRange && (periodRange.from || periodRange.to)) {
    filtered = withBalance.filter(row => {
      const d = new Date(row.date).getTime()
      if (periodRange.from && d < new Date(periodRange.from).getTime()) return false
      if (periodRange.to   && d > new Date(periodRange.to).getTime())   return false
      return true
    })
  }

  // Totals re-computed dari filtered rows (in-period).
  const periodTotalIn  = round2(filtered.reduce((s, r) => s + (r.qty_in  || 0), 0))
  const periodTotalOut = round2(filtered.reduce((s, r) => s + (r.qty_out || 0), 0))

  return {
    stock_item: decorateItem(stockItem),
    rows:       filtered,
    totals: {
      total_in:        periodTotalIn,
      total_out:       periodTotalOut,
      ending_balance:  filtered.length > 0 ? filtered[filtered.length - 1].balance : balance,
      lifetime_in:     totalIn,
      lifetime_out:    totalOut,
      current_balance: round2(Number(stockItem.current_stock || 0)),
    },
  }
}

/**
 * Summary: snapshot semua stock item — code, name, current_stock, peak_stock,
 * stock_level. Untuk dashboard/list.
 */
async function summary(params) {
  const where = {}
  if (params.search) {
    where[Op.or] = [
      { code: { [Op.iLike]: `%${params.search}%` } },
      { name: { [Op.iLike]: `%${params.search}%` } },
    ]
  }
  if (params.category) where.category = params.category
  if (typeof params.is_active === 'boolean') where.is_active = params.is_active

  const items = await StockItem.findAll({
    where,
    order: [['code', 'ASC']],
  })

  return items.map(decorateItem)
}

function decorateItem(item) {
  const plain = typeof item.get === 'function' ? item.get({ plain: true }) : item
  plain.current_stock = Number(plain.current_stock || 0)
  plain.peak_stock    = Number(plain.peak_stock    || 0)
  plain.stock_level   = computeStockLevel(plain.current_stock, plain.peak_stock)
  return plain
}

module.exports = { PERIODS, recap, summary, periodToRange }
