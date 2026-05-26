'use strict'

const { Op } = require('sequelize')
const {
  sequelize,
  DeliveryOrder,
  Project,
  Customer,
  Fleet,
  Driver,
  Invoice,
  StockItem,
  StockReceipt,
  StockReceiptItem,
  StockDisbursement,
} = require('../models')
const repo              = require('../repositories/deliveryOrder.repository')
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} = require('../utils/AppError')
const { generateSJNumber } = require('../utils/numberGenerator')
const { generateStockDisbursementNumber } = require('../utils/numberGenerator')
const { applyStockDelta, round2 } = require('../utils/stockBalance')
const lampiranSvc = require('./lampiran.service')

const STATUS = {
  DRAFT:     'draft',
  ASSIGNED:  'assigned',
  DELIVERED: 'delivered',
  VOID:      'void',
}

const ALLOWED_TRANSITIONS = {
  [STATUS.DRAFT]:     [STATUS.ASSIGNED, STATUS.VOID],
  [STATUS.ASSIGNED]:  [STATUS.DELIVERED, STATUS.VOID],
  [STATUS.DELIVERED]: [STATUS.VOID],
  [STATUS.VOID]:      [],
}

function canTransition(current, next) {
  return (ALLOWED_TRANSITIONS[current] || []).includes(next)
}

function fleetStatusLabel(status) {
  return {
    active:   'aktif',
    inactive: 'tidak aktif',
    repair:   'perbaikan',
    sold:     'terjual',
  }[status] || status
}

function periodToRange(period) {
  if (!period || period === 'all') return null
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()
  const day   = now.getDate()

  switch (period) {
    case 'today': {
      const d = new Date(year, month, day)
      return { from: d, to: new Date(year, month, day, 23, 59, 59) }
    }
    case 'week': {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      return { from: d, to: now }
    }
    case 'month': {
      return {
        from: new Date(year, month, 1),
        to:   new Date(year, month + 1, 0, 23, 59, 59),
      }
    }
    case 'last_month': {
      return {
        from: new Date(year, month - 1, 1),
        to:   new Date(year, month, 0, 23, 59, 59),
      }
    }
    default:
      return null
  }
}

function getSJStockLines(items) {
  const aggregate = new Map()
  if (!Array.isArray(items)) return []

  for (const item of items) {
    if (item?.source_type !== 'stock') continue
    const qty = round2(item.qty || 0)
    if (qty <= 0) continue
    const kategoriName = item.stock_kategori_name || null
    const stockKey = item.stock_item_uuid || String(item.stock_item_id || '')
    if (!stockKey) continue
    const key = `${stockKey}::${kategoriName || ''}`

    const existing = aggregate.get(key) || {
      stockItemId: item.stock_item_id || null,
      stockItemUuid: item.stock_item_uuid || null,
      kategoriName,
      description: item.description || item.stock_item_name || '',
      unit: item.unit || 'pcs',
      qty: 0,
      notes: item.notes || null,
    }
    existing.qty = round2(existing.qty + qty)
    aggregate.set(key, existing)
  }

  return Array.from(aggregate.values())
}

async function resolveStockLineItems(lines, t) {
  const rows = []
  for (const line of lines) {
    const stockItem = await StockItem.findOne({
      where:       line.stockItemUuid ? { uuid: line.stockItemUuid } : { id: line.stockItemId },
      transaction: t,
      lock:        t.LOCK.UPDATE,
    })
    if (!stockItem) throw new NotFoundError('Stock item tidak ditemukan.')
    if (!stockItem.is_active) {
      throw new ConflictError(`Stock item ${stockItem.code} tidak aktif. Tidak bisa digunakan di SJ.`)
    }
    rows.push({ ...line, stockItem })
  }
  return rows
}

async function getCustomerStockBalance(customerId, stockItemId, kategoriName, t, excludeAutoForDeliveryOrderId = null) {
  const receiptQty = await StockReceiptItem.sum('qty', {
    include: [{
      model:      StockReceipt,
      as:         'receipt',
      where:      { customer_id: customerId },
      attributes: [],
      required:   true,
    }],
    where:       { stock_item_id: stockItemId, kategori_name: kategoriName || null },
    transaction: t,
  })

  const disbWhere = {
    customer_id:    customerId,
    stock_item_id:  stockItemId,
    kategori_name:  kategoriName || null,
  }
  if (excludeAutoForDeliveryOrderId) {
    disbWhere[Op.or] = [
      { delivery_order_id: { [Op.ne]: excludeAutoForDeliveryOrderId } },
      { delivery_order_id: null },
      { source_type: { [Op.ne]: 'sj_auto' } },
    ]
  }

  const disbQty = await StockDisbursement.sum('qty', {
    where:       disbWhere,
    transaction: t,
  })

  return round2(Number(receiptQty || 0) - Number(disbQty || 0))
}

