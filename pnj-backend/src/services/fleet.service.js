'use strict'

const { Op } = require('sequelize')
const {
  sequelize,
  Fleet,
  Invoice,
  InvoiceItem,
  FleetRentalCompletion,
} = require('../models')
const repo      = require('../repositories/fleet.repository')
const {
  NotFoundError,
  ConflictError,
  ForbiddenError,
  BadRequestError,
} = require('../utils/AppError')
const lampiranSvc = require('./lampiran.service')

function assertNotTbd(fleet) {
  if (fleet.is_tbd) {
    throw new ForbiddenError('Fleet TBD tidak dapat diedit atau dihapus.')
  }
}

async function list(params) {
  const { rows, count } = await repo.list(params)
  return { rows: await decorateRentalState(rows), count }
}

async function getByUuid(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Fleet tidak ditemukan.')
  const [decorated] = await decorateRentalState([item])
  return decorated
}

function todayISO() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toPlain(row) {
  return typeof row?.get === 'function' ? row.get({ plain: true }) : row
}

async function getActiveRentalMap(fleetIds) {
  const ids = [...new Set(fleetIds.map(Number).filter(Boolean))]
  if (ids.length === 0) return new Map()

  const today = todayISO()
  const items = await InvoiceItem.findAll({
    where: {
      fleet_id:      { [Op.in]: ids },
      period_start:  { [Op.ne]: null, [Op.lte]: today },
      period_end:    { [Op.ne]: null, [Op.gte]: today },
    },
    attributes: ['id', 'fleet_id', 'period_start', 'period_end', 'invoice_id'],
    include: [
      {
        model: Invoice,
        as: 'invoice',
        attributes: ['id', 'uuid', 'invoice_number', 'status', 'service_type'],
        required: true,
        where: {
          service_type: 'rental',
          status:       { [Op.ne]: 'void' },
        },
      },
    ],
    order: [['period_end', 'ASC'], ['id', 'ASC']],
  })

  const plainItems = items.map(toPlain)
  const completions = plainItems.length > 0
    ? await FleetRentalCompletion.findAll({
        where: {
          invoice_item_id: { [Op.in]: plainItems.map(item => item.id) },
          fleet_id:        { [Op.in]: ids },
        },
        attributes: ['invoice_item_id', 'fleet_id'],
        raw: true,
      })
    : []
  const completedPairs = new Set(
    completions.map(row => `${Number(row.invoice_item_id)}:${Number(row.fleet_id)}`),
  )

  const map = new Map()
  for (const plain of plainItems) {
    const fleetId = Number(plain.fleet_id)
    if (completedPairs.has(`${Number(plain.id)}:${fleetId}`)) continue

    if (map.has(fleetId)) continue
    map.set(fleetId, {
      rental_status:          'rented',
      rental_invoice_item_id: Number(plain.id),
      rental_invoice_id:      Number(plain.invoice_id),
      rental_invoice_number:  plain.invoice?.invoice_number || null,
      rental_period_start:    plain.period_start,
      rental_period_end:      plain.period_end,
    })
  }
  return map
}

function currentMonthRangeISO() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  const toISO = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return { start: toISO(start), end: toISO(end) }
}

async function getRentalCountThisMonthMap(fleetIds) {
  const ids = [...new Set(fleetIds.map(Number).filter(Boolean))]
  if (ids.length === 0) return new Map()

  const { start, end } = currentMonthRangeISO()
  const items = await InvoiceItem.findAll({
    where: {
      fleet_id:      { [Op.in]: ids },
      period_start:  { [Op.ne]: null, [Op.lte]: end },
      period_end:    { [Op.ne]: null, [Op.gte]: start },
    },
    attributes: ['id', 'fleet_id'],
    include: [{
      model: Invoice,
      as: 'invoice',
      attributes: [],
      required: true,
      where: {
        service_type: 'rental',
        status:       { [Op.ne]: 'void' },
      },
    }],
  })

  const map = new Map()
  for (const item of items.map(toPlain)) {
    const fleetId = Number(item.fleet_id)
    map.set(fleetId, Number(map.get(fleetId) || 0) + 1)
  }
  return map
}

