'use strict'

const { SystemSetting } = require('../models')

function applyFormat(format, seq) {
  const now   = new Date()
  const yyyy  = now.getFullYear().toString()
  const mm    = String(now.getMonth() + 1).padStart(2, '0')
  const dd    = String(now.getDate()).padStart(2, '0')

  // Pakai global regex supaya semua occurrence di-replace, bukan cuma yang
  // pertama (kasus user pakai format dengan token duplikat).
  return format
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{MM\}/g,   mm)
    .replace(/\{DD\}/g,   dd)
    .replace(/\{SEQ4\}/g, String(seq).padStart(4, '0'))
    .replace(/\{SEQ3\}/g, String(seq).padStart(3, '0'))
    .replace(/\{SEQ2\}/g, String(seq).padStart(2, '0'))
    .replace(/\{SEQ\}/g,  String(seq))
}

async function generateNumber(formatKey, seqKey, transaction) {
  // Lock seqSetting row sebelum baca supaya concurrent transactions tidak
  // membaca nilai yang sama dan menghasilkan nomor dokumen duplikat.
  const formatSetting = await SystemSetting.findByPk(formatKey, { transaction })
  const seqSetting    = await SystemSetting.findByPk(seqKey, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  })

  if (!formatSetting || !seqSetting) {
    throw new Error(`Konfigurasi nomor dokumen tidak ditemukan: ${formatKey} / ${seqKey}`)
  }

  const nextSeq = parseInt(seqSetting.value, 10) + 1

  await SystemSetting.update(
    { value: String(nextSeq) },
    { where: { key: seqKey }, transaction }
  )

  return applyFormat(formatSetting.value, nextSeq)
}

async function generateSJNumber(t) {
  return generateNumber('sj_number_format', 'sj_seq_current', t)
}

async function generateInvoiceNumber(t) {
  return generateNumber('invoice_number_format', 'invoice_seq_current', t)
}

async function generateStockReceiptNumber(t) {
  return generateNumber('stock_receipt_format', 'stock_receipt_seq_current', t)
}

async function generateStockDisbursementNumber(t) {
  return generateNumber('stock_disburse_format', 'stock_disburse_seq_current', t)
}

/**
 * Project code pakai sequence counter dari system_settings
 * (`project_code_seq_current`) — seq-aware & aman concurrent di dalam transaksi.
 * Format fix: PRJ-YYYY-NNN.
 */
async function generateProjectCode(t) {
  const seqSetting = await SystemSetting.findByPk('project_code_seq_current', { transaction: t })
  if (!seqSetting) {
    throw new Error('Konfigurasi project_code_seq_current belum di-seed.')
  }
  const nextSeq = parseInt(seqSetting.value, 10) + 1
  await SystemSetting.update(
    { value: String(nextSeq) },
    { where: { key: 'project_code_seq_current' }, transaction: t }
  )
  const year = new Date().getFullYear()
  return `PRJ-${year}-${String(nextSeq).padStart(3, '0')}`
}

module.exports = {
  generateNumber,
  generateSJNumber,
  generateInvoiceNumber,
  generateStockReceiptNumber,
  generateStockDisbursementNumber,
  generateProjectCode,
}
