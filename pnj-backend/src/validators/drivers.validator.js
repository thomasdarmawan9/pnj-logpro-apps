'use strict'

const Joi = require('joi')

const STATUSES = ['active', 'inactive']

const createDriverSchema = Joi.object({
  name:           Joi.string().trim().min(2).max(100).required(),
  phone:          Joi.string().trim().max(20).allow('', null),
  sim_number:     Joi.string().trim().max(30).allow('', null),
  sim_expired_at: Joi.date().iso().allow(null),
  status:         Joi.string().valid(...STATUSES).default('active'),
})

const updateDriverSchema = Joi.object({
  name:           Joi.string().trim().min(2).max(100),
  phone:          Joi.string().trim().max(20).allow('', null),
  sim_number:     Joi.string().trim().max(30).allow('', null),
  sim_expired_at: Joi.date().iso().allow(null),
  status:         Joi.string().valid(...STATUSES),
}).min(1)

const listDriversQuery = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null).default(''),
  status: Joi.string().valid(...STATUSES),
})

module.exports = { STATUSES, createDriverSchema, updateDriverSchema, listDriversQuery }
