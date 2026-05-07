'use strict'

const {
  sequelize,
  StockReceipt,
  StockReceiptItem,
  StockItem,
  Customer,
} = require('../models')
const repo = require('../repositories/stockReceipt.repository')
const {
  NotFoundError,
  ConflictError,
} = require('../utils/AppError')
const { generateStockReceiptNumber } = require('../utils/numberGenerator')
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

/**
 * Map StockReceipt instance → plain object dengan field numeric (Sequelize DECIMAL
 * → string by default). Sesuaikan supaya FE dapat number langsung.
 */
function decorate(row) {
  if (!row) return row
  const plain = typeof row.get === 'function' ? row.get({ plain: true }) : row

  if (plain.creator) {
    plain.created_by_name = plain.creator.name
  } else {
    plain.created_by_name = null
  }
  delete plain.creator

  if (Array.isArray(plain.items)) {
    plain.items = plain.items.map(it => ({
      ...it,
      qty: Number(it.qty || 0),
      stock_item: it.stock_item ? {
        ...it.stock_item,
        current_stock: Number(it.stock_item.current_stock || 0),
        peak_stock:    Number(it.stock_item.peak_stock    || 0),
      } : null,
    }))
  }

  return plain
}

/**
 * Resolve stock_item_uuid → id pada items array. Locks rows untuk update.
 */
async function resolveStockItems(items, t) {
  const uuids = [...new Set(items.map(i => i.stock_item_uuid).filter(Boolean))]
  const ids   = [...new Set(items.map(i => i.stock_item_id).filter(Boolean))]
  const where = {}
  if (uuids.length > 0 && ids.length > 0) {
    where[require('sequelize').Op.or] = [{ uuid: uuids }, { id: ids }]
  } else if (uuids.length > 0) {
    where.uuid = uuids
  } else {
    where.id = ids
  }

  const rows = await StockItem.findAll({
    where,
    transaction: t,
    lock:        t.LOCK.UPDATE,
  })
  const byUuid = new Map(rows.map(r => [r.uuid, r]))
  const byId   = new Map(rows.map(r => [Number(r.id), r]))

  for (const u of uuids) {
    if (!byUuid.has(u)) {
      throw new NotFoundError(`Stock item dengan uuid ${u} tidak ditemukan.`)
    }
  }
  for (const id of ids) {
    if (!byId.has(Number(id))) {
      throw new NotFoundError(`Stock item dengan id ${id} tidak ditemukan.`)
    }
  }
  for (const it of rows) {
    if (!it.is_active) {
      throw new ConflictError(`Stock item ${it.code} tidak aktif. Tidak bisa digunakan.`)
    }
  }
  return { byUuid, byId, rows }
}

function getResolvedStockItem(stockItemMap, itemPayload) {
  if (itemPayload.stock_item_uuid) return stockItemMap.byUuid.get(itemPayload.stock_item_uuid)
  return stockItemMap.byId.get(Number(itemPayload.stock_item_id))
}

async function resolveCustomerRef(payload, t) {
  if (payload.customer_uuid) {
    const cust = await Customer.findOne({
      where:       { uuid: payload.customer_uuid },
      transaction: t,
    })
    if (!cust) throw new NotFoundError('Customer tidak ditemukan.')
    return cust
  }
  if (payload.customer_id) {
    const cust = await Customer.findByPk(payload.customer_id, { transaction: t })
    if (!cust) throw new NotFoundError('Customer tidak ditemukan.')
    return cust
  }
  return null
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
  if (!row) throw new NotFoundError('Stock receipt tidak ditemukan.')
  return decorate(row)
}

// ── CREATE ─────────────────────────────────────────────────────────────────
async function create(payload, actor) {
  const result = await sequelize.transaction(async (t) => {
    const customer = await resolveCustomerRef(payload, t)
    const customerId = customer?.id || null

    const stockItemMap  = await resolveStockItems(payload.items, t)
    const receiptNumber = await generateStockReceiptNumber(t)

    const receipt = await StockReceipt.create({
      receipt_number:  receiptNumber,
      receipt_date:    payload.receipt_date,
      supplier_name:   payload.supplier_name || null,
      document_number: payload.document_number || null,
      customer_id:     customerId,
      notes:           payload.notes || null,
      created_by:      actor?.id || null,
    }, { transaction: t })

    // Aggregate qty per stock_item supaya update stock cuma sekali per item.
    const aggregateByItemId = new Map()
    const itemRows = payload.items.map((it) => {
      const stockItem = getResolvedStockItem(stockItemMap, it)
      const qty       = round2(it.qty)
      aggregateByItemId.set(
        stockItem.id,
        round2((aggregateByItemId.get(stockItem.id) || 0) + qty),
      )
      return {
        receipt_id:    receipt.id,
        stock_item_id: stockItem.id,
        qty,
        kategori_name: it.kategori_name || null,
        notes:         it.notes || null,
      }
    })

    await StockReceiptItem.bulkCreate(itemRows, { transaction: t })

    // Apply stock increments per item.
    const stockItemById = new Map(
      stockItemMap.rows.map(s => [s.id, s]),
    )
    for (const [stockItemId, totalQty] of aggregateByItemId.entries()) {
      const stockItem = stockItemById.get(stockItemId)
      await applyStockDelta(stockItem, +totalQty, t)
    }

    return repo.findByUuid(receipt.uuid, { transaction: t })
  })
  return decorate(result)
}

