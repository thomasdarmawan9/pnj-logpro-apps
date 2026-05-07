'use strict'

const { ValidationError, UniqueConstraintError } = require('sequelize')
const logger = require('../utils/logger')

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(`[${req.method}] ${req.path} — ${err.message}`, { stack: err.stack })

  if (err instanceof ValidationError) {
    const errors = err.errors.map((e) => ({ field: e.path, message: e.message }))
    return res.status(422).json({
      success: false,
      message: 'Validasi data gagal.',
      errors,
    })
  }

  if (err instanceof UniqueConstraintError) {
    const fields = err.errors.map((e) => e.path).join(', ')
    return res.status(409).json({
      success: false,
      message: `Data sudah ada: ${fields}`,
    })
  }

  if (err.isJoi) {
    return res.status(422).json({
      success: false,
      message: err.details[0].message,
    })
  }

  if (err.statusCode) {
    const body = {
      success: false,
      message: err.message,
    }
    if (err.errors) body.errors = err.errors
    if (err.code)   body.code   = err.code
    return res.status(err.statusCode).json(body)
  }

  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal server.',
  })
}

module.exports = { errorHandler }