async function clearAutoStockDisbursementsForSJ(sj, t) {
  const rows = await StockDisbursement.findAll({
    where:       { delivery_order_id: sj.id, source_type: 'sj_auto' },
    transaction: t,
    lock:        t.LOCK.UPDATE,
  })

  for (const row of rows) {
    const stockItem = await StockItem.findByPk(row.stock_item_id, {
      transaction: t,
      lock:        t.LOCK.UPDATE,
    })
    if (!stockItem) throw new ConflictError('Stock item lama tidak dapat di-load untuk rollback stok SJ.')
    await applyStockDelta(stockItem, Number(row.qty), t)
    await row.destroy({ transaction: t })
  }
}

async function syncAutoStockDisbursementsForSJ(sj, actor, t, context = {}) {
  await clearAutoStockDisbursementsForSJ(sj, t)

  if (sj.status !== STATUS.ASSIGNED) return
  const lines = await resolveStockLineItems(getSJStockLines(sj.items), t)
  if (lines.length === 0) return

  for (const line of lines) {
    const available = await getCustomerStockBalance(sj.customer_id, line.stockItem.id, line.kategoriName, t, sj.id)
    if (line.qty > available) {
      const categoryLabel = line.kategoriName ? ` kategori ${line.kategoriName}` : ''
      throw new ConflictError(
        `Stok customer untuk ${line.stockItem.code} (${line.stockItem.name})${categoryLabel} tidak mencukupi. ` +
        `Tersedia: ${available} ${line.stockItem.unit}, diminta: ${line.qty} ${line.stockItem.unit}.`,
        { code: 'INSUFFICIENT_CUSTOMER_STOCK' },
      )
    }
  }

  for (const line of lines) {
    await applyStockDelta(line.stockItem, -line.qty, t)
    const disbNumber = await generateStockDisbursementNumber(t)
    await StockDisbursement.create({
      disbursement_number: disbNumber,
      disbursement_date:   sj.sj_date,
      source_type:         'sj_auto',
      stock_item_id:       line.stockItem.id,
      qty:                 line.qty,
      kategori_name:       line.kategoriName || null,
      delivery_order_id:   sj.id,
      driver_name:         context.driver?.name || sj.driver_name_manual || null,
      vehicle_plate:       context.fleet?.plate_number || null,
      destination:         sj.destination || null,
      customer_id:         sj.customer_id,
      notes:               line.notes || `Otomatis dari SJ ${sj.sj_number}`,
      created_by:          actor?.id || null,
    }, { transaction: t })
  }
}

async function resolveMasters({ project_uuid, project_id, customer_uuid, customer_id, fleet_uuid, fleet_id, driver_uuid, driver_id }, t) {
  const [project, customer, fleet, driver] = await Promise.all([
    project_uuid || project_id
      ? Project.findOne({ where: project_uuid ? { uuid: project_uuid } : { id: project_id }, transaction: t })
      : null,
    customer_uuid || customer_id
      ? Customer.findOne({ where: customer_uuid ? { uuid: customer_uuid } : { id: customer_id }, transaction: t })
      : null,
    fleet_uuid || fleet_id !== undefined
      ? Fleet.findOne({ where: fleet_uuid ? { uuid: fleet_uuid } : fleet_id === 0 ? { is_tbd: true } : { id: fleet_id }, transaction: t })
      : null,
    driver_uuid || driver_id
      ? Driver.findOne({ where: driver_uuid ? { uuid: driver_uuid } : { id: driver_id }, transaction: t })
      : null,
  ])

  if ((project_uuid || project_id) && !project) throw new NotFoundError('Project tidak ditemukan.')
  if ((customer_uuid || customer_id) && !customer) throw new NotFoundError('Customer tidak ditemukan.')
  if (project && customer && Number(project.customer_id) !== Number(customer.id)) {
    throw new BadRequestError('Customer tidak sesuai dengan project yang dipilih.')
  }
  if ((fleet_uuid || fleet_id !== undefined) && !fleet) throw new NotFoundError('Fleet tidak ditemukan.')
  if ((driver_uuid || driver_id) && !driver)    throw new NotFoundError('Driver tidak ditemukan.')

  if (fleet && !fleet.is_tbd && fleet.status !== 'active') {
    throw new BadRequestError(`Fleet berstatus ${fleetStatusLabel(fleet.status)} dan tidak bisa digunakan.`)
  }
  if (driver && driver.status !== 'active') {
    throw new BadRequestError('Driver berstatus inactive.')
  }

  return { project, customer: project ? null : customer, fleet, driver }
}

