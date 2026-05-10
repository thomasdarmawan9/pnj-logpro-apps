'use strict'

/**
 * PDF Worker — process job dari queue 'pdf-generation'.
 * Dijalankan terpisah dari API server: `npm run worker:pdf`
 *
 * Lifecycle:
 *  1. ambil job (pdfJobUuid, job_type, record_id, options).
 *  2. update PdfJob.status = processing, processed_at = now.
 *  3. render PDF via src/pdf/render.js → file_path (absolute).
 *  4. update PdfJob.status = done, file_path (relative), completed_at.
 *  5. on error: status = failed, error_message, completed_at.
 */

const path = require('path')
const { Worker } = require('bullmq')

const env    = require('../config/env')
const logger = require('../utils/logger')
const { PdfJob } = require('../models')
const { renderPdf } = require('../pdf/render')
const { getBullConnection } = require('../queues/connection')
const { QUEUE_NAME } = require('../queues/pdf.queue')

async function processJob(bullJob) {
  const payload = bullJob.data
  const { pdfJobUuid } = payload

  logger.info(`[pdf.worker] start ${pdfJobUuid} (${payload.job_type}#${payload.record_id})`)

  const pdfJob = await PdfJob.findOne({ where: { uuid: pdfJobUuid } })
  if (!pdfJob) {
    throw new Error(`PdfJob ${pdfJobUuid} tidak ditemukan di DB.`)
  }

  await pdfJob.update({
    status:       'processing',
    processed_at: new Date(),
  })

  try {
    // Baca options: utamakan dari BullMQ payload (always up-to-date), fallback
    // ke kolom options di DB untuk ketahanan jika Redis/BullMQ restart.
    const resolvedOptions = payload.options || pdfJob.options || {}

    const absPath = await renderPdf({
      pdfJobUuid,
      job_type:  payload.job_type,
      record_id: payload.record_id,
      options:   resolvedOptions,
    })

    // Simpan path relatif terhadap PDF_OUTPUT_DIR — supaya kalau dir dipindah,
    // resolve di service tetap konsisten.
    const relPath = path.relative(path.resolve(env.pdf.outputDir), absPath)

    await pdfJob.update({
      status:       'done',
      file_path:    relPath,
      completed_at: new Date(),
      error_message: null,
    })

    logger.info(`[pdf.worker] done  ${pdfJobUuid} → ${relPath}`)
    return { file_path: relPath }
  } catch (err) {
    // BullMQ akan retry sesuai attempts (default 3). Jangan mark 'failed' kecuali
    // ini attempt terakhir — supaya status FE tidak flicker antar retry.
    const attemptsMade = bullJob.attemptsMade + 1
    const maxAttempts  = bullJob.opts?.attempts ?? 1
    const isFinal      = attemptsMade >= maxAttempts

    logger.error(
      `[pdf.worker] error ${pdfJobUuid} attempt ${attemptsMade}/${maxAttempts}: ${err.message}`,
    )

    if (isFinal) {
      await pdfJob.update({
        status:        'failed',
        error_message: err.message?.slice(0, 1000) || 'Unknown error',
        completed_at:  new Date(),
      })
    } else {
      // Retry akan datang. Kembalikan status ke 'pending' biar terlihat queue.
      await pdfJob.update({
        status:        'pending',
        error_message: `Attempt ${attemptsMade} failed: ${err.message?.slice(0, 500)}`,
      })
    }
    throw err  // BullMQ butuh throw untuk trigger retry / mark job failed.
  }
}

function startWorker() {
  const concurrency = env.pdf.workerMaxConcurrent || 2

  const worker = new Worker(QUEUE_NAME, processJob, {
    connection: getBullConnection(),
    concurrency,
  })

  worker.on('completed', (job, result) => {
    logger.info(`[pdf.worker] completed ${job.id}`)
  })
  worker.on('failed', (job, err) => {
    logger.error(`[pdf.worker] failed ${job?.id}: ${err.message}`)
  })
  worker.on('error', (err) => {
    logger.error(`[pdf.worker] worker error: ${err.message}`)
  })

  logger.info(`[pdf.worker] started, concurrency=${concurrency}, queue=${QUEUE_NAME}`)

  // Graceful shutdown
  const shutdown = async (sig) => {
    logger.info(`[pdf.worker] received ${sig}, closing...`)
    await worker.close().catch(() => {})
    process.exit(0)
  }
  process.on('SIGINT',  () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))

  return worker
}

if (require.main === module) {
  // Dijalankan langsung sebagai standalone process.
  startWorker()
}

module.exports = { startWorker, processJob }
