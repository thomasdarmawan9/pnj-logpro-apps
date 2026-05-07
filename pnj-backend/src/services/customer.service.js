'use strict'

const { Customer } = require('../models')
const repo         = require('../repositories/customer.repository')
const { NotFoundError, ConflictError } = require('../utils/AppError')

async function list(params) {
  const { rows, count } = await repo.list(params)
  return { rows, count }
}

async function getByUuid(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Customer tidak ditemukan.')
  return item
}

async function create(payload, actor) {
  if (payload.npwp) {
    const dupe = await repo.findByNpwp(payload.npwp)
    if (dupe) throw new ConflictError('NPWP sudah terdaftar pada customer lain.')
  }
  const item = await Customer.create({
    ...payload,
    created_by: actor?.id || null,
  })
  return item
}

async function update(uuid, payload) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Customer tidak ditemukan.')

  if (payload.npwp && payload.npwp !== item.npwp) {
    const dupe = await repo.findByNpwp(payload.npwp)
    if (dupe && dupe.id !== item.id) {
      throw new ConflictError('NPWP sudah terdaftar pada customer lain.')
    }
  }

  await item.update(payload)
  return item
}

async function remove(uuid) {
  const item = await repo.findByUuid(uuid)
  if (!item) throw new NotFoundError('Customer tidak ditemukan.')
  await item.destroy()
}

module.exports = { list, getByUuid, create, update, remove }
