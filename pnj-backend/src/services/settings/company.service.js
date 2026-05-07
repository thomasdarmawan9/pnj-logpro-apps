'use strict'

const path = require('path')
const fs   = require('fs')
const { sequelize, SystemSetting } = require('../../models')
const env = require('../../config/env')
const logger = require('../../utils/logger')
const { NotFoundError } = require('../../utils/AppError')

const PROFILE_KEYS = [
  'company_name',
  'company_address',
  'company_phone',
  'company_email',
  'company_website',
  'company_bank_name',
  'company_bank_account',
  'company_bank_holder',
  'company_logo_path',
  'default_tax_percent',
]

const TEXT_KEYS = PROFILE_KEYS.filter(k => k !== 'default_tax_percent')

const LOGO_PUBLIC_URL = '/api/v1/settings/company/logo'

/**
 * Hitung mtime file logo untuk cache-bust (`?v=<unix_ms>`). Kalau file tidak
 * ada, return null → FE tahu logo belum di-upload.
 *
 * @param {string} relativePath  contoh: 'logos/abc.webp'
 */
function buildLogoUrl(relativePath) {
  if (!relativePath) return null
  try {
    const baseDir = path.resolve(env.upload.dir)
    const abs = path.resolve(baseDir, relativePath)
    if (!abs.startsWith(baseDir + path.sep)) return null
    if (!fs.existsSync(abs)) return null
    const stat = fs.statSync(abs)
    return `${LOGO_PUBLIC_URL}?v=${stat.mtimeMs.toString().replace('.', '')}`
  } catch (_) {
    return null
  }
}

/**
 * Get company profile dalam shape FE (CompanyProfile).
 *
 * `company_logo_path` di response adalah URL siap-pakai untuk `<img src>`,
 * bukan internal storage path. Format: '/api/v1/settings/company/logo?v=<mtime>'
 */
async function getCompanyProfile() {
  const rows = await SystemSetting.findAll({
    where: { key: PROFILE_KEYS },
    attributes: ['key', 'value'],
  })
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))

  return {
    company_name:         map.company_name         || '',
    company_address:      map.company_address      || '',
    company_phone:        map.company_phone        || '',
    company_email:        map.company_email        || '',
    company_website:      map.company_website      || '',
    company_bank_name:    map.company_bank_name    || '',
    company_bank_account: map.company_bank_account || '',
    company_bank_holder:  map.company_bank_holder  || '',
    company_logo_path:    buildLogoUrl(map.company_logo_path),
    default_tax_percent:  parseFloat(map.default_tax_percent || '0'),
  }
}

/**
 * Internal: ambil raw storage path (untuk PDF render, controller download).
 * Tidak dipanggil oleh route response.
 */
async function getRawLogoPath() {
  const row = await SystemSetting.findByPk('company_logo_path')
  return row?.value || null
}

/**
 * Update field text (semua kecuali logo path).
 */
async function updateCompanyProfile(payload) {
  const updates = []
  for (const k of TEXT_KEYS) {
    if (k in payload) {
      const value = payload[k] === null ? '' : String(payload[k])
      updates.push({ key: k, value })
    }
  }
  if ('default_tax_percent' in payload) {
    updates.push({ key: 'default_tax_percent', value: String(payload.default_tax_percent) })
  }

  if (updates.length === 0) return getCompanyProfile()

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

  return getCompanyProfile()
}

/**
 * Update company logo. `savedPath` adalah relative path hasil compressImage('logos').
 * Logo lama otomatis di-unlink kalau ada.
 */
async function updateCompanyLogo(savedPath) {
  if (!savedPath) {
    throw new Error('savedPath tidak boleh kosong.')
  }

  const oldPathRow = await SystemSetting.findByPk('company_logo_path')
  const oldPath = oldPathRow?.value || ''

  await sequelize.transaction(async (t) => {
    const [row, created] = await SystemSetting.findOrCreate({
      where: { key: 'company_logo_path' },
      defaults: { key: 'company_logo_path', value: savedPath },
      transaction: t,
    })
    if (!created) await row.update({ value: savedPath }, { transaction: t })
  })

  // Cleanup logo lama setelah commit (best-effort, abaikan error).
  if (oldPath && oldPath !== savedPath) {
    safeUnlink(oldPath)
  }

  return getCompanyProfile()
}

/**
 * Hapus logo (set jadi null + unlink file).
 */
async function removeCompanyLogo() {
  const oldPathRow = await SystemSetting.findByPk('company_logo_path')
  const oldPath = oldPathRow?.value || ''

  await sequelize.transaction(async (t) => {
    const [row, created] = await SystemSetting.findOrCreate({
      where: { key: 'company_logo_path' },
      defaults: { key: 'company_logo_path', value: '' },
      transaction: t,
    })
    if (!created) await row.update({ value: '' }, { transaction: t })
  })

  if (oldPath) safeUnlink(oldPath)
  return getCompanyProfile()
}

function safeUnlink(relativePath) {
  if (!relativePath) return
  try {
    const baseDir = path.resolve(env.upload.dir)
    const abs = path.resolve(baseDir, relativePath)
    if (!abs.startsWith(baseDir + path.sep)) return
    if (fs.existsSync(abs)) fs.unlinkSync(abs)
  } catch (err) {
    logger.warn(`[company.service] gagal hapus logo lama ${relativePath}: ${err.message}`)
  }
}

module.exports = {
  PROFILE_KEYS,
  LOGO_PUBLIC_URL,
  getCompanyProfile,
  getRawLogoPath,
  updateCompanyProfile,
  updateCompanyLogo,
  removeCompanyLogo,
  buildLogoUrl,
}
