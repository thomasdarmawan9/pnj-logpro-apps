'use strict'

const fs   = require('fs')
const path = require('path')

const { sequelize, PdfJob, DeliveryOrder, Invoice } = require('../models')
const repo = require('../repositories/pdfJob.repository')
const env  = require('../config/env')
const logger = require('../utils/logger')
const {
  NotFoundError,
  BadRequestError,
} = require('../utils/AppError')
const { enqueuePdfJob } = require('../queues/pdf.queue')

const JOB_TYPES = ['surat_jalan', 'invoice']
const STATUSES  = ['pending', 'processing', 'done', 'failed']

/**
 * Hapus file PDF lama (kalau ada). Diam-diam abaikan kalau tidak ada.
 */
function safeUnlink(relativePath) {
  if (!relativePath) return
  try {
    const abs = path.isAbsolute(relativePath)
      ? relativePath
      : path.resolve(env.pdf.outputDir, relativePath)
    if (fs.existsSync(abs)) fs.unlinkSync(abs)
  } catch (err) {
    logger.warn(`[pdfJob.service] gagal hapus file lama ${relativePath}: ${err.message}`)
  }
}

/**
 * Resolve job context (job_type + record_id) dari uuid record (SJ atau Invoice).
 * SELECT ... FOR UPDATE pada parent record supaya 2 request generate-pdf paralel
 * untuk record yang sama akan di-serialize.
 */
async function resolveRecordContext({ jobType, recordUuid }, t) {
  if (jobType === 'surat_jalan') {
    const sj = await DeliveryOrder.findOne({
      where:       { uuid: recordUuid },
      transaction: t,
      lock:        t.LOCK.UPDATE,
    })
    if (!sj) throw new NotFoundError('Surat Jalan tidak ditemukan.')
    if (sj.status === 'void') {
      throw new BadRequestError('Surat Jalan dengan status void tidak dapat dicetak PDF.')
    }
    return { record: sj, recordId: sj.id, recordLabel: sj.sj_number }
  }

  if (jobType === 'invoice') {
    const inv = await Invoice.findOne({
      where:       { uuid: recordUuid },
      transaction: t,
      lock:        t.LOCK.UPDATE,
    })
    if (!inv) throw new NotFoundError('Invoice tidak ditemukan.')
    if (inv.status === 'draft') {
      throw new BadRequestError(
        'Invoice draft belum dapat dicetak. Send dulu invoice untuk generate PDF.',
      )
    }
    return { record: inv, recordId: inv.id, recordLabel: inv.invoice_number }
  }

  throw new BadRequestError(`Unknown jobType: ${jobType}`)
}

/**
 * Hapus job lama (replace-last policy):
 *  - kalau ada yang pending/processing → block dengan PDF_JOB_IN_PROGRESS.
 *  - kalau ada yang done → file PDF di-unlink, row destroy.
 *  - kalau ada yang failed → row destroy (file biasanya tidak ada karena render
 *    gagal sebelum tulis, tapi tetap coba unlink defensive).
 */
async function clearPreviousJobs(jobType, recordId, t) {
  // Step 1: block kalau ada in-flight job.
  const inFlight = await repo.findInFlightByRecord(jobType, recordId, { transaction: t })
  if (inFlight.length > 0) {
    throw new BadRequestError(
      'Sudah ada permintaan PDF yang sedang diproses. Tunggu sampai selesai sebelum membuat ulang.',
      { code: 'PDF_JOB_IN_PROGRESS', existing_uuid: inFlight[0].uuid },
    )
  }

  // Step 2: bersihkan SEMUA job lama (done + failed) supaya cuma 1 row aktif
  // per record.
  const previous = await repo.findAllByRecord(jobType, recordId, { transaction: t })
  for (const old of previous) {
    safeUnlink(old.file_path)
    await old.destroy({ transaction: t, force: true })
  }
}

/**
 * Enqueue PDF generation job.
 * Strategi replace-last: hapus PdfJob + file lama yang status `done`. Block
 * kalau ada job pending/processing.
 */
async function enqueue({ jobType, recordUuid, options, requestedBy }) {
  if (!JOB_TYPES.includes(jobType)) {
    throw new BadRequestError(`Unknown jobType: ${jobType}`)
  }

  const pdfJob = await sequelize.transaction(async (t) => {
    const ctx = await resolveRecordContext({ jobType, recordUuid }, t)

    await clearPreviousJobs(jobType, ctx.recordId, t)

    const job = await PdfJob.create({
      job_type:      jobType,
      record_id:     ctx.recordId,
      status:        'pending',
      options:       options || null,
      requested_by:  requestedBy?.id || null,
    }, { transaction: t })

    return job
  })

  // Enqueue di luar transaksi DB — kalau enqueue gagal, kita rollback row.
  try {
    await enqueuePdfJob({
      pdfJobUuid:  pdfJob.uuid,
      job_type:    pdfJob.job_type,
      record_id:   pdfJob.record_id,
      options:     options || {},
      requested_by: pdfJob.requested_by,
    })
  } catch (err) {
    logger.error(`[pdfJob.service] gagal enqueue ${pdfJob.uuid}: ${err.message}`)
    await pdfJob.update({
      status:        'failed',
      error_message: `Gagal enqueue: ${err.message}`,
      completed_at:  new Date(),
    })
    throw err
  }

  return pdfJob
}

/**
 * Get status untuk polling FE.
 */
async function getStatus(uuid) {
  const job = await repo.findByUuid(uuid)
  if (!job) throw new NotFoundError('PDF job tidak ditemukan.')
  return job
}

/**
 * Resolve absolute file path untuk download. Block kalau status bukan done.
 */
async function resolveDownload(uuid) {
  const job = await repo.findByUuid(uuid)
  if (!job) throw new NotFoundError('PDF job tidak ditemukan.')
  if (job.status !== 'done' || !job.file_path) {
    throw new BadRequestError(`PDF belum siap (status: ${job.status}).`)
  }
  const abs = path.isAbsolute(job.file_path)
    ? job.file_path
    : path.resolve(env.pdf.outputDir, job.file_path)
  if (!fs.existsSync(abs)) {
    throw new NotFoundError('File PDF tidak ditemukan di server. Silakan generate ulang.')
  }
  return { absPath: abs, filename: path.basename(abs), job }
}

module.exports = {
  JOB_TYPES,
  STATUSES,
  enqueue,
  getStatus,
  resolveDownload,
  clearPreviousJobs,
  safeUnlink,
}
