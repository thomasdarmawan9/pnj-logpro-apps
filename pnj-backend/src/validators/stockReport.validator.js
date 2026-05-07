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

module.exports = {
  PERIODS,
  listRecapQuery,
  listSummaryQuery,
}
