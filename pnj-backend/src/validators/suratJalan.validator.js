'use strict'

const Joi = require('joi')

const STATUSES  = ['draft', 'assigned', 'delivered', 'void']
const INV_STATES = ['no_invoice', 'attached']
const PERIODS    = ['today', 'week', 'month', 'last_month', 'all']

const sjItemSchema = Joi.object({
  id:              Joi.string().trim().max(36).allow('', null),
  description:     Joi.string().trim().max(255).allow('', null).default(''),
  qty:             Joi.number().min(0).default(1),
  unit:            Joi.string().trim().max(30).default('pcs'),
  unit_price:      Joi.number().min(0).default(0),
  notes:           Joi.string().trim().max(500).allow('', null).default(''),
  source_type:     Joi.string().valid('manual', 'stock').default('manual'),
  stock_item_id:   Joi.number().integer().min(1).allow(null),
  stock_item_uuid: Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  stock_item_code: Joi.string().trim().max(50).allow('', null),
  stock_item_name: Joi.string().trim().max(120).allow('', null),
  stock_kategori_name: Joi.string().trim().max(50).allow('', null),
}).custom((val, helpers) => {
  if (val.source_type === 'stock' && !val.stock_item_id && !val.stock_item_uuid) {
    return helpers.error('any.custom', { message: 'Item stok wajib dipilih untuk baris yang bersumber dari manajemen stok.' })
  }
  return val
}).messages({
  'any.custom': '{{#message}}',
})

const createSJSchema = Joi.object({
  project_uuid:        Joi.string().uuid({ version: ['uuidv4'] }),
  project_id:          Joi.number().integer().min(1).allow(null),
  customer_uuid:       Joi.string().uuid({ version: ['uuidv4'] }),
  customer_id:         Joi.number().integer().min(1).allow(null),
  fleet_uuid:          Joi.string().uuid({ version: ['uuidv4'] }),
  fleet_id:            Joi.number().integer().min(0),
  driver_uuid:         Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  driver_id:           Joi.number().integer().min(1).allow(null),
  driver_name_manual:  Joi.string().trim().max(100).allow('', null),
  sj_date:             Joi.date().iso().required(),
  origin:              Joi.string().trim().min(2).max(200).required(),
  destination:         Joi.string().trim().min(2).max(200).required(),
  cargo_description:   Joi.string().trim().allow('', null),
  items:               Joi.array().items(sjItemSchema).allow(null).default(null),
  operational_cost:    Joi.number().precision(2).min(0).default(0),
  internal_notes:      Joi.string().trim().allow('', null),
  publish:             Joi.boolean().default(false),
}).oxor('project_uuid', 'project_id')
  .oxor('customer_uuid', 'customer_id')
  .custom((val, helpers) => {
  const hasProject = !!val.project_uuid || !!val.project_id
  const hasCustomer = !!val.customer_uuid || !!val.customer_id
  if (!hasProject && !hasCustomer) {
    return helpers.error('any.custom', { message: 'Pilih project atau customer.' })
  }
  if (val.publish) {
    if (!val.fleet_uuid && !val.fleet_id) {
      return helpers.error('any.custom', { message: 'Fleet wajib dipilih untuk menerbitkan SJ.' })
    }
    if (!val.driver_uuid && !val.driver_id && !(val.driver_name_manual && val.driver_name_manual.trim())) {
      return helpers.error('any.custom', { message: 'Supir wajib diisi untuk menerbitkan SJ.' })
    }
  }
  return val
}).messages({
  'any.custom': '{{#message}}',
  'object.oxor': 'Pilih salah satu identifier untuk project/customer.',
})

const updateSJSchema = Joi.object({
  fleet_uuid:          Joi.string().uuid({ version: ['uuidv4'] }),
  fleet_id:            Joi.number().integer().min(1),
  driver_uuid:         Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  driver_id:           Joi.number().integer().min(1).allow(null),
  driver_name_manual:  Joi.string().trim().max(100).allow('', null),
  sj_date:             Joi.date().iso(),
  origin:              Joi.string().trim().min(2).max(200),
  destination:         Joi.string().trim().min(2).max(200),
  cargo_description:   Joi.string().trim().allow('', null),
  items:               Joi.array().items(sjItemSchema).allow(null),
  operational_cost:    Joi.number().precision(2).min(0),
  internal_notes:      Joi.string().trim().allow('', null),
  lampiran_paths:      Joi.array().items(Joi.string().trim().max(255)).allow(null),
}).min(1).messages({
  'object.min': 'Minimal satu field harus diubah.',
})

const assignSJSchema = Joi.object({
  fleet_uuid:          Joi.string().uuid({ version: ['uuidv4'] }),
  fleet_id:            Joi.number().integer().min(1),
  driver_uuid:         Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  driver_id:           Joi.number().integer().min(1).allow(null),
  driver_name_manual:  Joi.string().trim().max(100).allow('', null),
}).custom((val, helpers) => {
  if (!val.fleet_uuid && !val.fleet_id) {
    return helpers.error('any.custom', { message: 'Fleet wajib dipilih.' })
  }
  if (!val.driver_uuid && !val.driver_id && !(val.driver_name_manual && val.driver_name_manual.trim())) {
    return helpers.error('any.custom', { message: 'Supir wajib diisi.' })
  }
  return val
}).messages({
  'any.custom': '{{#message}}',
})

const deliverSJSchema = Joi.object({
  delivered_at: Joi.date().iso().required(),
})

const voidSJSchema = Joi.object({
  void_reason:   Joi.string().trim().min(10).max(500).required().messages({
    'string.min': 'Alasan void minimal 10 karakter.',
  }),
  confirmation:  Joi.string().valid('VOID').required().messages({
    'any.only':   'Ketik VOID untuk konfirmasi.',
  }),
  force_detach:  Joi.boolean().default(false),
})

const listSJQuery = Joi.object({
  page:           Joi.number().integer().min(1).default(1),
  limit:          Joi.number().integer().min(1).max(100).default(20),
  search:         Joi.string().trim().allow('', null).default(''),
  status:         Joi.string().valid(...STATUSES, 'all').default('all'),
  invoice_status: Joi.string().valid(...INV_STATES, 'all').default('all'),
  project_uuid:   Joi.string().uuid({ version: ['uuidv4'] }),
  customer_uuid:  Joi.string().uuid({ version: ['uuidv4'] }),
  period:         Joi.string().valid(...PERIODS).default('all'),
  from:           Joi.date().iso(),
  to:             Joi.date().iso(),
})

module.exports = {
  STATUSES, INV_STATES, PERIODS,
  createSJSchema,
  updateSJSchema,
  assignSJSchema,
  deliverSJSchema,
  voidSJSchema,
  listSJQuery,
}
