'use strict'

const { SystemSetting, Project } = require('../models')

function applyFormat(format, seq) {
  const now   = new Date()
  const yyyy  = now.getFullYear().toString()
  const mm    = String(now.getMonth() + 1).padStart(2, '0')
  const dd    = String(now.getDate()).padStart(2, '0')

  return format
    .replace('{YYYY}', yyyy)
    .replace('{MM}',   mm)
    .replace('{DD}',   dd)
    .replace('{SEQ4}', String(seq).padStart(4, '0'))
    .replace('{SEQ3}', String(seq).padStart(3, '0'))
    .replace('{SEQ2}', String(seq).padStart(2, '0'))
    .replace('{SEQ}',  String(seq))
}

async function generateNumber(formatKey, seqKey, transaction) {
  const [formatSetting, seqSetting] = await Promise.all([
    SystemSetting.findByPk(formatKey,  { transaction }),
    SystemSetting.findByPk(seqKey,     { transaction }),
  ])

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

async function generateProjectCode(t) {
  const year  = new Date().getFullYear()
  const count = await Project.count({ paranoid: false, transaction: t })
  const seq   = String(count + 1).padStart(3, '0')
  return `PRJ-${year}-${seq}`
}

module.exports = {
  generateNumber,
  generateSJNumber,
  generateInvoiceNumber,
  generateStockReceiptNumber,
  generateStockDisbursementNumber,
  generateProjectCode,
}
