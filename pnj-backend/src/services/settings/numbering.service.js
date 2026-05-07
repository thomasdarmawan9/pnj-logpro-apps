'use strict'

const { sequelize, SystemSetting } = require('../../models')

/**
 * BE storage key ↔ FE entity field mapping.
 * BE pakai *_number_format (legacy konvensi); FE expect *_format.
 */
const KEYS = {
  // SJ
  sj_format:                'sj_number_format',
  sj_seq_current:           'sj_seq_current',
  sj_seq_reset:             'sj_seq_reset',
  // Invoice
  invoice_format:           'invoice_number_format',
  invoice_seq_current:      'invoice_seq_current',
  invoice_seq_reset:        'invoice_seq_reset',
  // Stock — read-only di FE.
  stock_receipt_format:     'stock_receipt_format',
  stock_disburse_format:    'stock_disburse_format',
}

const ALL_KEYS = Object.values(KEYS)

/**
 * Ambil semua numbering settings dari DB → konversi ke FE shape.
 */
async function getNumberingSettings() {
  const rows = await SystemSetting.findAll({
    where: { key: ALL_KEYS },
    attributes: ['key', 'value'],
  })
  const beMap = Object.fromEntries(rows.map(r => [r.key, r.value]))

  return {
    sj_format:             beMap[KEYS.sj_format]            || 'SJ-{YYYY}-{SEQ4}',
    sj_seq_current:        toInt(beMap[KEYS.sj_seq_current], 0),
    sj_seq_reset:          beMap[KEYS.sj_seq_reset]         || 'yearly',
    invoice_format:        beMap[KEYS.invoice_format]       || '{SEQ}',
    invoice_seq_current:   toInt(beMap[KEYS.invoice_seq_current], 0),
    invoice_seq_reset:     beMap[KEYS.invoice_seq_reset]    || 'never',
    stock_receipt_format:  beMap[KEYS.stock_receipt_format] || 'STK-MSK-{YYYY}-{SEQ3}',
    stock_disburse_format: beMap[KEYS.stock_disburse_format]|| 'STK-KLR-{YYYY}-{SEQ3}',
  }
}

/**
 * Update numbering settings. payload pakai FE keys (sj_format, dst), service
 * map ke BE keys.
 */
async function updateNumberingSettings(payload) {
  const updates = []
  for (const [feKey, beKey] of Object.entries(KEYS)) {
    if (feKey in payload) {
      const v = payload[feKey]
      // SystemSetting.value adalah TEXT (string).
      const stringValue = String(v)
      updates.push({ key: beKey, value: stringValue })
    }
  }
  if (updates.length === 0) return getNumberingSettings()

  await sequelize.transaction(async (t) => {
    for (const { key, value } of updates) {
      const [row, created] = await SystemSetting.findOrCreate({
        where: { key },
        defaults: { key, value },
        transaction: t,
      })
      if (!created) {
        await row.update({ value }, { transaction: t })
      }
    }
  })

  return getNumberingSettings()
}

function toInt(v, fallback = 0) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : fallback
}

module.exports = {
  KEYS,
  getNumberingSettings,
  updateNumberingSettings,
}
