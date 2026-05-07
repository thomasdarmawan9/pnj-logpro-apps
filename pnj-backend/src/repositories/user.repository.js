'use strict'

const { Op, fn, col, where: sqlWhere } = require('sequelize')
const { User } = require('../models')

const PUBLIC_ATTRS = [
  'id', 'uuid', 'name', 'email', 'role', 'is_active',
  'last_login_at', 'locked_until', 'login_attempt',
  'created_at', 'updated_at',
]

function findById(id, options = {}) {
  return User.findByPk(id, options)
}

function findByUuid(uuid, options = {}) {
  return User.findOne({ where: { uuid }, ...options })
}

/**
 * Email lookup case-insensitive — `LOWER(email) = LOWER(:email)`.
 * Service layer juga normalize ke lowercase saat write, ini backup
 * untuk legacy data yang mungkin mixed-case.
 */
function findByEmail(email, options = {}) {
  const normalized = String(email || '').trim().toLowerCase()
  return User.findOne({
    where: sqlWhere(fn('LOWER', col('email')), Op.eq, normalized),
    ...options,
  })
}

function listActive() {
  return User.findAll({ where: { is_active: true }, attributes: PUBLIC_ATTRS })
}

module.exports = {
  PUBLIC_ATTRS,
  findById,
  findByUuid,
  findByEmail,
  listActive,
}
