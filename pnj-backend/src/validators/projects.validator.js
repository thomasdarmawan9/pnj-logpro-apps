'use strict'

const Joi = require('joi')

const STATUSES = ['active', 'completed', 'on_hold']

const createProjectSchema = Joi.object({
  customer_uuid:   Joi.string().uuid({ version: ['uuidv4'] }).required(),
  name:            Joi.string().trim().min(2).max(150).required(),
  contract_number: Joi.string().trim().max(50).required(),
  description:     Joi.string().trim().allow('', null),
  start_date:      Joi.date().iso().required(),
  end_date:        Joi.date().iso().min(Joi.ref('start_date')).allow(null),
  status:          Joi.string().valid(...STATUSES).default('active'),
})

const updateProjectSchema = Joi.object({
  customer_uuid:   Joi.string().uuid({ version: ['uuidv4'] }),
  name:            Joi.string().trim().min(2).max(150),
  contract_number: Joi.string().trim().max(50),
  description:     Joi.string().trim().allow('', null),
  start_date:      Joi.date().iso(),
  end_date:        Joi.date().iso().allow(null),
  status:          Joi.string().valid(...STATUSES),
}).min(1)

const listProjectsQuery = Joi.object({
  page:          Joi.number().integer().min(1).default(1),
  limit:         Joi.number().integer().min(1).max(100).default(20),
  search:        Joi.string().trim().allow('', null).default(''),
  status:        Joi.string().valid(...STATUSES),
  customer_uuid: Joi.string().uuid({ version: ['uuidv4'] }),
})

module.exports = { STATUSES, createProjectSchema, updateProjectSchema, listProjectsQuery }
