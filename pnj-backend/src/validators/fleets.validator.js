'use strict'

const Joi = require('joi')

const CATEGORIES = ['truck', 'trailer', 'family_car', 'heavy_equipment', 'other']
const STATUSES   = ['active', 'inactive', 'sold']

const createFleetSchema = Joi.object({
  plate_number: Joi.string().trim().max(20).uppercase().required(),
  name:         Joi.string().trim().min(2).max(100).required(),
  category:     Joi.string().valid(...CATEGORIES).required(),
  brand:        Joi.string().trim().max(50).allow('', null),
  year:         Joi.number().integer().min(1970).max(new Date().getFullYear() + 1).allow(null),
  capacity_ton: Joi.number().precision(2).min(0).allow(null),
  status:       Joi.string().valid(...STATUSES).default('active'),
  notes:        Joi.string().trim().allow('', null),
})

const updateFleetSchema = Joi.object({
  plate_number: Joi.string().trim().max(20).uppercase(),
  name:         Joi.string().trim().min(2).max(100),
  category:     Joi.string().valid(...CATEGORIES),
  brand:        Joi.string().trim().max(50).allow('', null),
  year:         Joi.number().integer().min(1970).max(new Date().getFullYear() + 1).allow(null),
  capacity_ton: Joi.number().precision(2).min(0).allow(null),
  status:       Joi.string().valid(...STATUSES),
  notes:        Joi.string().trim().allow('', null),
}).min(1)

const listFleetsQuery = Joi.object({
  page:     Joi.number().integer().min(1).default(1),
  limit:    Joi.number().integer().min(1).max(100).default(20),
  search:   Joi.string().trim().allow('', null).default(''),
  category: Joi.string().valid(...CATEGORIES),
  status:   Joi.string().valid(...STATUSES),
  include_tbd: Joi.boolean().default(true),
})

module.exports = {
  CATEGORIES, STATUSES,
  createFleetSchema, updateFleetSchema, listFleetsQuery,
}
