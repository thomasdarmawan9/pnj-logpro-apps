'use strict'

const asyncHandler          = require('../utils/asyncHandler')
const service               = require('../services/stockItem.service')
const { success, paginate } = require('../utils/response')

const list = asyncHandler(async (req, res) => {
  const { page, limit, search, category, is_active } = req.query
  const { rows, count } = await service.list({ page, limit, search, category, is_active })
  res.json(paginate(rows, count, page, limit))
})

const getOne = asyncHandler(async (req, res) => {
  const data = await service.getByUuid(req.params.uuid)
  res.json(success(data))
})

const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body, req.user)
  res.status(201).json(success(data, 'Stock item berhasil dibuat.'))
})

const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.uuid, req.body)
  res.json(success(data, 'Stock item berhasil diperbarui.'))
})

const toggle = asyncHandler(async (req, res) => {
  const data = await service.toggleActive(req.params.uuid)
  res.json(success(data, 'Status stock item diperbarui.'))
})

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.uuid)
  res.json(success(null, 'Stock item berhasil dihapus.'))
})

module.exports = { list, getOne, create, update, toggle, remove }
