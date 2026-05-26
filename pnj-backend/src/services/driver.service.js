'use strict'

const { sequelize, Driver } = require('../models')
const repo       = require('../repositories/driver.repository')
const { BadRequestError, NotFoundError } = require('../utils/AppError')
const lampiranSvc = require('./lampiran.service')

async function list(params) {
  const { rows, count } = await repo.list(params)
  return { rows, count }
}

async function getByUuid(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Driver tidak ditemukan.')
  return item
}

async function create(payload) {
  return Driver.create({ ...payload, lampiran_paths: [] })
}

async function update(uuid, payload) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Driver tidak ditemukan.')
  let removedLampiran = []

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
  return item
}

async function toggleStatus(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Driver tidak ditemukan.')
  const next = item.status === 'active' ? 'inactive' : 'active'
  await item.update({ status: next })
  return item
}

async function remove(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Driver tidak ditemukan.')
  const lampiranPaths = Array.isArray(item.lampiran_paths) ? [...item.lampiran_paths] : []
  await item.destroy()
  for (const p of lampiranPaths) lampiranSvc.safeUnlink(p)
}

async function addLampiran(uuid, savedPath) {
  try {
    return await sequelize.transaction(async (t) => {
      const item = await Driver.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
      if (!item) throw new NotFoundError('Driver tidak ditemukan.')

      const nextPaths = lampiranSvc.appendLampiranPath(item.lampiran_paths, savedPath)
      await item.update({ lampiran_paths: nextPaths }, { transaction: t })
      return item
    })
  } catch (err) {
    lampiranSvc.safeUnlink(savedPath)
    throw err
  }
}

async function removeLampiran(uuid, targetPath) {
  const item = await sequelize.transaction(async (t) => {
    const locked = await Driver.findOne({ where: { uuid }, transaction: t, lock: t.LOCK.UPDATE })
    if (!locked) throw new NotFoundError('Driver tidak ditemukan.')

    const nextPaths = lampiranSvc.removeLampiranPath(locked.lampiran_paths, targetPath)
    await locked.update({ lampiran_paths: nextPaths }, { transaction: t })
    return locked
  })
  lampiranSvc.safeUnlink(targetPath)
  return item
}

async function resolveLampiranDownload(uuid, filename) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Driver tidak ditemukan.')

  const found = (item.lampiran_paths || []).find(p => p.split('/').pop() === filename)
  if (!found) throw new NotFoundError('Lampiran tidak ditemukan di driver ini.')

  const fs = require('fs')
  const abs = lampiranSvc.resolveAbsolute(found)
  if (!fs.existsSync(abs)) throw new NotFoundError('File lampiran tidak ditemukan di server.')
  return { absPath: abs, relativePath: found, filename: found.split('/').pop() }
}

module.exports = {
  list,
  getByUuid,
  create,
  update,
  toggleStatus,
  remove,
  addLampiran,
  removeLampiran,
  resolveLampiranDownload,
}
