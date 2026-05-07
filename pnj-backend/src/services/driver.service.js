'use strict'

const { Driver } = require('../models')
const repo       = require('../repositories/driver.repository')
const { NotFoundError } = require('../utils/AppError')

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
  return Driver.create(payload)
}

async function update(uuid, payload) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Driver tidak ditemukan.')
  await item.update(payload)
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
  await item.destroy()
}

module.exports = { list, getByUuid, create, update, toggleStatus, remove }
