'use strict'

const asyncHandler          = require('../utils/asyncHandler')
const service               = require('../services/customer.service')
const { success, paginate } = require('../utils/response')

const list = asyncHandler(async (req, res) => {
  const { page, limit, search, is_pkp } = req.query
  const { rows, count } = await service.list({ page, limit, search, is_pkp })
  res.json(paginate(rows, count, page, limit))
})

const getOne = asyncHandler(async (req, res) => {
  const data = await service.getByUuid(req.params.uuid)
  res.json(success(data))
})

const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body, req.user)
  res.status(201).json(success(data, 'Customer berhasil dibuat.'))
})

const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.uuid, req.body)
  res.json(success(data, 'Customer berhasil diperbarui.'))
})

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.uuid)
  res.json(success(null, 'Customer berhasil dihapus.'))
})

module.exports = { list, getOne, create, update, remove }
