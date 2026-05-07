'use strict'

const Joi = require('joi')

const PERIODS = ['this_month', 'last_month', 'all', 'custom']

const receiptItemSchema = Joi.object({
  stock_item_uuid: Joi.string().uuid({ version: ['uuidv4'] }).messages({
    'string.guid':  'stock_item_uuid tidak valid.',
    'any.required': 'stock_item_uuid wajib diisi.',
  }),
  stock_item_id:   Joi.number().integer().min(1),
  qty:             Joi.number().precision(2).min(0.01).required().messages({
    'number.min':   'Qty harus lebih dari 0.',
  }),
  kategori_name:   Joi.string().trim().max(50).allow('', null),
  notes:           Joi.string().trim().allow('', null),
}).xor('stock_item_uuid', 'stock_item_id').messages({
  'object.missing': 'stock_item_uuid atau stock_item_id wajib diisi.',
  'object.xor':     'Pilih salah satu: stock_item_uuid atau stock_item_id.',
})

const createReceiptSchema = Joi.object({
  receipt_date:    Joi.date().iso().required(),
  supplier_name:   Joi.string().trim().max(150).allow('', null),
  document_number: Joi.string().trim().max(100).allow('', null),
  customer_uuid:   Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  customer_id:     Joi.number().integer().min(1).allow(null),
  notes:           Joi.string().trim().allow('', null),
  items:           Joi.array().items(receiptItemSchema).min(1).required().messages({
    'array.min':    'Minimal 1 item harus diisi.',
  }),
}).oxor('customer_uuid', 'customer_id')

const updateReceiptSchema = Joi.object({
  receipt_date:    Joi.date().iso(),
  supplier_name:   Joi.string().trim().max(150).allow('', null),
  document_number: Joi.string().trim().max(100).allow('', null),
  customer_uuid:   Joi.string().uuid({ version: ['uuidv4'] }).allow(null),
  customer_id:     Joi.number().integer().min(1).allow(null),
  notes:           Joi.string().trim().allow('', null),
  items:           Joi.array().items(receiptItemSchema).min(1),
}).oxor('customer_uuid', 'customer_id').min(1).messages({
  'object.min': 'Minimal satu field harus diubah.',
})

const listReceiptQuery = Joi.object({
  page:           Joi.number().integer().min(1).default(1),
  limit:          Joi.number().integer().min(1).max(100).default(20),
  search:         Joi.string().trim().allow('', null).default(''),
  customer_uuid:  Joi.string().uuid({ version: ['uuidv4'] }),
  stock_item_uuid: Joi.string().uuid({ version: ['uuidv4'] }),
  period:         Joi.string().valid(...PERIODS).default('all'),
  from:           Joi.date().iso(),
  to:             Joi.date().iso(),
})

module.exports = {
  PERIODS,
  createReceiptSchema,
  updateReceiptSchema,
  listReceiptQuery,
}
