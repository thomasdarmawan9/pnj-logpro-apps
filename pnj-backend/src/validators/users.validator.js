'use strict'

const Joi = require('joi')

const ROLES = ['super_admin', 'admin_ops', 'admin_finance']

const createUserSchema = Joi.object({
  name:     Joi.string().trim().min(2).max(100).required(),
  email:    Joi.string().trim().lowercase().email().max(150).required(),
  password: Joi.string().min(8).max(100).required().messages({
    'string.min': 'Password minimal 8 karakter.',
  }),
  role:     Joi.string().valid(...ROLES).required(),
  is_active: Joi.boolean().default(true),
})

const updateUserSchema = Joi.object({
  name:      Joi.string().trim().min(2).max(100),
  email:     Joi.string().trim().lowercase().email().max(150),
  role:      Joi.string().valid(...ROLES),
  is_active: Joi.boolean(),
}).min(1).messages({
  'object.min': 'Minimal satu field harus diubah.',
})

const resetPasswordSchema = Joi.object({
  new_password: Joi.string().min(8).max(100).required().messages({
    'string.min': 'Password baru minimal 8 karakter.',
  }),
})

const listUsersQuery = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().allow('', null).default(''),
  role:   Joi.string().valid(...ROLES),
  is_active: Joi.boolean(),
})

module.exports = {
  ROLES,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  listUsersQuery,
}
