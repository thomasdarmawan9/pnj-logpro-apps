'use strict'

const Joi = require('joi')

const PERIODS = ['this_month', 'last_month', 'all', 'custom']

const createDisbursementSchema = Joi.object({
  disbursement_date:     Joi.date().iso().required(),
  stock_item_uuid:       Joi.string().uuid({ version: ['uuidv4'] }).messages({
    'string.guid':  'stock_item_uuid tidak valid.',
  }),
  stock_item_id:         Joi.number().integer().min(1),
  qty:                   Joi.number().precision(2).min(0.01).required().messages({
    'number.min':   'Qty harus lebih dari 0.',
  }),
  kategori_name:         Joi.string().trim().max(50).allow('', null),
  delivery_order_uuid:   Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  delivery_order_id:     Joi.number().integer().min(1).allow(null),
  sj_number_manual:      Joi.string().trim().max(50).allow('', null),
  invoice_number_manual: Joi.string().trim().max(50).allow('', null),
  driver_name:           Joi.string().trim().max(100).allow('', null),
  vehicle_plate:         Joi.string().trim().max(20).allow('', null),
  destination:           Joi.string().trim().max(200).allow('', null),
  customer_uuid:         Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  customer_id:           Joi.number().integer().min(1).allow(null),
  notes:                 Joi.string().trim().allow('', null),
}).xor('stock_item_uuid', 'stock_item_id')
  .oxor('delivery_order_uuid', 'delivery_order_id')
  .oxor('customer_uuid', 'customer_id')
  .messages({
  'any.custom': '{{#message}}',
  'object.missing': 'stock_item_uuid atau stock_item_id wajib diisi.',
  'object.xor':     'Pilih salah satu: stock_item_uuid atau stock_item_id.',
})

const updateDisbursementSchema = Joi.object({
  disbursement_date:     Joi.date().iso(),
  stock_item_uuid:       Joi.string().uuid({ version: ['uuidv4'] }),
  stock_item_id:         Joi.number().integer().min(1),
  qty:                   Joi.number().precision(2).min(0.01),
  kategori_name:         Joi.string().trim().max(50).allow('', null),
  delivery_order_uuid:   Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  delivery_order_id:     Joi.number().integer().min(1).allow(null),
  sj_number_manual:      Joi.string().trim().max(50).allow('', null),
  invoice_number_manual: Joi.string().trim().max(50).allow('', null),
  driver_name:           Joi.string().trim().max(100).allow('', null),
  vehicle_plate:         Joi.string().trim().max(20).allow('', null),
  destination:           Joi.string().trim().max(200).allow('', null),
  customer_uuid:         Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  customer_id:           Joi.number().integer().min(1).allow(null),
  notes:                 Joi.string().trim().allow('', null),
}).oxor('stock_item_uuid', 'stock_item_id')
  .oxor('delivery_order_uuid', 'delivery_order_id')
  .oxor('customer_uuid', 'customer_id')
  .min(1).messages({
  'object.min': 'Minimal satu field harus diubah.',
})

const listDisbursementQuery = Joi.object({
  page:            Joi.number().integer().min(1).default(1),
  limit:           Joi.number().integer().min(1).max(100).default(20),
  search:          Joi.string().trim().allow('', null).default(''),
  customer_uuid:   Joi.string().uuid({ version: ['uuidv4'] }),
  stock_item_uuid: Joi.string().uuid({ version: ['uuidv4'] }),
  period:          Joi.string().valid(...PERIODS).default('all'),
  from:            Joi.date().iso(),
  to:              Joi.date().iso(),
})

module.exports = {
  PERIODS,
  createDisbursementSchema,
  updateDisbursementSchema,
  listDisbursementQuery,
}
