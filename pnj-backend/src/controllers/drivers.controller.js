'use strict'

const asyncHandler          = require('../utils/asyncHandler')
const service               = require('../services/driver.service')
const { success, paginate } = require('../utils/response')
const { BadRequestError }   = require('../utils/AppError')
const fs                    = require('fs')

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

const uploadLampiran = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.savedPath) {
    throw new BadRequestError('Foto lampiran supir wajib diupload pada field "file".')
  }
  const data = await service.addLampiran(req.params.uuid, req.file.savedPath)
  res.status(201).json(success(data, 'Lampiran supir berhasil diunggah.'))
})

const deleteLampiran = asyncHandler(async (req, res) => {
  const targetPath = `driver-lampiran/${req.params.filename}`
  const data = await service.removeLampiran(req.params.uuid, targetPath)
  res.json(success(data, 'Lampiran supir berhasil dihapus.'))
})

const downloadLampiran = asyncHandler(async (req, res) => {
  const { absPath, filename } = await service.resolveLampiranDownload(
    req.params.uuid,
    req.params.filename,
  )
  const ext = filename.toLowerCase().split('.').pop()
  const contentType = ext === 'webp' ? 'image/webp'
                    : ext === 'png'  ? 'image/png'
                    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                    : 'application/octet-stream'
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
  fs.createReadStream(absPath).pipe(res)
})

module.exports = {
  list,
  getOne,
  create,
  update,
  toggleStatus,
  remove,
  uploadLampiran,
  deleteLampiran,
  downloadLampiran,
}