async function decorateRentalState(rows) {
  const plainRows = rows.map(toPlain)
  const fleetIds = plainRows.map(row => row.id)
  const [rentalMap, rentalCountMap] = await Promise.all([
    getActiveRentalMap(fleetIds),
    getRentalCountThisMonthMap(fleetIds),
  ])
  return plainRows.map(row => ({
    ...row,
    rental_status:          rentalMap.get(Number(row.id))?.rental_status ?? null,
    rental_invoice_item_id: rentalMap.get(Number(row.id))?.rental_invoice_item_id ?? null,
    rental_invoice_id:      rentalMap.get(Number(row.id))?.rental_invoice_id ?? null,
    rental_invoice_number:  rentalMap.get(Number(row.id))?.rental_invoice_number ?? null,
    rental_period_start:    rentalMap.get(Number(row.id))?.rental_period_start ?? null,
    rental_period_end:      rentalMap.get(Number(row.id))?.rental_period_end ?? null,
    rentals_this_month:     Number(rentalCountMap.get(Number(row.id)) || 0),
  }))
}

async function create(payload, actor) {
  const dupe = await repo.findByPlate(payload.plate_number)
  if (dupe) throw new ConflictError('Nomor plat sudah terdaftar.')
  const item = await Fleet.create({
    ...payload,
    lampiran_paths: [],
    is_tbd:     false,
    created_by: actor?.id || null,
  })
  const [decorated] = await decorateRentalState([item])
  return decorated
}

async function update(uuid, payload) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Fleet tidak ditemukan.')
  assertNotTbd(item)
  let removedLampiran = []

  if (payload.plate_number && payload.plate_number !== item.plate_number) {
    const dupe = await repo.findByPlate(payload.plate_number)
    if (dupe && dupe.id !== item.id) {
      throw new ConflictError('Nomor plat sudah terdaftar.')
    }
  }

  const updates = { ...payload }
  if ('lampiran_paths' in payload) {
    const oldPaths = Array.isArray(item.lampiran_paths) ? item.lampiran_paths : []
    const newArr = Array.isArray(payload.lampiran_paths) ? payload.lampiran_paths : []

    for (const p of newArr) {
      if (!oldPaths.includes(p)) {
        throw new BadRequestError(
          'Tidak boleh menambah lampiran via update. Pakai endpoint /lampiran untuk upload.',
          { code: 'LAMPIRAN_MUST_USE_UPLOAD_ENDPOINT' },
        )
      }
    }

    updates.lampiran_paths = newArr
    removedLampiran = lampiranSvc.diffRemoved(oldPaths, newArr)
  }

  await item.update(updates)
  for (const p of removedLampiran) lampiranSvc.safeUnlink(p)
  const [decorated] = await decorateRentalState([item])
  return decorated
}

async function toggleStatus(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Fleet tidak ditemukan.')
  assertNotTbd(item)
  const next = item.status === 'active' ? 'inactive' : 'active'
  await item.update({ status: next })
  const [decorated] = await decorateRentalState([item])
  return decorated
}

async function updatePhoto(uuid, savedPath) {
  const item = await repo.findByUuid(uuid)
  if (!item) {
    lampiranSvc.safeUnlink(savedPath)
    throw new NotFoundError('Fleet tidak ditemukan.')
  }
  try {
    assertNotTbd(item)
  } catch (err) {
    lampiranSvc.safeUnlink(savedPath)
    throw err
  }
  const oldPath = item.photo_path && item.photo_path !== savedPath ? item.photo_path : null
  await item.update({ photo_path: savedPath })
  if (oldPath) lampiranSvc.safeUnlink(oldPath)
  const [decorated] = await decorateRentalState([item])
  return decorated
}

async function addLampiran(uuid, savedPath) {
  try {
    const item = await sequelize.transaction(async (t) => {
      const item = await Fleet.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
      if (!item) throw new NotFoundError('Fleet tidak ditemukan.')
      assertNotTbd(item)

      const nextPaths = lampiranSvc.appendLampiranPath(item.lampiran_paths, savedPath)
      await item.update({ lampiran_paths: nextPaths }, { transaction: t })
      return item
    })
    const [decorated] = await decorateRentalState([item])
    return decorated
  } catch (err) {
    lampiranSvc.safeUnlink(savedPath)
    throw err
  }
}

