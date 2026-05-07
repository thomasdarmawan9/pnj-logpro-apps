'use strict'

const fs   = require('fs')
const asyncHandler = require('../utils/asyncHandler')
const service      = require('../services/pdfJob.service')
const { success }  = require('../utils/response')

function publicShape(job) {
  if (!job) return null
  const plain = typeof job.get === 'function' ? job.get({ plain: true }) : job
  return {
    uuid:           plain.uuid,
    job_type:       plain.job_type,
    record_id:      plain.record_id,
    status:         plain.status,
    download_url:   plain.status === 'done'
      ? `/api/v1/pdf-jobs/${plain.uuid}/download`
      : null,
    error_message:  plain.error_message,
    requested_by:   plain.requested_by,
    processed_at:   plain.processed_at,
    completed_at:   plain.completed_at,
    created_at:     plain.created_at,
  }
}

const getOne = asyncHandler(async (req, res) => {
  const job = await service.getStatus(req.params.uuid)
  res.json(success(publicShape(job)))
})

/**
 * Stream file PDF via attachment header. FE bisa pakai window.open() ke
 * /api/v1/pdf-jobs/:uuid/download.
 */
const download = asyncHandler(async (req, res) => {
  const { absPath, filename } = await service.resolveDownload(req.params.uuid)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  fs.createReadStream(absPath).pipe(res)
})

module.exports = { getOne, download, publicShape }
