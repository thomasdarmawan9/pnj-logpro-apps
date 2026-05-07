'use strict'

const asyncHandler          = require('../utils/asyncHandler')
const service               = require('../services/stockDisbursement.service')
const { success, paginate } = require('../utils/response')

const list = asyncHandler(async (req, res) => {
  const { page, limit } = req.query
  const { rows, count } = await service.list(req.query)
  res.json(paginate(rows, count, page, limit))
})

const getOne = asyncHandler(async (req, res) => {
  const data = await service.getByUuid(req.params.uuid)
  res.json(success(data))
})

const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body, req.user)
  res.status(201).json(success(data, 'Pengeluaran barang berhasil dicatat.'))
})

const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.uuid, req.body, req.user)
  res.json(success(data, 'Pengeluaran barang berhasil diperbarui.'))
})

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.uuid)
  res.json(success(null, 'Pengeluaran barang berhasil dihapus.'))
})

module.exports = { list, getOne, create, update, remove }