async function removeLampiran(uuid, targetPath) {
  const item = await sequelize.transaction(async (t) => {
    const locked = await Fleet.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!locked) throw new NotFoundError('Fleet tidak ditemukan.')
    assertNotTbd(locked)

    const nextPaths = lampiranSvc.removeLampiranPath(locked.lampiran_paths, targetPath)
    await locked.update({ lampiran_paths: nextPaths }, { transaction: t })
    return locked
  })
  lampiranSvc.safeUnlink(targetPath)
  const [decorated] = await decorateRentalState([item])
  return decorated
}

async function resolveLampiranDownload(uuid, filename) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Fleet tidak ditemukan.')

  const found = (item.lampiran_paths || []).find(p => p.split('/').pop() === filename)
  if (!found) throw new NotFoundError('Lampiran tidak ditemukan di fleet ini.')

  const fs = require('fs')
  const abs = lampiranSvc.resolveAbsolute(found)
  if (!fs.existsSync(abs)) throw new NotFoundError('File lampiran tidak ditemukan di server.')
  return { absPath: abs, relativePath: found, filename: found.split('/').pop() }
}

async function remove(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Fleet tidak ditemukan.')
  assertNotTbd(item)
  const photoPath = item.photo_path || null
  const lampiranPaths = Array.isArray(item.lampiran_paths) ? [...item.lampiran_paths] : []
  await item.destroy()
  if (photoPath) lampiranSvc.safeUnlink(photoPath)
  for (const p of lampiranPaths) lampiranSvc.safeUnlink(p)
}

async function completeRental(uuid, actor) {
  const result = await sequelize.transaction(async (t) => {
    const fleet = await Fleet.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!fleet) throw new NotFoundError('Fleet tidak ditemukan.')
    assertNotTbd(fleet)

    const today = todayISO()
    const activeItems = await InvoiceItem.findAll({
      where: {
        fleet_id:      fleet.id,
        period_start:  { [Op.ne]: null, [Op.lte]: today },
        period_end:    { [Op.ne]: null, [Op.gte]: today },
      },
      attributes: ['id', 'fleet_id'],
      include: [
        {
          model: Invoice,
          as: 'invoice',
          attributes: ['id'],
          required: true,
          where: {
            service_type: 'rental',
            status:       { [Op.ne]: 'void' },
          },
        },
      ],
      transaction: t,
      lock: t.LOCK.UPDATE,
    })

    const plainItems = activeItems.map(toPlain)
    const completions = plainItems.length > 0
      ? await FleetRentalCompletion.findAll({
          where: {
            invoice_item_id: { [Op.in]: plainItems.map(item => item.id) },
            fleet_id:        fleet.id,
          },
          attributes: ['invoice_item_id', 'fleet_id'],
          transaction: t,
          raw: true,
        })
      : []
    const completedPairs = new Set(
      completions.map(row => `${Number(row.invoice_item_id)}:${Number(row.fleet_id)}`),
    )

    const openItems = plainItems.filter(item => !completedPairs.has(`${Number(item.id)}:${Number(fleet.id)}`))

    if (openItems.length === 0) {
      throw new ConflictError('Armada tidak sedang dalam periode penyewaan aktif.')
    }

    await FleetRentalCompletion.bulkCreate(
      openItems.map(item => ({
        fleet_id:         fleet.id,
        invoice_item_id:  item.id,
        completed_by:     actor?.id || null,
      })),
      {
        transaction: t,
        ignoreDuplicates: true,
      },
    )

    return fleet
  })

  const [decorated] = await decorateRentalState([result])
  return decorated
}

module.exports = {
  list,
  getByUuid,
  create,
  update,
  toggleStatus,
  updatePhoto,
  addLampiran,
  removeLampiran,
  resolveLampiranDownload,
  completeRental,
  remove,
}
