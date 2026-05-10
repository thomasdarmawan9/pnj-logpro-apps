'use strict'

const Joi = require('joi')

const STATUSES = ['draft', 'sent', 'outstanding', 'paid', 'void']
const PAYMENT_METHODS = ['transfer', 'cash', 'check']
const PERIODS = ['today', 'week', 'month', 'last_month', 'all']

/**
 * Down Payment (DP / Uang Muka) sub-schema.
 *  - Boleh dikirim saat create invoice atau via update.
 *  - Untuk CLEAR DP existing: kirim `down_payment: null`.
 *  - Untuk SET/REPLACE: kirim object dengan amount > 0.
 */
const downPaymentSchema = Joi.object({
  payment_date: Joi.date().iso().required(),
  amount:       Joi.number().precision(2).min(0.01).required().messages({
    'number.min': 'Nominal DP harus lebih dari 0.',
  }),
  method:       Joi.string().valid(...PAYMENT_METHODS).required(),
  proof_path:   Joi.string().trim().max(255).allow('', null),
  notes:        Joi.string().trim().allow('', null),
})

const itemSchema = Joi.object({
  fleet_uuid:    Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  fleet_id:      Joi.number().integer().min(1).allow(null),
  fleet_label:   Joi.string().trim().min(1).max(150).required(),
  description:   Joi.string().trim().allow('', null),
  period_start:  Joi.date().iso().allow(null),
  period_end:    Joi.date().iso().allow(null),
  qty:           Joi.number().precision(2).min(0.01).required(),
  unit:          Joi.string().trim().max(20).default('Unit'),
  unit_price:    Joi.number().precision(2).min(0).required(),
  sort_order:    Joi.number().integer().min(0).default(0),
}).custom((val, helpers) => {
  if (val.period_start && val.period_end &&
      new Date(val.period_start) > new Date(val.period_end)) {
    return helpers.error('any.custom', { message: 'period_start tidak boleh lebih besar dari period_end.' })
  }
  return val
}).messages({
  'any.custom': '{{#message}}',
})

const createInvoiceSchema = Joi.object({
  project_uuid:     Joi.string().uuid({ version: ['uuidv4'] }),
  project_id:       Joi.number().integer().min(1),
  invoice_date:     Joi.date().iso().required(),
  due_date:         Joi.date().iso().min(Joi.ref('invoice_date')).required().messages({
    'date.min': 'Tanggal jatuh tempo tidak boleh lebih kecil dari tanggal invoice.',
  }),
  payment_method:   Joi.string().valid('transfer', 'cash', 'check').default('transfer'),
  bank_account_id:  Joi.number().integer().min(1).allow(null).optional(),
  tax_percent:      Joi.number().precision(2).min(0).max(100).default(0),
  pph_percent:      Joi.number().precision(2).min(0).max(100).default(0),
  notes:            Joi.string().trim().allow('', null),
  items:            Joi.array().items(itemSchema).min(0).default([]),
  send_immediately: Joi.boolean().default(false),
  // DP opsional saat create. Kalau dikirim → otomatis dibuat sebagai
  // Payment(is_down_payment=true) di transaksi yang sama dgn invoice.
  down_payment:     downPaymentSchema.optional(),
}).xor('project_uuid', 'project_id').messages({
  'object.missing': 'project_uuid atau project_id wajib diisi.',
  'object.xor':     'Pilih salah satu: project_uuid atau project_id.',
})

const updateInvoiceSchema = Joi.object({
  invoice_date:    Joi.date().iso(),
  due_date:        Joi.date().iso(),
  payment_method:  Joi.string().valid('transfer', 'cash', 'check'),
  bank_account_id: Joi.number().integer().min(1).allow(null).optional(),
  tax_percent:     Joi.number().precision(2).min(0).max(100),
  pph_percent:     Joi.number().precision(2).min(0).max(100),
  notes:           Joi.string().trim().allow('', null),
  items:           Joi.array().items(itemSchema).min(1),
  lampiran_paths:  Joi.array().items(Joi.string().trim().max(255)).allow(null),
  // DP edit:
  //   - object → upsert (create kalau belum ada, replace kalau sudah)
  //   - null   → hapus DP existing
  //   - tidak dikirim → tidak diubah
  down_payment:    downPaymentSchema.allow(null),
}).min(1).custom((val, helpers) => {
  if (val.invoice_date && val.due_date &&
      new Date(val.due_date) < new Date(val.invoice_date)) {
    return helpers.error('any.custom', { message: 'due_date tidak boleh lebih kecil dari invoice_date.' })
  }
  return val
}).messages({
  'object.min': 'Minimal satu field harus diubah.',
  'any.custom': '{{#message}}',
})

const recordPaymentSchema = Joi.object({
  payment_date:  Joi.date().iso().required(),
  amount:        Joi.number().precision(2).min(0.01).required(),
  method:        Joi.string().valid(...PAYMENT_METHODS).required(),
  proof_path:    Joi.string().trim().max(255).allow('', null),
  notes:         Joi.string().trim().allow('', null),
})

const voidInvoiceSchema = Joi.object({
  void_reason:  Joi.string().trim().min(10).max(500).required().messages({
    'string.min': 'Alasan void minimal 10 karakter.',
  }),
  confirmation: Joi.string().valid('VOID').required().messages({
    'any.only':   'Ketik VOID untuk konfirmasi.',
  }),
})

const attachSJSchema = Joi.object({
  sj_uuids: Joi.array()
    .items(Joi.string().uuid({ version: ['uuidv4'] }))
    .min(1)
    .required()
    .messages({
      'array.min': 'Minimal 1 SJ harus dipilih.',
    }),
})

const detachSJParamSchema = Joi.object({
  uuid: Joi.string().uuid({ version: ['uuidv4'] }).required().messages({
    'string.guid':  'Parameter uuid invoice tidak valid.',
    'any.required': 'Parameter uuid invoice wajib ada.',
  }),
  sjUuid: Joi.string().uuid({ version: ['uuidv4'] }).required().messages({
    'string.guid':  'Parameter sjUuid tidak valid.',
    'any.required': 'Parameter sjUuid wajib ada.',
  }),
})

const listInvoiceQuery = Joi.object({
  page:           Joi.number().integer().min(1).default(1),
  limit:          Joi.number().integer().min(1).max(100).default(20),
  search:         Joi.string().trim().allow('', null).default(''),
  status:         Joi.string().valid(...STATUSES, 'all').default('all'),
  customer_uuid:  Joi.string().uuid({ version: ['uuidv4'] }),
  project_uuid:   Joi.string().uuid({ version: ['uuidv4'] }),
  period:         Joi.string().valid(...PERIODS).default('all'),
  from:           Joi.date().iso(),
  to:             Joi.date().iso(),
})

module.exports = {
  STATUSES,
  PAYMENT_METHODS,
  PERIODS,
  downPaymentSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
  voidInvoiceSchema,
  attachSJSchema,
  detachSJParamSchema,
  listInvoiceQuery,
}
