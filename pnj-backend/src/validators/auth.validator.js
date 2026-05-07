'use strict'

const Joi = require('joi')

const loginSchema = Joi.object({
  email:    Joi.string().trim().lowercase().email().max(150).required().messages({
    'string.email':   'Format email tidak valid.',
    'string.empty':   'Email wajib diisi.',
    'any.required':   'Email wajib diisi.',
  }),
  password: Joi.string().min(6).max(100).required().messages({
    'string.min':     'Password minimal 6 karakter.',
    'string.empty':   'Password wajib diisi.',
    'any.required':   'Password wajib diisi.',
  }),
})

const refreshSchema = Joi.object({
  refresh_token: Joi.string().required().messages({
    'any.required':   'Refresh token wajib diisi.',
    'string.empty':   'Refresh token wajib diisi.',
  }),
})

const changePasswordSchema = Joi.object({
  old_password: Joi.string().required().messages({
    'any.required':   'Password lama wajib diisi.',
  }),
  new_password: Joi.string().min(8).max(100).required().messages({
    'string.min':     'Password baru minimal 8 karakter.',
    'any.required':   'Password baru wajib diisi.',
  }),
  confirm_password: Joi.any().valid(Joi.ref('new_password')).required().messages({
    'any.only':       'Konfirmasi password tidak cocok dengan password baru.',
    'any.required':   'Konfirmasi password wajib diisi.',
  }),
})

module.exports = {
  loginSchema,
  refreshSchema,
  changePasswordSchema,
}
