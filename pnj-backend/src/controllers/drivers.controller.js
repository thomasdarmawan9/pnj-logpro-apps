'use strict'

const asyncHandler          = require('../utils/asyncHandler')
const service               = require('../services/driver.service')
const { success, paginate } = require('../utils/response')

const list = asyncHandler(async (req, res) => {
  const { page, limit, search, status } = req.query
  const { rows, count } = await service.list({ page, limit, search, status })
  res.json(paginate(rows, count, page, limit))
})

const getOne = asyncHandler(async (req, res) => {
  const data = await service.getByUuid(req.params.uuid)
  res.json(success(data))
})

const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body)
  res.status(201).json(success(data, 'Driver berhasil dibuat.'))
})

const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.uuid, req.body)
  res.json(success(data, 'Driver berhasil diperbarui.'))
})

const toggleStatus = asyncHandler(async (req, res) => {
  const data = await service.toggleStatus(req.params.uuid)
  res.json(success(data, 'Status driver diperbarui.'))
})

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.uuid)
  res.json(success(null, 'Driver berhasil dihapus.'))
})

module.exports = { list, getOne, create, update, toggleStatus, remove }
