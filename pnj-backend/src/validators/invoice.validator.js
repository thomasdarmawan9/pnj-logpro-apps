'use strict'

const Joi = require('joi')

const STATUSES = ['draft', 'sent', 'outstanding', 'paid', 'void']
const PAYMENT_METHODS = ['transfer', 'cash', 'check']
const SERVICE_TYPES = ['delivery', 'rental', 'other']
const DELIVERY_PRICING_MODES = ['shipment', 'item']
const PERIODS = ['today', 'week', 'month', 'last_month', 'all']
const DELIVERY_ADDITIONAL_CHARGE_LABEL = 'Pembiayaan Lainnya'

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
  uuid:          Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  source_sj_id:  Joi.number().integer().min(1).allow(null),
  fleet_uuid:    Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  fleet_id:      Joi.number().integer().min(1).allow(null),
  driver_uuid:   Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  driver_id:     Joi.number().integer().min(1).allow(null),
  driver_name_manual: Joi.string().trim().max(100).allow('', null),
  fleet_label:   Joi.string().trim().min(1).max(150).required(),
  description:   Joi.string().trim().allow('', null),
  period_start:  Joi.date().iso().allow(null),
  period_end:    Joi.date().iso().allow(null),
  rental_duration_years:  Joi.number().integer().min(0).default(0),
  rental_duration_months: Joi.number().integer().min(0).default(0),
  rental_duration_days:   Joi.number().integer().min(0).default(0),
  rental_duration_hours:  Joi.number().integer().min(0).default(0),
  qty:           Joi.number().precision(2).min(0.01).required(),
  unit:          Joi.string().trim().max(20).default('Unit'),
  cargo_qty:     Joi.number().integer().min(0).allow(null),
  cargo_unit:    Joi.string().trim().max(30).allow('', null),
  cargo_weight:  Joi.number().precision(2).min(0).allow(null),
  cargo_volume:  Joi.number().precision(2).min(0).allow(null),
  cargo_notes:   Joi.string().trim().max(500).allow('', null),
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

function isDeliveryAdditionalCharge(item) {
  return item.fleet_label === DELIVERY_ADDITIONAL_CHARGE_LABEL &&
    Number(item.unit_price || 0) > 0 &&
    (item.cargo_qty === null || item.cargo_qty === undefined)
}

function effectiveServiceType(serviceType, customServiceName) {
  if (serviceType === 'rental') return 'rental'
  if (serviceType === 'other') {
    const name = String(customServiceName || '').toLowerCase()
    if (name.includes('penyewaan') || name.includes('sewa')) return 'rental'
    if (name.includes('pengiriman')) return 'delivery'
  }
  return 'delivery'
}

function validateDeliveryPricingPayload(val, helpers) {
  const serviceType = effectiveServiceType(val.service_type || 'delivery', val.custom_service_name)
  if (serviceType === 'rental' && !val.delivery_pricing_mode) return val
  const mode = val.delivery_pricing_mode || 'shipment'
  if (!Array.isArray(val.items)) return val
  const items = val.items
  const billableItems = items.filter(item => !isDeliveryAdditionalCharge(item))

  if (serviceType !== 'rental' && billableItems.length === 0) {
    if (mode === 'item') {
      return helpers.error('any.custom', { message: 'Minimal 1 rincian barang/muatan wajib diisi untuk mode harga per barang.' })
    }
    return val
  }

  if (mode === 'item') {
    const invalidIndex = billableItems.findIndex(item => Number(item.qty || 0) <= 0 || Number(item.unit_price || 0) <= 0)
    if (invalidIndex >= 0) {
      return helpers.error('any.custom', { message: `Harga barang baris ${invalidIndex + 1} wajib diisi untuk mode harga per barang.` })
    }
  }

  if (mode === 'shipment' && serviceType !== 'rental') {
    const hasShipmentPrice = billableItems.some(item => Number(item.qty || 0) > 0 && Number(item.unit_price || 0) > 0)
    if (!hasShipmentPrice) {
      return helpers.error('any.custom', { message: 'Harga pengiriman wajib diisi.' })
    }
  }

  return val
}

