'use strict'

const { StockItem, StockReceiptItem, StockReceipt, StockDisbursement, Customer } = require('../models')
const repo          = require('../repositories/stockItem.repository')
const {
  NotFoundError,
  ConflictError,
} = require('../utils/AppError')
const { round2 } = require('../utils/stockBalance')

/**
 * Hitung level stok berdasarkan current vs peak_stock.
 *   0              → 'empty'
 *   <  25% peak    → 'low'
 *   <  50% peak    → 'medium'
 *   >= 50% peak    → 'high'
 *   peak=0         → 'unknown' (belum pernah ada penerimaan)
 */
function computeStockLevel(current, peak) {
  const cur = Number(current) || 0
  const pk  = Number(peak)    || 0
  if (cur <= 0)  return 'empty'
  if (pk  <= 0)  return 'unknown'
  const ratio = cur / pk
  if (ratio < 0.25) return 'low'
  if (ratio < 0.50) return 'medium'
  return 'high'
}

function decorate(item) {
  const plain = typeof item.get === 'function' ? item.get({ plain: true }) : item
  plain.current_stock = Number(plain.current_stock || 0)
  plain.peak_stock    = Number(plain.peak_stock    || 0)
  plain.stock_level   = computeStockLevel(plain.current_stock, plain.peak_stock)
  return plain
}

async function list(params) {
  const { rows, count } = await repo.list(params)
  return { rows: rows.map(decorate), count }
}

async function getByUuid(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Stock item tidak ditemukan.')
  return decorate(item)
}

async function create(payload, actor) {
  const dupe = await repo.findByCode(payload.code)
  if (dupe) throw new ConflictError('Kode stock item sudah digunakan.')

  const item = await StockItem.create({
    ...payload,
    current_stock: 0,
    peak_stock:    0,
    created_by:    actor?.id || null,
  })
  return decorate(item)
}

async function update(uuid, payload) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Stock item tidak ditemukan.')

  if (payload.code && payload.code !== item.code) {
    const dupe = await repo.findByCode(payload.code)
    if (dupe && dupe.id !== item.id) {
      throw new ConflictError('Kode stock item sudah digunakan.')
    }
  }

  await item.update(payload)
  return decorate(item)
}

async function toggleActive(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Stock item tidak ditemukan.')
  await item.update({ is_active: !item.is_active })
  return decorate(item)
}

/**
 * Distinct categories for a stock item with available qty.
 * Pass customerUuid to scope to a specific customer; omit for global totals.
 */
async function getItemCategories(uuid, customerUuid) {
  const si = await repo.findByUuid(uuid)
  if (!si) throw new NotFoundError('Stock item tidak ditemukan.')

  let customerId = null
  if (customerUuid) {
    const c = await Customer.findOne({ where: { uuid: customerUuid }, attributes: ['id'] })
    if (!c) throw new NotFoundError('Customer tidak ditemukan.')
    customerId = c.id
  }

  const receiptItems = await StockReceiptItem.findAll({
    where:   { stock_item_id: si.id },
    include: customerId != null
      ? [{ model: StockReceipt, as: 'receipt', where: { customer_id: customerId }, required: true, attributes: [] }]
      : [],
    attributes: ['kategori_name', 'qty'],
  })

  const disbWhere = { stock_item_id: si.id }
  if (customerId != null) disbWhere.customer_id = customerId

  const disbursements = await StockDisbursement.findAll({
    where:      disbWhere,
    attributes: ['kategori_name', 'qty'],
    paranoid:   true,
  })

  const totals = new Map()
  for (const ri of receiptItems) {
    const key   = ri.kategori_name || null
    const entry = totals.get(key) || { kategori_name: key, total_in: 0, total_out: 0 }
    entry.total_in = round2(entry.total_in + Number(ri.qty || 0))
    totals.set(key, entry)
  }
  for (const d of disbursements) {
    const key   = d.kategori_name || null
    const entry = totals.get(key) || { kategori_name: key, total_in: 0, total_out: 0 }
    entry.total_out = round2(entry.total_out + Number(d.qty || 0))
    totals.set(key, entry)
  }

  const categories = Array.from(totals.values())
    .map(e => ({ kategori_name: e.kategori_name, available_qty: round2(e.total_in - e.total_out) }))
    .sort((a, b) => (a.kategori_name || '').localeCompare(b.kategori_name || ''))

  return { unit: si.unit, categories }
}

async function remove(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Stock item tidak ditemukan.')
  if (Number(item.current_stock) !== 0) {
    throw new ConflictError('Stock item masih memiliki saldo (sisa stock). Tidak dapat dihapus.')
  }
  const [receiptCount, disbursementCount] = await Promise.all([
    StockReceiptItem.count({ where: { stock_item_id: item.id } }),
    StockDisbursement.count({ where: { stock_item_id: item.id } }),
  ])
  if (receiptCount + disbursementCount > 0) {
    throw new ConflictError('Stock item sudah memiliki riwayat transaksi. Nonaktifkan barang agar riwayat stok tetap tercatat.')
  }
  await item.destroy()
}

module.exports = { computeStockLevel, decorate, list, getByUuid, create, update, toggleActive, remove, getItemCategories }
