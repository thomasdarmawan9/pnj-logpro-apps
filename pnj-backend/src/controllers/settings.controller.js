'use strict'

const fs = require('fs')
const path = require('path')
const asyncHandler = require('../utils/asyncHandler')
const { success } = require('../utils/response')
const { BadRequestError, NotFoundError } = require('../utils/AppError')
const env = require('../config/env')

const numberingSvc    = require('../services/settings/numbering.service')
const companySvc      = require('../services/settings/company.service')
const bankAccountSvc  = require('../services/settings/bankAccount.service')

// ── Numbering ─────────────────────────────────────────────────────────────
const getNumbering = asyncHandler(async (req, res) => {
  const data = await numberingSvc.getNumberingSettings()
  res.json(success(data))
})

const updateNumbering = asyncHandler(async (req, res) => {
  const data = await numberingSvc.updateNumberingSettings(req.body)
  res.json(success(data, 'Pengaturan nomor berhasil disimpan.'))
})

// ── Company Profile ───────────────────────────────────────────────────────
const getCompany = asyncHandler(async (req, res) => {
  const data = await companySvc.getCompanyProfile()
  res.json(success(data))
})

const updateCompany = asyncHandler(async (req, res) => {
  const data = await companySvc.updateCompanyProfile(req.body)
  res.json(success(data, 'Profil perusahaan berhasil disimpan.'))
})

const uploadCompanyLogo = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.savedPath) {
    throw new BadRequestError('File logo wajib diupload pada field "logo".')
  }
  const data = await companySvc.updateCompanyLogo(req.file.savedPath)
  res.status(201).json(success(data, 'Logo perusahaan berhasil diunggah.'))
})

const removeCompanyLogo = asyncHandler(async (req, res) => {
  const data = await companySvc.removeCompanyLogo()
  res.json(success(data, 'Logo perusahaan berhasil dihapus.'))
})

const downloadCompanyLogo = asyncHandler(async (req, res) => {
  // Pakai raw path dari storage (bukan getCompanyProfile yang sudah return URL).
  const rawPath = await companySvc.getRawLogoPath()
  if (!rawPath) {
    throw new NotFoundError('Logo perusahaan belum diupload.')
  }
  const baseDir = path.resolve(env.upload.dir)
  const abs = path.resolve(baseDir, rawPath)
  if (!abs.startsWith(baseDir + path.sep) || !fs.existsSync(abs)) {
    throw new NotFoundError('File logo tidak ditemukan di server.')
  }
  const ext = abs.toLowerCase().split('.').pop()
  const contentType = ext === 'webp' ? 'image/webp'
                    : ext === 'png'  ? 'image/png'
                    : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                    : 'application/octet-stream'
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(abs)}"`)
  // Cache logo selama 1 jam — invalidasi via ?v=<mtime> query param dari FE.
  res.setHeader('Cache-Control', 'public, max-age=3600')
  fs.createReadStream(abs).pipe(res)
})

// ── Bank Accounts ─────────────────────────────────────────────────────────
const getBankAccounts = asyncHandler(async (req, res) => {
  const data = await bankAccountSvc.getAll()
  res.json(success(data))
})

const createBankAccount = asyncHandler(async (req, res) => {
  const data = await bankAccountSvc.create(req.body)
  res.status(201).json(success(data, 'Rekening bank berhasil ditambahkan.'))
})

const updateBankAccount = asyncHandler(async (req, res) => {
  const data = await bankAccountSvc.update(req.params.uuid, req.body)
  res.json(success(data, 'Rekening bank berhasil diubah.'))
})

const deleteBankAccount = asyncHandler(async (req, res) => {
  await bankAccountSvc.remove(req.params.uuid)
  res.json(success(null, 'Rekening bank berhasil dihapus.'))
})

module.exports = {
  getNumbering,
  updateNumbering,
  getCompany,
  updateCompany,
  uploadCompanyLogo,
  removeCompanyLogo,
  downloadCompanyLogo,
  getBankAccounts,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
}
