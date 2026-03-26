'use strict'

const { verifyAccessToken } = require('../config/jwt')
const { redis, REDIS_KEYS }  = require('../config/redis')
const { User }               = require('../models')
const logger                 = require('../utils/logger')

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token autentikasi tidak ditemukan.' })
    }

    const token = authHeader.slice(7)

    // Cek token di blacklist Redis
    const isBlacklisted = await redis.exists(REDIS_KEYS.JWT_BLACKLIST(token))
    if (isBlacklisted) {
      return res.status(401).json({ success: false, message: 'Token sudah tidak valid.', code: 'TOKEN_REVOKED' })
    }

    // Verify token
    let payload
    try {
      payload = verifyAccessToken(token)
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token sudah kedaluwarsa.', code: 'TOKEN_EXPIRED' })
      }
      return res.status(401).json({ success: false, message: 'Token tidak valid.' })
    }

    // Ambil user dari database
    const user = await User.findOne({
      where: { id: payload.userId, is_active: true },
    })

    if (!user) {
      return res.status(401).json({ success: false, message: 'Pengguna tidak ditemukan atau tidak aktif.' })
    }

    req.user  = user
    req.token = token
    next()
  } catch (err) {
    logger.error('Error di middleware autentikasi:', err)
    next(err)
  }
}

module.exports = { authenticate }
