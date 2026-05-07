'use strict'

/**
 * PDF queue (BullMQ).
 *
 * Job payload:
 *   {
 *     pdfJobUuid:   string  — UUID PdfJob row di DB.
 *     job_type:     'surat_jalan' | 'invoice'
 *     record_id:    number  — id SJ / Invoice
 *     options:      object  — opsi render (includeHeader, includeSign, etc.)
 *     requested_by: number | null
 *   }
 */

const { Queue, QueueEvents } = require('bullmq')
const { getBullConnection } = require('./connection')
const logger = require('../utils/logger')

const QUEUE_NAME = 'pdf-generation'

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff:  { type: 'exponential', delay: 2000 },
  removeOnComplete: {
    age:   60 * 60 * 24,   // keep completed 24 jam
    count: 1000,
  },
  removeOnFail: {
    age:   60 * 60 * 24 * 7, // keep failed 7 hari untuk debugging
  },
}

let queueInstance = null
let eventsInstance = null

function getPdfQueue() {
  if (queueInstance) return queueInstance
  queueInstance = new Queue(QUEUE_NAME, {
    connection:  getBullConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  })
  return queueInstance
}

function getPdfQueueEvents() {
  if (eventsInstance) return eventsInstance
  eventsInstance = new QueueEvents(QUEUE_NAME, {
    connection: getBullConnection(),
  })
  return eventsInstance
}

async function enqueuePdfJob(payload) {
  const queue = getPdfQueue()
  const job = await queue.add('generate', payload, {
    jobId: payload.pdfJobUuid,
  })
  logger.info(`[pdf.queue] enqueued ${job.id} (${payload.job_type}#${payload.record_id})`)
  return job
}

async function closePdfQueue() {
  if (queueInstance)  { await queueInstance.close().catch(() => {});  queueInstance = null }
  if (eventsInstance) { await eventsInstance.close().catch(() => {}); eventsInstance = null }
}

module.exports = {
  QUEUE_NAME,
  DEFAULT_JOB_OPTIONS,
  getPdfQueue,
  getPdfQueueEvents,
  enqueuePdfJob,
  closePdfQueue,
}
