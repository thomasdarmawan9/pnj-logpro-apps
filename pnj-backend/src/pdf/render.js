'use strict'

/**
 * Renderer entrypoint dipanggil dari worker BullMQ.
 *
 * - Load record dari DB (SJ atau Invoice) lengkap dengan relasi.
 * - Open PDFKit doc → pipe ke file di env.pdf.outputDir.
 * - Pakai template `suratJalan.template` atau `invoice.template`.
 * - Return path file (relatif terhadap env.pdf.outputDir, tanpa leading slash).
 */

const fs   = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const sharp = require('sharp')

const env  = require('../config/env')
const logger = require('../utils/logger')
const sjRepo      = require('../repositories/deliveryOrder.repository')
const invoiceRepo = require('../repositories/invoice.repository')
const { getCompanyInfo } = require('../services/companySettings.service')
const sjTemplate      = require('./suratJalan.template')
const invoiceTemplate = require('./invoice.template')

/**
 * Konversi satu image file (webp/png/jpg) ke JPEG Buffer.
 * Return null jika file tidak ada, bukan image, atau gagal konversi.
 */
async function resolveImageBuffer(relPath) {
  if (!relPath || typeof relPath !== 'string') return null
  if (relPath.toLowerCase().endsWith('.pdf')) return null
  const absPath = path.resolve(env.upload.dir, relPath)
  if (!fs.existsSync(absPath)) return null
  try {
    return await sharp(absPath).jpeg({ quality: 85 }).toBuffer()
  } catch (err) {
    logger.warn(`[render] gagal konversi image ${relPath}: ${err.message}`)
    return null
  }
}

/**
 * Konversi lampiran images ke JPEG Buffer array, max 3 item.
 * PDF lampiran dilewati (PDFKit tidak bisa embed PDF sebagai image).
 */
async function resolveLampiranBuffers(lampiranPaths) {
  if (!Array.isArray(lampiranPaths) || lampiranPaths.length === 0) return []
  const imgPaths = lampiranPaths
    .filter(p => typeof p === 'string' && !p.toLowerCase().endsWith('.pdf'))
    .slice(0, 3)
  const results = await Promise.all(imgPaths.map(resolveImageBuffer))
  return results.filter(Boolean)
}

function ensureOutputDir() {
  const outputDir = path.resolve(env.pdf.outputDir)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  return outputDir
}

/**
 * Sanitize string untuk dipakai jadi filename.
 */
function safeFilename(s) {
  return String(s || '').replace(/[^a-zA-Z0-9_\-]/g, '_')
}

/**
 * Render PDF berdasarkan job_type + record_id. Return path file (absolut).
 *
 * @param {object} job — { job_type, record_id, options, pdfJobUuid }
 */
async function renderPdf(job) {
  const { job_type, record_id, options = {}, pdfJobUuid } = job

  const outputDir = ensureOutputDir()
  const company   = await getCompanyInfo()

  let record, prefix, numberLabel
  if (job_type === 'surat_jalan') {
    record = await sjRepo.findById(record_id)
    if (!record) throw new Error(`Surat Jalan dengan id ${record_id} tidak ditemukan.`)
    prefix      = 'SJ'
    numberLabel = record.sj_number
  } else if (job_type === 'invoice') {
    record = await invoiceRepo.findById(record_id)
    if (!record) throw new Error(`Invoice dengan id ${record_id} tidak ditemukan.`)
    prefix      = 'INV'
    numberLabel = record.invoice_number
  } else {
    throw new Error(`Unsupported job_type: ${job_type}`)
  }

  const plain = typeof record.get === 'function' ? record.get({ plain: true }) : record

  // Pre-process foto lampiran + POD sebelum render (sharp async, harus di luar Promise)
  let resolvedOptions = { ...options }
  if (options.includeLampiran !== false) {
    if (job_type === 'surat_jalan') {
      const [lampiranBuffers, podBuffer] = await Promise.all([
        resolveLampiranBuffers(plain.lampiran_paths),
        resolveImageBuffer(plain.pod_photo_path),
      ])
      if (lampiranBuffers.length > 0 || podBuffer) {
        resolvedOptions = { ...resolvedOptions, lampiranBuffers, podBuffer: podBuffer || null }
      }
    } else if (job_type === 'invoice') {
      const lampiranBuffers = await resolveLampiranBuffers(plain.lampiran_paths)
      if (lampiranBuffers.length > 0) {
        resolvedOptions = { ...resolvedOptions, lampiranBuffers }
      }
    }
  }

  const filename = `${prefix}_${safeFilename(numberLabel)}_${pdfJobUuid.slice(0, 8)}.pdf`
  const filePath = path.join(outputDir, filename)

  try {
    await new Promise((resolve, reject) => {
      // SJ pakai margin minimum karena layout dua-salinan manual
      const sjMargins = { top: 0, bottom: 0, left: 0, right: 0 }
      const invMargins = { top: 40, bottom: 40, left: 40, right: 40 }
      const doc = new PDFDocument({
        size:    'A4',
        margins: job_type === 'surat_jalan' ? sjMargins : invMargins,
        info: {
          Title:    `${prefix} ${numberLabel}`,
          Author:   company.name || 'PT. Pelangi Nuansa Jaya',
          Subject:  job_type === 'invoice' ? 'Invoice' : 'Surat Jalan',
          Producer: 'pnj-backend',
        },
      })

      const stream = fs.createWriteStream(filePath)
      stream.on('finish', resolve)
      stream.on('error',  reject)
      doc.on('error',     reject)

      doc.pipe(stream)

      try {
        if (job_type === 'surat_jalan') {
          sjTemplate.render(doc, plain, company, resolvedOptions)
        } else {
          invoiceTemplate.render(doc, plain, company, resolvedOptions)
        }
      } catch (err) {
        // PDFKit throw saat render — hentikan stream & reject.
        doc.destroy?.(err)
        return reject(err)
      }

      doc.end()
    })

    return filePath
  } catch (err) {
    // Cleanup partial file kalau render gagal di tengah jalan.
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath) } catch (_) { /* ignore */ }
    }
    throw err
  }
}

module.exports = { renderPdf, ensureOutputDir, safeFilename }