// ── LIST & DETAIL ─────────────────────────────────────────────────────────
async function list(params) {
  const {
    page, limit, search, status, invoice_status,
    project_uuid, customer_uuid, period, from, to,
  } = params

  // Resolve UUID → id
  let projectId  = null
  let customerId = null
  if (project_uuid) {
    const p = await Project.findOne({ where: { uuid: project_uuid }, attributes: ['id'] })
    if (!p) return { rows: [], count: 0 }
    projectId = p.id
  }
  if (customer_uuid) {
    const c = await Customer.findOne({ where: { uuid: customer_uuid }, attributes: ['id'] })
    if (!c) return { rows: [], count: 0 }
    customerId = c.id
  }

  // Period resolution (explicit from/to override period keyword)
  let periodRange = null
  if (from || to) {
    periodRange = { from: from || null, to: to || null }
  } else {
    periodRange = periodToRange(period)
  }

  const { rows, count } = await repo.list({
    page, limit, search,
    status,
    invoiceStatus: invoice_status,
    projectId,
    customerId,
    periodRange,
  })

  return { rows, count }
}

async function getByUuid(uuid) {
  const sj = await repo.findByUuid(uuid)
  if (!sj) throw new NotFoundError('Surat Jalan tidak ditemukan.')
  return sj
}

// ── CREATE ────────────────────────────────────────────────────────────────
async function create(payload, actor) {
  return sequelize.transaction(async (t) => {
    const { project, customer, fleet, driver } = await resolveMasters({
      project_uuid: payload.project_uuid,
      project_id:   payload.project_id,
      customer_uuid: payload.customer_uuid,
      customer_id:   payload.customer_id,
      fleet_uuid:   payload.fleet_uuid,
      fleet_id:     payload.fleet_id,
      driver_uuid:  payload.driver_uuid,
      driver_id:    payload.driver_id,
    }, t)
    const customerId = project ? project.customer_id : customer?.id

    if (!project && !customerId) {
      throw new BadRequestError('Customer wajib dipilih untuk SJ tanpa project.')
    }

    const sjNumber = await generateSJNumber(t)
    const status   = payload.publish ? STATUS.ASSIGNED : STATUS.DRAFT

    const sj = await DeliveryOrder.create({
      sj_number:                 sjNumber,
      project_id:                project?.id || null,
      customer_id:               project?.customer_id || customerId,
      fleet_id:                  fleet.id,
      driver_id:                 driver ? driver.id : null,
      driver_name_manual:        payload.driver_name_manual || null,
      sj_date:                   payload.sj_date,
      origin:                    payload.origin,
      destination:               payload.destination,
      cargo_description:         payload.cargo_description || null,
      items:                     Array.isArray(payload.items) ? payload.items : null,
      operational_cost:          payload.operational_cost || 0,
      status,
      invoice_attachment_status: 'no_invoice',
      internal_notes:            payload.internal_notes || null,
      created_by:                actor?.id || null,
      updated_by:                actor?.id || null,
    }, { transaction: t })

    if (status === STATUS.ASSIGNED) {
      await syncAutoStockDisbursementsForSJ(sj, actor, t, { fleet, driver })
    }

    return repo.findByUuid(sj.uuid, { transaction: t })
  })
}

