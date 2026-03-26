'use strict'

const rateLimit = require('express-rate-limit')
const env       = require('../config/env')

const loginLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max:      env.rateLimit.maxLogin,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: `Terlalu banyak percobaan login. Coba lagi setelah ${env.rateLimit.windowMs / 60000} menit.`,
  },
  skip: () => env.nodeEnv === 'test',
})

function rateLimit_(name) {
  if (name === 'login') return loginLimiter
  return (req, res, next) => next()
}

module.exports = { rateLimit: rateLimit_, loginLimiter }
