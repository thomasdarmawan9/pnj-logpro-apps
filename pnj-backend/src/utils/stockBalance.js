'use strict'

const { ConflictError } = require('./AppError')

function round2(n) {
  return Math.round(Number(n) * 100) / 100
}

/**
 * Apply delta ke current_stock & peak_stock dari instance StockItem.
 *   delta positif → increment (receipt create / disbursement delete)
 *   delta negatif → decrement (receipt delete / disbursement create)
 * Block kalau hasilnya negatif.
 *
 * Caller WAJIB sudah lock row stockItem (SELECT ... FOR UPDATE) sebelum panggil
 * untuk menghindari race antar transaksi.
 */
async function applyStockDelta(stockItem, delta, t) {
  const current = Number(stockItem.current_stock || 0)
  const peak    = Number(stockItem.peak_stock    || 0)
  const next    = round2(current + Number(delta))

  if (next < 0) {
    throw new ConflictError(
      `Stok ${stockItem.code} (${stockItem.name}) tidak mencukupi. ` +
      `Tersedia: ${current} ${stockItem.unit}, dibutuhkan pengurangan: ${Math.abs(delta)} ${stockItem.unit}.`,
      { code: 'INSUFFICIENT_STOCK' },
    )
  }

  const updates = { current_stock: next }
  if (next > peak) updates.peak_stock = next

  await stockItem.update(updates, { transaction: t })
  return next
}

module.exports = { applyStockDelta, round2 }