// ── UPDATE ────────────────────────────────────────────────────────────────
async function update(uuid, payload, actor) {
  let removedLampiran = []
  const result = await sequelize.transaction(async (t) => {
    const sj = await DeliveryOrder.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!sj) throw new NotFoundError('Surat Jalan tidak ditemukan.')
    if (sj.status === STATUS.VOID) {
      throw new ForbiddenError('SJ void tidak dapat diedit.')
    }

    const updates = {}

    if (payload.fleet_uuid || payload.fleet_id) {
      const f = await Fleet.findOne({
        where: payload.fleet_uuid ? { uuid: payload.fleet_uuid } : { id: payload.fleet_id },
        transaction: t,
      })
      if (!f) throw new NotFoundError('Fleet tidak ditemukan.')
      const fleetUnchanged = Number(f.id) === Number(sj.fleet_id)
      if (!fleetUnchanged && !f.is_tbd && f.status !== 'active') {
        throw new BadRequestError(`Fleet berstatus ${fleetStatusLabel(f.status)} dan tidak bisa digunakan.`)
      }
      updates.fleet_id = f.id
    }

    if ('driver_uuid' in payload || 'driver_id' in payload) {
      if (payload.driver_uuid === null || payload.driver_id === null) {
        updates.driver_id = null
      } else {
        const d = await Driver.findOne({
          where: payload.driver_uuid ? { uuid: payload.driver_uuid } : { id: payload.driver_id },
          transaction: t,
        })
        if (!d) throw new NotFoundError('Driver tidak ditemukan.')
        updates.driver_id = d.id
      }
    }

    const passthrough = [
      'driver_name_manual', 'sj_date', 'origin', 'destination',
      'cargo_description', 'items', 'operational_cost', 'internal_notes',
    ]
    for (const k of passthrough) {
      if (k in payload) updates[k] = payload[k]
    }

    // lampiran_paths handling — kalau payload kirim array, validasi tiap path
    // harus sudah ada di lampiran_paths existing (FE tidak boleh inject path
    // sembarangan; upload via endpoint /lampiran). Diff old vs new → unlink.
    if ('lampiran_paths' in payload) {
      const oldPaths = Array.isArray(sj.lampiran_paths) ? sj.lampiran_paths : []
      const newArr   = Array.isArray(payload.lampiran_paths) ? payload.lampiran_paths : []

      // Setiap path baru harus subset dari old (tidak boleh tambah via update).
      for (const p of newArr) {
        if (!oldPaths.includes(p)) {
          throw new BadRequestError(
            'Tidak boleh menambah lampiran via update. Pakai endpoint /lampiran untuk upload.',
            { code: 'LAMPIRAN_MUST_USE_UPLOAD_ENDPOINT' },
          )
        }
      }
      updates.lampiran_paths = newArr
      // Kumpulkan dulu; unlink dilakukan SETELAH transaction commit.
      removedLampiran = lampiranSvc.diffRemoved(oldPaths, newArr)
    }

    updates.updated_by = actor?.id || null
    await sj.update(updates, { transaction: t })

    const stockRelevantFields = [
      'items', 'sj_date', 'destination', 'fleet_id', 'fleet_uuid',
      'driver_id', 'driver_uuid', 'driver_name_manual',
    ]
    if (sj.status === STATUS.ASSIGNED && stockRelevantFields.some(k => k in payload)) {
      const [fleet, driver] = await Promise.all([
        Fleet.findByPk(sj.fleet_id, { transaction: t }),
        sj.driver_id ? Driver.findByPk(sj.driver_id, { transaction: t }) : null,
      ])
      await syncAutoStockDisbursementsForSJ(sj, actor, t, { fleet, driver })
    }

    return repo.findByUuid(sj.uuid, { transaction: t })
  })
  // Hapus file orphan hanya setelah transaction berhasil commit.
  for (const p of removedLampiran) lampiranSvc.safeUnlink(p)
  return result
}

// ── STATUS TRANSITIONS ────────────────────────────────────────────────────
async function assign(uuid, payload, actor) {
  return sequelize.transaction(async (t) => {
    const sj = await DeliveryOrder.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!sj) throw new NotFoundError('Surat Jalan tidak ditemukan.')
    if (!canTransition(sj.status, STATUS.ASSIGNED)) {
      throw new ConflictError(`Tidak bisa assign SJ dengan status ${sj.status}.`)
    }

    const { fleet, driver } = await resolveMasters({
      fleet_uuid:  payload.fleet_uuid,
      fleet_id:    payload.fleet_id,
      driver_uuid: payload.driver_uuid,
      driver_id:   payload.driver_id,
    }, t)

    await sj.update({
      fleet_id:           fleet.id,
      driver_id:          driver ? driver.id : null,
      driver_name_manual: payload.driver_name_manual || null,
      status:             STATUS.ASSIGNED,
      updated_by:         actor?.id || null,
    }, { transaction: t })

    await syncAutoStockDisbursementsForSJ(sj, actor, t, { fleet, driver })

    return repo.findByUuid(sj.uuid, { transaction: t })
  })
}

