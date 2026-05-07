'use strict'

const asyncHandler          = require('../utils/asyncHandler')
const service               = require('../services/fleet.service')
const { success, paginate } = require('../utils/response')
const { BadRequestError }   = require('../utils/AppError')

const list = asyncHandler(async (req, res) => {
  const { page, limit, search, category, status, include_tbd } = req.query
  const { rows, count } = await service.list({ page, limit, search, category, status, include_tbd })
  res.json(paginate(rows, count, page, limit))
})

const getOne = asyncHandler(async (req, res) => {
  const data = await service.getByUuid(req.params.uuid)
  res.json(success(data))
})

const create = asyncHandler(async (req, res) => {
  const data = await service.create(req.body, req.user)
  res.status(201).json(success(data, 'Fleet berhasil dibuat.'))
})

const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.uuid, req.body)
  res.json(success(data, 'Fleet berhasil diperbarui.'))
})

const toggleStatus = asyncHandler(async (req, res) => {
  const data = await service.toggleStatus(req.params.uuid)
  res.json(success(data, 'Status fleet diperbarui.'))
})

const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.savedPath) {
    throw new BadRequestError('Foto fleet wajib diupload pada field "photo".')
  }
  const data = await service.updatePhoto(req.params.uuid, req.file.savedPath)
  res.json(success(data, 'Foto fleet berhasil diunggah.'))
})

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.uuid)
  res.json(success(null, 'Fleet berhasil dihapus.'))
})

module.exports = { list, getOne, create, update, toggleStatus, uploadPhoto, remove }
