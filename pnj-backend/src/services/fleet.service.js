'use strict'

const { Fleet } = require('../models')
const repo      = require('../repositories/fleet.repository')
const {
  NotFoundError,
  ConflictError,
  ForbiddenError,
} = require('../utils/AppError')

function assertNotTbd(fleet) {
  if (fleet.is_tbd) {
    throw new ForbiddenError('Fleet TBD tidak dapat diedit atau dihapus.')
  }
}

async function list(params) {
  const { rows, count } = await repo.list(params)
  return { rows, count }
}

async function getByUuid(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Fleet tidak ditemukan.')
  return item
}

async function create(payload, actor) {
  const dupe = await repo.findByPlate(payload.plate_number)
  if (dupe) throw new ConflictError('Nomor plat sudah terdaftar.')
  return Fleet.create({
    ...payload,
    is_tbd:     false,
    created_by: actor?.id || null,
  })
}

async function update(uuid, payload) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Fleet tidak ditemukan.')
  assertNotTbd(item)

  if (payload.plate_number && payload.plate_number !== item.plate_number) {
    const dupe = await repo.findByPlate(payload.plate_number)
    if (dupe && dupe.id !== item.id) {
      throw new ConflictError('Nomor plat sudah terdaftar.')
    }
  }

  await item.update(payload)
  return item
}

async function toggleStatus(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Fleet tidak ditemukan.')
  assertNotTbd(item)
  const next = item.status === 'active' ? 'inactive' : 'active'
  await item.update({ status: next })
  return item
}

async function updatePhoto(uuid, savedPath) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Fleet tidak ditemukan.')
  assertNotTbd(item)
  await item.update({ photo_path: savedPath })
  return item
}

async function remove(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Fleet tidak ditemukan.')
  assertNotTbd(item)
  await item.destroy()
}

module.exports = { list, getByUuid, create, update, toggleStatus, updatePhoto, remove }
