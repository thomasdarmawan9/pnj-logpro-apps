'use strict'

const Joi = require('joi')

const createStockItemSchema = Joi.object({
  code:        Joi.string().trim().uppercase().max(30).required(),
  name:        Joi.string().trim().min(2).max(150).required(),
  category:    Joi.string().trim().max(50).allow('', null),
  unit:        Joi.string().trim().max(20).required(),
  description: Joi.string().trim().allow('', null),
  is_active:   Joi.boolean().default(true),
})

const updateStockItemSchema = Joi.object({
  code:        Joi.string().trim().uppercase().max(30),
  name:        Joi.string().trim().min(2).max(150),
  category:    Joi.string().trim().max(50).allow('', null),
  unit:        Joi.string().trim().max(20),
  description: Joi.string().trim().allow('', null),
  is_active:   Joi.boolean(),
}).min(1)

const listStockItemsQuery = Joi.object({
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(20),
  search:    Joi.string().trim().allow('', null).default(''),
  category:  Joi.string().trim().allow('', null),
  is_active: Joi.boolean(),
})

module.exports = { createStockItemSchema, updateStockItemSchema, listStockItemsQuery }
