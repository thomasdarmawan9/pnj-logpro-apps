'use strict'

const bcrypt = require('bcryptjs')

const userRepo = require('../repositories/user.repository')
const {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require('../config/jwt')
const { redis, REDIS_KEYS } = require('../config/redis')
const {
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
} = require('../utils/AppError')
const logger = require('../utils/logger')

const MAX_LOGIN_ATTEMPT   = 5
const LOCKOUT_MINUTES     = 15
const BCRYPT_COST         = 12

function sanitize(user) {
  const plain = user.get({ plain: true })
  delete plain.password
  return plain
}

function buildTokens(user) {
  const payload = { userId: user.id, role: user.role, email: user.email }
  return {
    access_token:  signAccessToken(payload),
    refresh_token: signRefreshToken({ userId: user.id }),
  }
}

async function login({ email, password, ip }) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const user = await userRepo.findByEmail(normalizedEmail)

  if (!user || !user.is_active) {
    throw new UnauthorizedError('Email atau password salah.')
  }

  // Cek lockout
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const remainMs = new Date(user.locked_until).getTime() - Date.now()
    const remainMin = Math.ceil(remainMs / 60000)
    throw new ForbiddenError(
      `Akun sementara dikunci. Coba lagi dalam ${remainMin} menit.`,
      { code: 'ACCOUNT_LOCKED' }
    )
  }

  const ok = await bcrypt.compare(password, user.password)
  if (!ok) {
    const nextAttempt = (user.login_attempt || 0) + 1
    const updates     = { login_attempt: nextAttempt }
    if (nextAttempt >= MAX_LOGIN_ATTEMPT) {
      updates.locked_until  = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
      updates.login_attempt = 0
      logger.warn(`User ${email} dikunci selama ${LOCKOUT_MINUTES} menit karena terlalu banyak gagal login. IP=${ip}`)
    }
    await user.update(updates)
    throw new UnauthorizedError('Email atau password salah.')
  }

  // Login sukses — reset counter, catat waktu
  await user.update({
    login_attempt: 0,
    locked_until:  null,
    last_login_at: new Date(),
  })

  return { user: sanitize(user), ...buildTokens(user) }
}

async function logout({ accessToken, accessTokenExp }) {
  // Simpan token ke blacklist dengan TTL sisa umur token (detik).
  const nowSec = Math.floor(Date.now() / 1000)
  const ttl    = Math.max(accessTokenExp - nowSec, 1)
  await redis.set(REDIS_KEYS.JWT_BLACKLIST(accessToken), '1', 'EX', ttl)
}

async function refresh({ refreshToken }) {
  let payload
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch (err) {
    throw new UnauthorizedError('Refresh token tidak valid atau kedaluwarsa.')
  }

  const user = await userRepo.findById(payload.userId)
  if (!user || !user.is_active) {
    throw new UnauthorizedError('Pengguna tidak aktif.')
  }

  return buildTokens(user)
}

async function changePassword({ user, oldPassword, newPassword }) {
  const ok = await bcrypt.compare(oldPassword, user.password)
  if (!ok) {
    throw new BadRequestError('Password lama tidak sesuai.')
  }
  if (oldPassword === newPassword) {
    throw new BadRequestError('Password baru tidak boleh sama dengan password lama.')
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_COST)
  await user.update({ password: hash })
}

function tokenExpiryFromHeader(authHeader) {
  // Dipakai di controller untuk ekstrak exp dari Bearer token tanpa query ulang.
  if (!authHeader) return null
  const token = authHeader.slice(7)
  try {
    const payload = verifyAccessToken(token)
    return { token, exp: payload.exp }
  } catch (_err) {
    return null
  }
}

module.exports = {
  login,
  logout,
  refresh,
  changePassword,
  sanitize,
  tokenExpiryFromHeader,
  BCRYPT_COST,
}
