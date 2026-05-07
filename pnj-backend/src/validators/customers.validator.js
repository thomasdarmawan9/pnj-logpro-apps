'use strict'

const Joi = require('joi')

const createCustomerSchema = Joi.object({
  name:     Joi.string().trim().min(2).max(150).required(),
  pic_name: Joi.string().trim().max(100).allow('', null),
  phone:    Joi.string().trim().max(20).allow('', null),
  email:    Joi.string().trim().email().max(150).allow('', null),
  address:  Joi.string().trim().allow('', null),
  npwp:     Joi.string().trim().max(30).allow('', null),
  is_pkp:   Joi.boolean().default(false),
})

const updateCustomerSchema = Joi.object({
  name:     Joi.string().trim().min(2).max(150),
  pic_name: Joi.string().trim().max(100).allow('', null),
  phone:    Joi.string().trim().max(20).allow('', null),
  email:    Joi.string().trim().email().max(150).allow('', null),
  address:  Joi.string().trim().allow('', null),
  npwp:     Joi.string().trim().max(30).allow('', null),
  is_pkp:   Joi.boolean(),
}).min(1)

const listCustomersQuery = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null).default(''),
  is_pkp: Joi.boolean(),
})

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuery,
}
