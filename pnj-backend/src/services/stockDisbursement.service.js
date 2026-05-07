'use strict'

const {
  sequelize,
  StockDisbursement,
  StockItem,
  Customer,
  DeliveryOrder,
} = require('../models')
const repo = require('../repositories/stockDisbursement.repository')
const {
  NotFoundError,
  ConflictError,
} = require('../utils/AppError')
const { generateStockDisbursementNumber } = require('../utils/numberGenerator')
const { applyStockDelta, round2 } = require('../utils/stockBalance')

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

function decorate(row) {
  if (!row) return row
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row

  if (plain.creator) {
    plain.created_by_name = plain.creator.name
  } else {
    plain.created_by_name = null
  }
  delete plain.creator

  plain.qty = Number(plain.qty || 0)

  if (plain.stock_item) {
    plain.stock_item.current_stock = Number(plain.stock_item.current_stock || 0)
    plain.stock_item.peak_stock    = Number(plain.stock_item.peak_stock    || 0)
  }

  return plain
}

/**
 * Resolve stock_item_uuid → StockItem (locked).
 */
async function resolveStockItem(ref, t) {
  const si = await StockItem.findOne({
    where:       ref.stock_item_uuid ? { uuid: ref.stock_item_uuid } : { id: ref.stock_item_id },
    transaction: t,
    lock:        t.LOCK.UPDATE,
  })
  if (!si) throw new NotFoundError('Stock item tidak ditemukan.')
  if (!si.is_active) {
    throw new ConflictError(`Stock item ${si.code} tidak aktif. Tidak bisa digunakan.`)
  }
  return si
}

async function resolveCustomer(ref, t) {
  if (!ref.customer_uuid && !ref.customer_id) return null
  const c = ref.customer_uuid
    ? await Customer.findOne({ where: { uuid: ref.customer_uuid }, transaction: t })
    : await Customer.findByPk(ref.customer_id, { transaction: t })
  if (!c) throw new NotFoundError('Customer tidak ditemukan.')
  return c
}

async function resolveDeliveryOrder(ref, t) {
  if (!ref.delivery_order_uuid && !ref.delivery_order_id) return null
  const sj = ref.delivery_order_uuid
    ? await DeliveryOrder.findOne({ where: { uuid: ref.delivery_order_uuid }, transaction: t })
    : await DeliveryOrder.findByPk(ref.delivery_order_id, { transaction: t })
  if (!sj) throw new NotFoundError('Surat Jalan tidak ditemukan.')
  return sj
}

// ── LIST & DETAIL ──────────────────────────────────────────────────────────
async function list(params) {
  const {
    page, limit, search,
    customer_uuid, stock_item_uuid,
    period, from, to,
  } = params

  let customerId  = null
  let stockItemId = null
  if (customer_uuid) {
    const c = await Customer.findOne({ where: { uuid: customer_uuid }, attributes: ['id'] })
    if (!c) return { rows: [], count: 0 }
    customerId = c.id
  }
  if (stock_item_uuid) {
    const si = await StockItem.findOne({ where: { uuid: stock_item_uuid }, attributes: ['id'] })
    if (!si) return { rows: [], count: 0 }
    stockItemId = si.id
  }

  let periodRange = null
  if (from || to) {
    periodRange = { from: from || null, to: to || null }
  } else {
    periodRange = periodToRange(period)
  }

  const { rows, count } = await repo.list({
    page, limit, search,
    customerId, stockItemId, periodRange,
  })
  return { rows: rows.map(decorate), count }
}

async function getByUuid(uuid) {
  const row = await repo.findByUuid(uuid)
  if (!row) throw new NotFoundError('Stock disbursement tidak ditemukan.')
  return decorate(row)
}

// ── CREATE ─────────────────────────────────────────────────────────────────
async function create(payload, actor) {
  const result = await sequelize.transaction(async (t) => {
    const stockItem = await resolveStockItem(payload, t)
    const customer  = await resolveCustomer(payload, t)
    const sj        = await resolveDeliveryOrder(payload, t)

    // Subtract stock — block kalau insufficient.
    await applyStockDelta(stockItem, -round2(payload.qty), t)

    const disbNumber = await generateStockDisbursementNumber(t)

    const disb = await StockDisbursement.create({
      disbursement_number:   disbNumber,
      disbursement_date:     payload.disbursement_date,
      stock_item_id:         stockItem.id,
      qty:                   round2(payload.qty),
      delivery_order_id:     sj?.id || null,
      sj_number_manual:      payload.sj_number_manual || null,
      invoice_number_manual: payload.invoice_number_manual || null,
      driver_name:           payload.driver_name || null,
      vehicle_plate:         payload.vehicle_plate || null,
      destination:           payload.destination || null,
      customer_id:           customer?.id || null,
      notes:                 payload.notes || null,
      created_by:            actor?.id || null,
    }, { transaction: t })

    return repo.findByUuid(disb.uuid, { transaction: t })
  })
  return decorate(result)
}