async function uploadPod(uuid, savedPath, actor) {
  let oldPath = null
  const result = await sequelize.transaction(async (t) => {
    const sj = await DeliveryOrder.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!sj) {
      lampiranSvc.safeUnlink(savedPath)
      throw new NotFoundError('Surat Jalan tidak ditemukan.')
    }
    if (![STATUS.ASSIGNED, STATUS.DELIVERED].includes(sj.status)) {
      lampiranSvc.safeUnlink(savedPath)
      throw new BadRequestError('POD hanya bisa diupload untuk SJ assigned atau delivered.')
    }
    if (sj.pod_photo_path && sj.pod_photo_path !== savedPath) {
      oldPath = sj.pod_photo_path
    }
    await sj.update({ pod_photo_path: savedPath, updated_by: actor?.id || null }, { transaction: t })
    return repo.findByUuid(sj.uuid, { transaction: t })
  })
  // Hapus file POD lama hanya setelah DB berhasil diupdate.
  if (oldPath) lampiranSvc.safeUnlink(oldPath)
  return result
}

// ── LAMPIRAN ──────────────────────────────────────────────────────────────
/**
 * Append satu lampiran path ke SJ. Path sudah disimpan ke disk oleh middleware
 * processLampiran sebelum service dipanggil.
 *
 * @returns SJ instance (full include).
 */
async function addLampiran(uuid, savedPath, actor) {
  return sequelize.transaction(async (t) => {
    const sj = await DeliveryOrder.findOne({
      where: { uuid }, transaction: t, lock: t.LOCK.UPDATE,
    })
    if (!sj) {
      // File sudah tertulis ke disk → unlink karena record tidak ada.
      lampiranSvc.safeUnlink(savedPath)
      throw new NotFoundError('Surat Jalan tidak ditemukan.')
    }
    if (sj.status === STATUS.VOID) {
      lampiranSvc.safeUnlink(savedPath)
      throw new ForbiddenError('SJ void tidak dapat diubah lampirannya.')
    }
    let nextPaths
    try {
      nextPaths = lampiranSvc.appendLampiranPath(sj.lampiran_paths, savedPath)
    } catch (err) {
      lampiranSvc.safeUnlink(savedPath)
      throw err
    }
    await sj.update({
      lampiran_paths: nextPaths,
      updated_by:     actor?.id || null,
    }, { transaction: t })
    return repo.findByUuid(sj.uuid, { transaction: t })
  })
}

/**
 * Hapus satu lampiran (by relative path) dari SJ + unlink file.
 */
async function removeLampiran(uuid, targetPath, actor) {
  const result = await sequelize.transaction(async (t) => {
    const sj = await DeliveryOrder.findOne({
      where: { uuid }, transaction: t, lock: t.LOCK.UPDATE,
    })
    if (!sj) throw new NotFoundError('Surat Jalan tidak ditemukan.')
    if (sj.status === STATUS.VOID) {
      throw new ForbiddenError('SJ void tidak dapat diubah lampirannya.')
    }
    const nextPaths = lampiranSvc.removeLampiranPath(sj.lampiran_paths, targetPath)
    await sj.update({
      lampiran_paths: nextPaths,
      updated_by:     actor?.id || null,
    }, { transaction: t })
    return repo.findByUuid(sj.uuid, { transaction: t })
  })
  // Hapus file hanya setelah DB commit berhasil.
  lampiranSvc.safeUnlink(targetPath)
  return result
}

/**
 * Resolve absolute file path untuk download. Verify file ter-attach ke SJ
 * (security: cegah akses lampiran SJ lain via filename).
 */
async function resolveLampiranDownload(uuid, filename) {
  const sj = await DeliveryOrder.findOne({ where: { uuid } })
  if (!sj) throw new NotFoundError('Surat Jalan tidak ditemukan.')

  // Match berdasarkan basename (filename UUID di akhir path).
  const found = (sj.lampiran_paths || []).find(p => {
    const base = p.split('/').pop()
    return base === filename
  })
  if (!found) throw new NotFoundError('Lampiran tidak ditemukan di SJ ini.')

  const abs = lampiranSvc.resolveAbsolute(found)
  const fs  = require('fs')
  if (!fs.existsSync(abs)) {
    throw new NotFoundError('File lampiran tidak ditemukan di server.')
  }
  return { absPath: abs, relativePath: found, filename: found.split('/').pop() }
}

