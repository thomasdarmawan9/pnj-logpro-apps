'use strict'

const asyncHandler          = require('../utils/asyncHandler')
const service               = require('../services/invoice.service')
const exportService         = require('../services/export/invoice.export')
const pdfJobService         = require('../services/pdfJob.service')
const { publicShape: pdfJobShape } = require('./pdfJobs.controller')
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
  res.status(201).json(success(data, 'Invoice berhasil dibuat.'))
})

const update = asyncHandler(async (req, res) => {
  const data = await service.update(req.params.uuid, req.body, req.user)
  res.json(success(data, 'Invoice berhasil diperbarui.'))
})

const send = asyncHandler(async (req, res) => {
  const data = await service.send(req.params.uuid, req.user)
  res.json(success(data, 'Invoice ditandai terkirim.'))
})

const markOutstanding = asyncHandler(async (req, res) => {
  const data = await service.markOutstanding(req.params.uuid, req.user)
  res.json(success(data, 'Invoice ditandai outstanding.'))
})

const recordPayment = asyncHandler(async (req, res) => {
  const data = await service.recordPayment(req.params.uuid, req.body, req.user)
  res.status(201).json(success(data, 'Pembayaran berhasil dicatat.'))
})

const voidInvoice = asyncHandler(async (req, res) => {
  const data = await service.voidInvoice(req.params.uuid, req.body, req.user)
  res.json(success(data, 'Invoice berhasil di-void.'))
})

const attachSJ = asyncHandler(async (req, res) => {
  const data = await service.attachSJ(req.params.uuid, req.body.sj_uuids, req.user)
  res.json(success(data, 'SJ berhasil di-attach ke invoice.'))
})

const detachSJ = asyncHandler(async (req, res) => {
  const data = await service.detachSJ(req.params.uuid, req.params.sjUuid, req.user)
  res.json(success(data, 'SJ berhasil di-detach dari invoice.'))
})

const attachableSJ = asyncHandler(async (req, res) => {
  const data = await service.getAttachableSJ(req.params.uuid)
  res.json(success(data))
})

const exportXlsx = asyncHandler(async (req, res) => {
  await exportService.exportXlsx(req.query, res)
})

const generatePdf = asyncHandler(async (req, res) => {
  const job = await pdfJobService.enqueue({
    jobType:     'invoice',
    recordUuid:  req.params.uuid,
    options:     req.body?.options || {},
    requestedBy: req.user,
  })
  res.status(202).json(success(pdfJobShape(job), 'PDF Invoice sedang diproses.'))
})

// ── Lampiran ──────────────────────────────────────────────────────────────
const fs = require('fs')
const { BadRequestError } = require('../utils/AppError')

const uploadLampiran = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.savedPath) {
    throw new BadRequestError('File lampiran wajib diupload pada field "file".')
  }
  const data = await service.addLampiran(req.params.uuid, req.file.savedPath, req.user)
  res.status(201).json(success(data, 'Lampiran berhasil diunggah.'))
})

const deleteLampiran = asyncHandler(async (req, res) => {
  const targetPath = `invoice-lampiran/${req.params.filename}`
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

module.exports = {
  list,
  getOne,
  create,
  update,
  send,
  markOutstanding,
  recordPayment,
  voidInvoice,
  attachSJ,
  detachSJ,
  attachableSJ,
  exportXlsx,
  generatePdf,
  uploadLampiran,
  deleteLampiran,
  downloadLampiran,
}
