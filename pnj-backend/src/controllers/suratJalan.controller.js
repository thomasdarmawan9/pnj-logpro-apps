'use strict'

const asyncHandler          = require('../utils/asyncHandler')
const service               = require('../services/suratJalan.service')
const exportService         = require('../services/export/suratJalan.export')
const pdfJobService         = require('../services/pdfJob.service')
const { publicShape: pdfJobShape } = require('./pdfJobs.controller')
const { success, paginate } = require('../utils/response')
const { BadRequestError }   = require('../utils/AppError')

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
  res.status(201).json(success(data, 'Surat Jalan berhasil dibuat.'))
})

const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.uuid, req.body, req.user)
  res.json(success(data, 'Surat Jalan berhasil diperbarui.'))
})

const assign = asyncHandler(async (req, res) => {
  const data = await service.assign(req.params.uuid, req.body, req.user)
  res.json(success(data, 'Surat Jalan berhasil di-assign.'))
})

const uploadPod = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.savedPath) {
    throw new BadRequestError('Foto POD wajib diupload pada field "photo".')
  }
  const data = await service.uploadPod(req.params.uuid, req.file.savedPath, req.user)
  res.json(success(data, 'Foto POD berhasil diunggah.'))
})

const deliver = asyncHandler(async (req, res) => {
  const data = await service.deliver(req.params.uuid, req.body, req.user)
  res.json(success(data, 'SJ ditandai sudah sampai.'))
})

const voidSJ = asyncHandler(async (req, res) => {
  const data = await service.voidSJ(req.params.uuid, req.body, req.user)
  res.json(success(data, 'Surat Jalan berhasil di-void.'))
})

const remove = asyncHandler(async (req, res) => {
  await service.remove(req.params.uuid, req.user)
  res.json(success(null, 'Surat Jalan draft berhasil dihapus.'))
})

const exportXlsx = asyncHandler(async (req, res) => {
  await exportService.exportXlsx(req.query, res)
})

const generatePdf = asyncHandler(async (req, res) => {
  const job = await pdfJobService.enqueue({
    jobType:     'surat_jalan',
    recordUuid:  req.params.uuid,
    options:     req.body?.options || {},
    requestedBy: req.user,
  })
  res.status(202).json(success(pdfJobShape(job), 'PDF SJ sedang diproses.'))
})

// ── Lampiran ──────────────────────────────────────────────────────────────
const fs = require('fs')

const uploadLampiran = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.savedPath) {
    throw new BadRequestError('File lampiran wajib diupload pada field "file".')
  }
  const data = await service.addLampiran(req.params.uuid, req.file.savedPath, req.user)
  res.status(201).json(success(data, 'Lampiran berhasil diunggah.'))
})

const deleteLampiran = asyncHandler(async (req, res) => {
  // Filename param → reconstruct relative path: "sj-lampiran/<filename>"
  const targetPath = `sj-lampiran/${req.params.filename}`
  const data = await service.removeLampiran(req.params.uuid, targetPath, req.user)
  res.json(success(data, 'Lampiran berhasil dihapus.'))
})

const downloadLampiran = asyncHandler(async (req, res) => {
  const { absPath, filename } = await service.resolveLampiranDownload(
    req.params.uuid, req.params.filename,
  )
  const ext = filename.toLowerCase().split('.').pop()
  const contentType = ext === 'pdf'  ? 'application/pdf'
                    : ext === 'webp' ? 'image/webp'
                    : ext === 'png'  ? 'image/png'
                    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                    : 'application/octet-stream'
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
  fs.createReadStream(absPath).pipe(res)
})

const downloadPod = asyncHandler(async (req, res) => {
  const { NotFoundError } = require('../utils/AppError')
  const path = require('path')
  const env  = require('../config/env')

  const sj = await service.getByUuid(req.params.uuid)
  if (!sj || !sj.pod_photo_path) throw new NotFoundError('Foto POD tidak ditemukan.')

  const abs = path.isAbsolute(sj.pod_photo_path)
    ? sj.pod_photo_path
    : path.resolve(env.upload.dir, sj.pod_photo_path)

  if (!fs.existsSync(abs)) throw new NotFoundError('File foto POD tidak ditemukan di server.')

  const ext = abs.toLowerCase().split('.').pop()
  const contentType = ext === 'webp' ? 'image/webp'
                    : ext === 'png'  ? 'image/png'
                    : 'image/jpeg'
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(abs)}"`)
  fs.createReadStream(abs).pipe(res)
})

module.exports = {
  list, getOne, create, update, assign,
  uploadPod, deliver, voidSJ, remove, exportXlsx, generatePdf,
  uploadLampiran, deleteLampiran, downloadLampiran, downloadPod,
}
