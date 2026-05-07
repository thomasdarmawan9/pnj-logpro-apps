'use strict'

const { StockItem } = require('../models')
const repo          = require('../repositories/stockItem.repository')
const {
  NotFoundError,
  ConflictError,
} = require('../utils/AppError')

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

async function remove(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Stock item tidak ditemukan.')
  if (Number(item.current_stock) !== 0) {
    throw new ConflictError('Stock item masih memiliki saldo. Tidak dapat dihapus.')
  }
  await item.destroy()
}

module.exports = { computeStockLevel, decorate, list, getByUuid, create, update, toggleActive, remove }