// ── UPDATE ─────────────────────────────────────────────────────────────────
/**
 * Edit policy:
 *  - Header fields (date/supplier/document/customer/notes) bebas diubah.
 *  - Items boleh diganti seluruhnya. Stock di-recompute:
 *      reverse old items → apply new items.
 *  - Block kalau hasilnya bikin stock negatif.
 */
async function update(uuid, payload, actor) {
  const result = await sequelize.transaction(async (t) => {
    const receipt = await StockReceipt.findOne({
      where:       { uuid },
      include:     [{ model: StockReceiptItem, as: 'items' }],
      transaction: t,
    })
    if (!receipt) throw new NotFoundError('Stock receipt tidak ditemukan.')

    const updates = {}
    if ('receipt_date'    in payload) updates.receipt_date    = payload.receipt_date
    if ('supplier_name'   in payload) updates.supplier_name   = payload.supplier_name || null
    if ('document_number' in payload) updates.document_number = payload.document_number || null
    if ('notes'           in payload) updates.notes           = payload.notes || null

    if ('customer_uuid' in payload) {
      const cust = await resolveCustomerRef(payload, t)
      updates.customer_id = cust?.id || null
    }
    if ('customer_id' in payload) {
      const cust = await resolveCustomerRef(payload, t)
      updates.customer_id = cust?.id || null
    }

    // Replace items — recompute stock.
    if (payload.items) {
      const oldItems = receipt.items || []
      const newStockItemMap = await resolveStockItems(payload.items, t)

      // Lock juga stock items dari oldItems yang belum ter-lock (item yang
      // dihapus dari payload).
      const lockedIds = new Set(newStockItemMap.rows.map(s => s.id))
      const oldItemIds = [...new Set(oldItems.map(o => o.stock_item_id))]
        .filter(id => !lockedIds.has(id))

      if (oldItemIds.length > 0) {
        const lockedOld = await StockItem.findAll({
          where:       { id: oldItemIds },
          transaction: t,
          lock:        t.LOCK.UPDATE,
        })
        for (const s of lockedOld) {
          newStockItemMap.byUuid.set(s.uuid, s)
          newStockItemMap.byId.set(Number(s.id), s)
          newStockItemMap.rows.push(s)
        }
      }

      const stockById = new Map(
        newStockItemMap.rows.map(s => [s.id, s]),
      )

      // Combine deltas → single update per stock item.
      const finalDeltas = new Map()
      // Step 1: reverse old (subtract).
      for (const oi of oldItems) {
        finalDeltas.set(
          oi.stock_item_id,
          round2((finalDeltas.get(oi.stock_item_id) || 0) - Number(oi.qty)),
        )
      }
      // Step 2: apply new (add).
      for (const ni of payload.items) {
        const si = getResolvedStockItem(newStockItemMap, ni)
        finalDeltas.set(
          si.id,
          round2((finalDeltas.get(si.id) || 0) + Number(ni.qty)),
        )
      }

      for (const [id, delta] of finalDeltas) {
        const stockItem = stockById.get(id)
        if (!stockItem) {
          throw new ConflictError(
            `Stock item lama (id=${id}) tidak dapat di-load. Tidak bisa update receipt.`,
          )
        }
        if (Math.abs(delta) > 0) {
          await applyStockDelta(stockItem, delta, t)
        }
      }

      // Replace items rows.
      await StockReceiptItem.destroy({
        where:       { receipt_id: receipt.id },
        transaction: t,
        force:       true,
      })

      const newItemRows = payload.items.map((it) => {
        const si = getResolvedStockItem(newStockItemMap, it)
        return {
          receipt_id:    receipt.id,
          stock_item_id: si.id,
          qty:           round2(it.qty),
          kategori_name: it.kategori_name || null,
          notes:         it.notes || null,
        }
      })
      await StockReceiptItem.bulkCreate(newItemRows, { transaction: t })
    }

    if (Object.keys(updates).length > 0) {
      await receipt.update(updates, { transaction: t })
    }

    return repo.findByUuid(receipt.uuid, { transaction: t })
  })
  return decorate(result)
}

// ── DELETE ─────────────────────────────────────────────────────────────────
/**
 * Hapus receipt → reverse stock (subtract qty per item).
 * Block kalau ada item yang stoknya akan jadi negatif.
 */
async function remove(uuid) {
  return sequelize.transaction(async (t) => {
    const receipt = await StockReceipt.findOne({
      where:       { uuid },
      include:     [{ model: StockReceiptItem, as: 'items' }],
      transaction: t,
    })
    if (!receipt) throw new NotFoundError('Stock receipt tidak ditemukan.')

    const items = receipt.items || []
    if (items.length > 0) {
      const stockItemIds = [...new Set(items.map(i => i.stock_item_id))]
      const stockItems = await StockItem.findAll({
        where:       { id: stockItemIds },
        transaction: t,
        lock:        t.LOCK.UPDATE,
      })
      const byId = new Map(stockItems.map(s => [s.id, s]))

      // Aggregate qty per item.
      const deltaById = new Map()
      for (const it of items) {
        deltaById.set(
          it.stock_item_id,
          round2((deltaById.get(it.stock_item_id) || 0) - Number(it.qty)),
        )
      }

      for (const [id, delta] of deltaById) {
        const si = byId.get(id)
        if (!si) {
          throw new ConflictError(
            `Stock item (id=${id}) tidak ditemukan. Tidak bisa rollback.`,
          )
        }
        await applyStockDelta(si, delta, t)
      }
    }

    // Hard-delete items, soft-delete header.
    await StockReceiptItem.destroy({
      where:       { receipt_id: receipt.id },
      transaction: t,
      force:       true,
    })
    await receipt.destroy({ transaction: t })
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