const createInvoiceSchema = Joi.object({
  project_uuid:     Joi.string().uuid({ version: ['uuidv4'] }),
  project_id:       Joi.number().integer().min(1).allow(null),
  customer_uuid:    Joi.string().uuid({ version: ['uuidv4'] }),
  customer_id:      Joi.number().integer().min(1).allow(null),
  invoice_date:     Joi.date().iso().required(),
  due_date:         Joi.date().iso().min(Joi.ref('invoice_date')).required().messages({
    'date.min': 'Tanggal jatuh tempo tidak boleh lebih kecil dari tanggal invoice.',
  }),
  service_type:     Joi.string().valid(...SERVICE_TYPES).required(),
  custom_service_name: Joi.string().trim().max(100).allow('', null),
  delivery_pricing_mode: Joi.string().valid(...DELIVERY_PRICING_MODES).default('shipment'),
  payment_method:   Joi.string().valid('transfer', 'cash', 'check').default('transfer'),
  bank_account_id:  Joi.number().integer().min(1).allow(null).optional(),
  tax_percent:      Joi.number().precision(2).min(0).max(100).default(0),
  pph_percent:      Joi.number().precision(2).min(0).max(100).default(0),
  insurance_amount: Joi.number().precision(2).min(0).default(0),
  notes:            Joi.string().trim().allow('', null),
  origin:           Joi.string().trim().max(200).allow('', null),
  destination:      Joi.string().trim().max(200).allow('', null),
  cargo_description: Joi.string().trim().allow('', null),
  manual_sj_numbers: Joi.string().trim().max(1000).allow('', null),
  linked_sj_uuids: Joi.array().items(Joi.string().uuid({ version: ['uuidv4'] })).default([]),
  items:            Joi.array().items(itemSchema).min(0).default([]),
  send_immediately: Joi.boolean().default(false),
  // DP opsional saat create. Kalau dikirim → otomatis dibuat sebagai
  // Payment(is_down_payment=true) di transaksi yang sama dgn invoice.
  down_payment:     downPaymentSchema.optional(),
  }).oxor('project_uuid', 'project_id')
  .oxor('customer_uuid', 'customer_id')
  .custom((val, helpers) => {
    const hasProject = !!val.project_uuid || !!val.project_id
    const hasCustomer = !!val.customer_uuid || !!val.customer_id
    if (!hasProject && !hasCustomer) {
      return helpers.error('any.custom', { message: 'Pilih project atau customer.' })
    }
    if (val.service_type === 'other' && !String(val.custom_service_name || '').trim()) {
      return helpers.error('any.custom', { message: 'Nama jasa wajib diisi untuk jenis jasa lainnya.' })
    }
    if (val.payment_method === 'transfer' && !val.bank_account_id) {
      return helpers.error('any.custom', { message: 'Rekening tujuan wajib dipilih untuk metode Transfer Bank.' })
    }
    if (effectiveServiceType(val.service_type, val.custom_service_name) === 'rental' && (!Array.isArray(val.items) || val.items.length === 0)) {
      return helpers.error('any.custom', { message: 'Minimal 1 rincian item wajib diisi untuk invoice penyewaan.' })
    }
    return val
  })
  .custom(validateDeliveryPricingPayload)
  .messages({
  'any.custom': '{{#message}}',
  'object.oxor': 'Pilih salah satu identifier untuk project/customer.',
})

const updateInvoiceSchema = Joi.object({
  invoice_date:    Joi.date().iso(),
  due_date:        Joi.date().iso(),
  delivery_pricing_mode: Joi.string().valid(...DELIVERY_PRICING_MODES),
  payment_method:  Joi.string().valid('transfer', 'cash', 'check'),
  bank_account_id: Joi.number().integer().min(1).allow(null).optional(),
  tax_percent:      Joi.number().precision(2).min(0).max(100),
  pph_percent:      Joi.number().precision(2).min(0).max(100),
  insurance_amount: Joi.number().precision(2).min(0),
  notes:            Joi.string().trim().allow('', null),
  origin:           Joi.string().trim().max(200).allow('', null),
  destination:      Joi.string().trim().max(200).allow('', null),
  cargo_description: Joi.string().trim().allow('', null),
  manual_sj_numbers: Joi.string().trim().max(1000).allow('', null),
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
})
  .custom(validateDeliveryPricingPayload)
  .messages({
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
  SERVICE_TYPES,
  DELIVERY_PRICING_MODES,
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
