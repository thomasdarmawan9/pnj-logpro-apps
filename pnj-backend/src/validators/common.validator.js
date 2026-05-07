'use strict'

const Joi = require('joi')

const uuidParam = Joi.object({
  uuid: Joi.string().uuid({ version: ['uuidv4'] }).required().messages({
    'string.guid':  'Parameter uuid tidak valid.',
    'any.required': 'Parameter uuid wajib ada.',
  }),
})

const uuidFilenameParam = Joi.object({
  uuid: Joi.string().uuid({ version: ['uuidv4'] }).required().messages({
    'string.guid':  'Parameter uuid tidak valid.',
    'any.required': 'Parameter uuid wajib ada.',
  }),
  filename: Joi.string().trim().min(1).max(255).required().messages({
    'any.required': 'Parameter filename wajib ada.',
    'string.empty': 'Parameter filename wajib ada.',
  }),
})

const listQuery = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null).default(''),
  sort:   Joi.string().trim().allow('', null),
  order:  Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc'),
}).unknown(true)

module.exports = { uuidParam, uuidFilenameParam, listQuery }
