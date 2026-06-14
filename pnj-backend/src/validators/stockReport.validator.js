'use strict'

const Joi = require('joi')

const PERIODS = ['this_month', 'last_month', 'all', 'custom']

const listRecapQuery = Joi.object({
  stock_item_uuid: Joi.string().uuid({ version: ['uuidv4'] }).required().messages({
    'any.required': 'stock_item_uuid wajib diisi.',
    'string.guid':  'stock_item_uuid tidak valid.',
  }),
  customer_uuid:   Joi.string().uuid({ version: ['uuidv4'] }),
  period:          Joi.string().valid(...PERIODS).default('all'),
  from:            Joi.date().iso(),
  to:              Joi.date().iso(),
})

const listSummaryQuery = Joi.object({
  search:    Joi.string().trim().allow('', null).default(''),
  category:  Joi.string().trim().allow('', null),
  is_active: Joi.boolean(),
})

const customerStockItemParams = Joi.object({
  uuid: Joi.string().uuid({ version: ['uuidv4'] }).required().messages({
    'string.guid':  'Parameter customer uuid tidak valid.',
    'any.required': 'Parameter customer uuid wajib ada.',
  }),
  stockItemCode: Joi.string().trim().min(1).max(30).required().messages({
    'string.empty': 'Parameter kode barang wajib ada.',
    'any.required': 'Parameter kode barang wajib ada.',
  }),
})

const adjustCustomerStockItemSchema = Joi.object({
  category_name: Joi.string().trim().max(50).allow('', null),
  qty:           Joi.number().precision(2).min(0).required().messages({
    'number.min':   'Qty saldo (sisa stock) tidak boleh negatif.',
    'any.required': 'Qty saldo (sisa stock) wajib diisi.',
  }),
  notes:         Joi.string().trim().allow('', null),
})

module.exports = {
  PERIODS,
  listRecapQuery,
  listSummaryQuery,
  customerStockItemParams,
  adjustCustomerStockItemSchema,
}
