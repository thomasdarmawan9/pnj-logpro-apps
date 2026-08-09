'use strict'

const fs   = require('fs')
const path = require('path')
const { Op } = require('sequelize')

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
 * Enqueue beberapa PDF invoice dalam satu request.
 *
 * Semua invoice divalidasi dan semua row PdfJob dibuat dalam satu transaksi,
 * sehingga request tidak menghasilkan batch setengah jadi ketika salah satu
 * invoice tidak valid atau masih memiliki job yang berjalan. Rendering tetap
 * memakai queue/job satuan yang sama dengan flow cetak PDF existing.
 */
async function enqueueInvoiceBatch({ recordUuids, options, requestedBy }) {
  const orderedUuids = [...new Set(recordUuids)]

  const { entries, previousFilePaths } = await sequelize.transaction(async (t) => {
    const invoices = await Invoice.findAll({
      where:       { uuid: orderedUuids },
      transaction: t,
      lock:        t.LOCK.UPDATE,
    })
    const invoiceByUuid = new Map(invoices.map(invoice => [invoice.uuid, invoice]))
    const missingUuids = orderedUuids.filter(uuid => !invoiceByUuid.has(uuid))

    if (missingUuids.length > 0) {
      throw new NotFoundError(`${missingUuids.length} invoice tidak ditemukan.`)
    }

    const orderedInvoices = orderedUuids.map(uuid => invoiceByUuid.get(uuid))
    const draftInvoices = orderedInvoices.filter(invoice => invoice.status === 'draft')
    if (draftInvoices.length > 0) {
      throw new BadRequestError(
        `Invoice draft belum dapat dicetak: ${draftInvoices.map(invoice => invoice.invoice_number).join(', ')}.`,
      )
    }

    const recordIds = orderedInvoices.map(invoice => invoice.id)

    // Satu query preflight untuk seluruh batch. Sebelumnya ini melakukan satu
    // query per invoice, lalu diulang lagi saat clearPreviousJobs().
    const inFlightJobs = await PdfJob.findAll({
      where: {
        job_type: 'invoice',
        record_id: { [Op.in]: recordIds },
        status: { [Op.in]: ['pending', 'processing'] },
      },
      order:       [['created_at', 'DESC']],
      transaction: t,
      lock:        t.LOCK.UPDATE,
    })
    const inFlightByRecord = new Map(inFlightJobs.map(job => [Number(job.record_id), job]))
    const blockedInvoice = orderedInvoices.find(invoice => inFlightByRecord.has(Number(invoice.id)))
    if (blockedInvoice) {
      const activeJob = inFlightByRecord.get(Number(blockedInvoice.id))
      throw new BadRequestError(
        `PDF invoice ${blockedInvoice.invoice_number} sedang diproses. Tunggu sampai selesai sebelum mencetak ulang.`,
        { code: 'PDF_JOB_IN_PROGRESS', existing_uuid: activeJob.uuid },
      )
    }

    // Ambil dan hapus row lama secara bulk di dalam transaksi. File fisik baru
    // dihapus setelah commit, supaya rollback tidak meninggalkan row lama yang
    // menunjuk ke file yang sudah terhapus.
    const previousJobs = await PdfJob.findAll({
      where: {
        job_type: 'invoice',
        record_id: { [Op.in]: recordIds },
      },
      transaction: t,
      lock:        t.LOCK.UPDATE,
    })
    if (previousJobs.length > 0) {
      await PdfJob.destroy({
        where:       { id: { [Op.in]: previousJobs.map(job => job.id) } },
        transaction: t,
        force:       true,
      })
    }

    const jobRows = orderedInvoices.map((invoice) => {
      const customServiceName = String(invoice.custom_service_name || '').toLowerCase()
      const isRentalInvoice = invoice.service_type === 'rental' || (
        invoice.service_type === 'other' &&
        (customServiceName.includes('penyewaan') || customServiceName.includes('sewa'))
      )
      const resolvedOptions = {
        ...(options || {}),
        // Samakan dengan modal cetak satuan: invoice penyewaan tidak pernah
        // menambahkan halaman daftar Surat Jalan.
        includeSJ: !isRentalInvoice && options?.includeSJ === true,
      }
      return {
        job_type:     'invoice',
        record_id:    invoice.id,
        status:       'pending',
        options:      resolvedOptions,
        requested_by: requestedBy?.id || null,
      }
    })
    const createdJobs = await PdfJob.bulkCreate(jobRows, {
      transaction: t,
      returning:   true,
    })
    const jobByRecord = new Map(createdJobs.map(job => [Number(job.record_id), job]))

    return {
      entries: orderedInvoices.map(invoice => ({
        recordUuid:  invoice.uuid,
        recordLabel: invoice.invoice_number,
        job:          jobByRecord.get(Number(invoice.id)),
      })),
      previousFilePaths: previousJobs.map(job => job.file_path).filter(Boolean),
    }
  })

  previousFilePaths.forEach(safeUnlink)

  // Queue setiap job secara independen. Kegagalan enqueue ditandai pada job
  // terkait agar frontend tetap mendapat status lengkap untuk seluruh batch.
  await Promise.all(entries.map(async (entry) => {
    try {
      await enqueuePdfJob({
        pdfJobUuid:   entry.job.uuid,
        job_type:     entry.job.job_type,
        record_id:    entry.job.record_id,
        options:      entry.job.options || {},
        requested_by: entry.job.requested_by,
      })
    } catch (err) {
      logger.error(`[pdfJob.service] gagal enqueue batch ${entry.job.uuid}: ${err.message}`)
      await entry.job.update({
        status:        'failed',
        error_message: `Gagal enqueue: ${err.message}`,
        completed_at:  new Date(),
      })
    }
  }))

  return entries
}

/**
 * Payload ringan untuk dropdown cetak PDF massal. Sengaja tidak memakai list
 * invoice umum karena endpoint tersebut ikut memuat item dan data finansial.
 */
async function listInvoiceOptions() {
  const invoices = await Invoice.findAll({
    attributes: ['uuid', 'invoice_number', 'invoice_date', 'status', 'created_at'],
    include: [{
      association: 'customer',
      attributes:  ['name'],
      // Invoice historis tetap harus tampil walau customernya sudah soft-delete.
      // Nama customer lama masih tersedia di tabel dan aman dibaca read-only.
      paranoid:    false,
      required:    false,
    }],
    order: [
      ['invoice_date', 'DESC'],
      ['created_at', 'DESC'],
    ],
  })

  return invoices.map(invoice => ({
    uuid:           invoice.uuid,
    invoice_number: invoice.invoice_number,
    invoice_date:   invoice.invoice_date,
    status:         invoice.status,
    customer:       { name: invoice.customer?.name || 'Customer tidak tersedia' },
  }))
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
  enqueueInvoiceBatch,
  listInvoiceOptions,
  getStatus,
  resolveDownload,
  clearPreviousJobs,
  safeUnlink,
}