// ── UPDATE ─────────────────────────────────────────────────────────────────
/**
 * Edit policy: bebas edit. Kalau qty atau stock_item berubah, stock di-recompute:
 *   reverse old (add back) → apply new (subtract).
 *
 * Pintas optimasi: kalau stock_item_uuid sama dgn yg sekarang DAN qty tidak
 * berubah, skip recompute.
 */
async function update(uuid, payload, actor) {
  const result = await sequelize.transaction(async (t) => {
    const disb = await StockDisbursement.findOne({
      where:       { uuid },
      transaction: t,
    })
    if (!disb) throw new NotFoundError('Stock disbursement tidak ditemukan.')

    const updates = {}
    const passthrough = [
      'disbursement_date', 'sj_number_manual', 'invoice_number_manual',
      'driver_name', 'vehicle_plate', 'destination', 'notes',
    ]
    for (const k of passthrough) {
      if (k in payload) updates[k] = payload[k] || null
    }

    if ('customer_uuid' in payload) {
      const customer = await resolveCustomer(payload, t)
      updates.customer_id = customer?.id || null
    }
    if ('customer_id' in payload) {
      const customer = await resolveCustomer(payload, t)
      updates.customer_id = customer?.id || null
    }

    if ('delivery_order_uuid' in payload) {
      const sj = await resolveDeliveryOrder(payload, t)
      updates.delivery_order_id = sj?.id || null
    }
    if ('delivery_order_id' in payload) {
      const sj = await resolveDeliveryOrder(payload, t)
      updates.delivery_order_id = sj?.id || null
    }

    // Tentukan apakah perlu stock recompute.
    const newQty = 'qty' in payload ? round2(payload.qty) : Number(disb.qty)
    let newStockItemId = disb.stock_item_id
    let newStockItem   = null
    let stockItemChanged = false

    if ('stock_item_uuid' in payload || 'stock_item_id' in payload) {
      newStockItem = await resolveStockItem(payload, t)
      if (newStockItem.id !== disb.stock_item_id) {
        stockItemChanged = true
        newStockItemId = newStockItem.id
        updates.stock_item_id = newStockItem.id
      }
    }

    const qtyChanged = 'qty' in payload && newQty !== Number(disb.qty)

    if (stockItemChanged || qtyChanged) {
      // Reverse old (add back).
      const oldStockItem = await StockItem.findByPk(disb.stock_item_id, {
        transaction: t,
        lock:        t.LOCK.UPDATE,
      })
      if (!oldStockItem) {
        throw new ConflictError('Stock item lama tidak dapat di-load.')
      }
      await applyStockDelta(oldStockItem, +Number(disb.qty), t)

      // Apply new (subtract).
      const targetStockItem = stockItemChanged ? newStockItem : oldStockItem
      await applyStockDelta(targetStockItem, -newQty, t)

      if (qtyChanged) updates.qty = newQty
    }

    if (Object.keys(updates).length > 0) {
      await disb.update(updates, { transaction: t })
    }

    return repo.findByUuid(disb.uuid, { transaction: t })
  })
  return decorate(result)
}

// ── DELETE ─────────────────────────────────────────────────────────────────
/**
 * Hapus disbursement → reverse stock (add qty kembali).
 */
async function remove(uuid) {
  return sequelize.transaction(async (t) => {
    const disb = await StockDisbursement.findOne({
      where:       { uuid },
      transaction: t,
    })
    if (!disb) throw new NotFoundError('Stock disbursement tidak ditemukan.')

    const stockItem = await StockItem.findByPk(disb.stock_item_id, {
      transaction: t,
      lock:        t.LOCK.UPDATE,
    })
    if (!stockItem) {
      throw new ConflictError(
        `Stock item (id=${disb.stock_item_id}) tidak ditemukan. Tidak bisa rollback.`,
      )
    }

    // Add stock back.
    await applyStockDelta(stockItem, +Number(disb.qty), t)

    await disb.destroy({ transaction: t })
  })
}

module.exports = {
  PERIODS,
  list,
  getByUuid,
  create,
  update,
  remove,
  decorate,
  periodToRange,
}
