'use strict'

const Joi = require('joi')

const RESET_POLICIES = ['yearly', 'never']

/**
 * Validasi format string nomor: hanya boleh berisi alfanumerik, dash, slash,
 * underscore, plus token {YYYY|MM|DD|SEQ|SEQ2|SEQ3|SEQ4}.
 *
 * Wajib mengandung minimal satu token sequence ({SEQ}, {SEQ2}, {SEQ3}, atau
 * {SEQ4}) supaya generator nomor menghasilkan nilai unik.
 */
function formatString() {
  return Joi.string()
    .trim()
    .min(1)
    .max(50)
    .custom((val, helpers) => {
      // Hanya tokens yang valid; karakter lain harus alfanumerik / -_/ / .
      const tokens = ['{YYYY}', '{MM}', '{DD}', '{SEQ}', '{SEQ2}', '{SEQ3}', '{SEQ4}']
      let body = val
      for (const t of tokens) {
        body = body.split(t).join('')
      }
      if (!/^[A-Za-z0-9\-_/.]*$/.test(body)) {
        return helpers.error('any.custom', { message: 'Format hanya boleh mengandung alfanumerik, dash, slash, underscore, dot, dan token {YYYY|MM|DD|SEQ|SEQ2|SEQ3|SEQ4}.' })
      }
      // Token sequence wajib.
      const hasSeq = ['{SEQ}', '{SEQ2}', '{SEQ3}', '{SEQ4}'].some(t => val.includes(t))
      if (!hasSeq) {
        return helpers.error('any.custom', { message: 'Format wajib memiliki minimal satu token {SEQ}/{SEQ2}/{SEQ3}/{SEQ4}.' })
      }
      // Token tidak duplikat — minimal warning, tapi kita allow (rare edge).
      return val
    })
    .messages({ 'any.custom': '{{#message}}' })
}

const updateNumberingSchema = Joi.object({
  sj_format:           formatString(),
  sj_seq_current:      Joi.number().integer().min(0),
  sj_seq_reset:        Joi.string().valid(...RESET_POLICIES),
  invoice_format:      formatString(),
  invoice_seq_current: Joi.number().integer().min(0),
  invoice_seq_reset:   Joi.string().valid(...RESET_POLICIES),
  // stock_* read-only di FE → tidak diterima di update.
}).min(1).messages({
  'object.min': 'Minimal satu field harus diubah.',
})

const updateCompanyProfileSchema = Joi.object({
  company_name:         Joi.string().trim().min(2).max(150),
  company_address:      Joi.string().trim().max(500).allow('', null),
  company_phone:        Joi.string().trim().max(50).allow('', null),
  company_email:        Joi.string().trim().lowercase().email().max(150).allow('', null),
  company_website:      Joi.string().trim().max(150).allow('', null),
  company_bank_name:    Joi.string().trim().max(50).allow('', null),
  company_bank_account: Joi.string().trim().max(50).allow('', null),
  company_bank_holder:  Joi.string().trim().max(150).allow('', null),
  default_tax_percent:  Joi.number().precision(2).min(0).max(100),
  // company_logo_path tidak diterima di sini — pakai endpoint upload terpisah.
}).min(1).messages({
  'object.min': 'Minimal satu field harus diubah.',
})

const createBankAccountSchema = Joi.object({
  bank_name:      Joi.string().trim().min(1).max(100).required(),
  account_number: Joi.string().trim().min(1).max(50).required(),
  account_holder: Joi.string().trim().min(1).max(150).required(),
  is_active:      Joi.boolean().default(true),
  sort_order:     Joi.number().integer().min(0).default(0),
})

const updateBankAccountSchema = Joi.object({
  bank_name:      Joi.string().trim().min(1).max(100),
  account_number: Joi.string().trim().min(1).max(50),
  account_holder: Joi.string().trim().min(1).max(150),
  is_active:      Joi.boolean(),
  sort_order:     Joi.number().integer().min(0),
}).min(1).messages({
  'object.min': 'Minimal satu field harus diubah.',
})

module.exports = {
  RESET_POLICIES,
  updateNumberingSchema,
  updateCompanyProfileSchema,
  createBankAccountSchema,
  updateBankAccountSchema,
}
