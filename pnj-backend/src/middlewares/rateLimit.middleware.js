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
  skip: () => env.nodeEnv === 'test' || env.nodeEnv === 'development',
})

/**
 * Rate limit untuk endpoint /auth/refresh.
 * Lebih longgar dari login (token rotation harusnya rare),
 * tapi tetap mencegah brute-force harvesting refresh token.
 */
const refreshLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max:      env.rateLimit.maxLogin * 4, // default 20 per 15 menit
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: `Terlalu banyak percobaan refresh token. Coba lagi setelah ${env.rateLimit.windowMs / 60000} menit.`,
  },
  skip: () => env.nodeEnv === 'test' || env.nodeEnv === 'development',
})

function rateLimit_(name) {
  if (name === 'login')   return loginLimiter
  if (name === 'refresh') return refreshLimiter
  return (req, res, next) => next()
}

module.exports = { rateLimit: rateLimit_, loginLimiter, refreshLimiter }
