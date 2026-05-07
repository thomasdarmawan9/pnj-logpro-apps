'use strict'

const express          = require('express')
const router           = express.Router()
const { authenticate } = require('../middlewares/auth.middleware')
const { isAnyRole, isSuperAdmin } = require('../middlewares/rbac.middleware')
const { upload, compressImage }   = require('../middlewares/upload.middleware')
const { validate } = require('../middlewares/validate.middleware')

const {
  updateNumberingSchema,
  updateCompanyProfileSchema,
  createBankAccountSchema,
  updateBankAccountSchema,
} = require('../validators/settings.validator')
const { logActivity } = require('../middlewares/activityLog.middleware')
const controller = require('../controllers/settings.controller')

// ── Public: company logo ──────────────────────────────────────────────────
// Logo perusahaan adalah branding publik (sudah tampil di tiap PDF invoice/SJ
// yang dikirim ke customer), jadi endpoint download dibuat publik supaya
// browser bisa pakai langsung di `<img src>` (tag <img> tidak kirim
// Authorization header). Cache-bust pakai `?v=<mtime>` di sisi response.
router.get('/company/logo', controller.downloadCompanyLogo)

// Semua endpoint di bawah butuh auth.
router.use(authenticate)

// ── Company Profile ───────────────────────────────────────────────────────
router.get('/company',
  isAnyRole,                    // semua role boleh baca (untuk render PDF, kop, dll)
  controller.getCompany,
)

router.put('/company',
  isSuperAdmin,
  validate(updateCompanyProfileSchema),
  logActivity('update_setting', 'settings', {
    labelExtractor: () => 'company_profile',
  }),
  controller.updateCompany,
)

router.post('/company/logo',
  isSuperAdmin,
  upload.single('logo'),
  compressImage('logos'),
  logActivity('upload_logo', 'settings', {
    labelExtractor: () => 'company_logo',
    skipBody:       true,
  }),
  controller.uploadCompanyLogo,
)

router.delete('/company/logo',
  isSuperAdmin,
  logActivity('delete_logo', 'settings', {
    labelExtractor: () => 'company_logo',
    skipBody:       true,
  }),
  controller.removeCompanyLogo,
)

// ── Bank Accounts ─────────────────────────────────────────────────────────
router.get('/bank-accounts',
  isAnyRole,
  controller.getBankAccounts,
)

router.post('/bank-accounts',
  isSuperAdmin,
  validate(createBankAccountSchema),
  controller.createBankAccount,
)

router.put('/bank-accounts/:uuid',
  isSuperAdmin,
  validate(updateBankAccountSchema),
  controller.updateBankAccount,
)

router.delete('/bank-accounts/:uuid',
  isSuperAdmin,
  controller.deleteBankAccount,
)

// ── Numbering ─────────────────────────────────────────────────────────────
router.get('/numbering',
  isSuperAdmin,
  controller.getNumbering,
)

router.put('/numbering',
  isSuperAdmin,
  validate(updateNumberingSchema),
  logActivity('update_setting', 'settings', {
    labelExtractor: () => 'numbering',
  }),
  controller.updateNumbering,
)

module.exports = router