async function deliver(uuid, payload, actor) {
  return sequelize.transaction(async (t) => {
    const sj = await DeliveryOrder.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!sj) throw new NotFoundError('Surat Jalan tidak ditemukan.')
    if (!canTransition(sj.status, STATUS.DELIVERED)) {
      throw new ConflictError(`Tidak bisa konfirmasi tiba dari status ${sj.status}.`)
    }
    if (!sj.pod_photo_path) {
      throw new BadRequestError('Foto POD belum diupload. Upload dulu via endpoint /pod.')
    }

    await sj.update({
      status:       STATUS.DELIVERED,
      delivered_at: payload.delivered_at,
      updated_by:   actor?.id || null,
    }, { transaction: t })

    return repo.findByUuid(sj.uuid, { transaction: t })
  })
}

async function voidSJ(uuid, payload, actor) {
  return sequelize.transaction(async (t) => {
    const sj = await DeliveryOrder.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!sj) throw new NotFoundError('Surat Jalan tidak ditemukan.')
    if (!canTransition(sj.status, STATUS.VOID)) {
      throw new ConflictError(`Tidak bisa void SJ dengan status ${sj.status}.`)
    }

    // Jika terattach ke invoice, butuh force_detach untuk auto-lepas.
    if (sj.invoice_id) {
      if (!payload.force_detach) {
        throw new ConflictError(
          'SJ ter-attach ke invoice. Detach dari invoice dulu, atau kirim force_detach=true.',
          { code: 'SJ_ATTACHED_TO_INVOICE' }
        )
      }
      await _detachFromInvoiceAndRecalc(sj, t)
    }

    await clearAutoStockDisbursementsForSJ(sj, t)

    await sj.update({
      status:      STATUS.VOID,
      void_reason: payload.void_reason,
      updated_by:  actor?.id || null,
    }, { transaction: t })

    return repo.findByUuid(sj.uuid, { transaction: t })
  })
}

async function remove(uuid, actor) {
  const sj = await DeliveryOrder.findOne({ where: { uuid } })
  if (!sj) throw new NotFoundError('Surat Jalan tidak ditemukan.')
  if (sj.status !== STATUS.DRAFT) {
    throw new ConflictError('Hanya SJ draft yang bisa dihapus.')
  }
  // Catat paths dulu sebelum destroy.
  const podPath      = sj.pod_photo_path || null
  const lampiranPaths = Array.isArray(sj.lampiran_paths) ? [...sj.lampiran_paths] : []
  await sj.update({ updated_by: actor?.id || null })
  await sj.destroy()
  // Hapus file hanya setelah DB record berhasil dihapus.
  if (podPath) lampiranSvc.safeUnlink(podPath)
  for (const p of lampiranPaths) lampiranSvc.safeUnlink(p)
  return { success: true }
}

/**
 * Lepas SJ dari invoice. Invoice items dan total TIDAK diubah — SJ attachment
 * hanya tracking referensi, tidak mempengaruhi line items invoice.
 * Hanya boleh untuk invoice dengan status non-paid dan non-void.
 */
async function _detachFromInvoiceAndRecalc(sj, t) {
  const invoice = await Invoice.findByPk(sj.invoice_id, { transaction: t })
  if (!invoice) {
    await sj.update({
      invoice_id:                null,
      invoice_attachment_status: 'no_invoice',
    }, { transaction: t })
    return
  }

  if (['paid', 'void'].includes(invoice.status)) {
    throw new ConflictError(
      `Invoice ${invoice.invoice_number} sudah ${invoice.status}. Tidak bisa auto-detach.`,
      { code: 'INVOICE_LOCKED' }
    )
  }

  await sj.update({
    invoice_id:                null,
    invoice_attachment_status: 'no_invoice',
  }, { transaction: t })
}

module.exports = {
  STATUS,
  ALLOWED_TRANSITIONS,
  canTransition,
  list,
  getByUuid,
  create,
  update,
  assign,
  uploadPod,
  deliver,
  voidSJ,
  remove,
  addLampiran,
  removeLampiran,
  resolveLampiranDownload,
}
