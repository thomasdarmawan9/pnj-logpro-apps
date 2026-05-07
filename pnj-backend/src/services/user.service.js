'use strict'

const bcrypt = require('bcryptjs')
const { Op } = require('sequelize')

const { User } = require('../models')
const userRepo = require('../repositories/user.repository')
const {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} = require('../utils/AppError')

const BCRYPT_COST = 12

function sanitize(user) {
  const plain = typeof user.get === 'function' ? user.get({ plain: true }) : user
  delete plain.password
  return plain
}

async function list({ page, limit, search, role, is_active }) {
  const where = {}
  if (role)   where.role = role
  if (typeof is_active === 'boolean') where.is_active = is_active
  if (search) {
    where[Op.or] = [
      { name:  { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ]
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: userRepo.PUBLIC_ATTRS,
    order:  [['created_at', 'DESC']],
    offset: (page - 1) * limit,
    limit,
  })

  return { rows: rows.map(sanitize), count }
}

async function getByUuid(uuid) {
  const user = await userRepo.findByUuid(uuid, { attributes: userRepo.PUBLIC_ATTRS })
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan.')
  return sanitize(user)
}

async function create(payload) {
  const email = String(payload.email || '').trim().toLowerCase()
  const existing = await userRepo.findByEmail(email)
  if (existing) throw new ConflictError('Email sudah terdaftar.')

  const hash = await bcrypt.hash(payload.password, BCRYPT_COST)
  const user = await User.create({
    name:       payload.name,
    email,
    password:   hash,
    role:       payload.role,
    is_active:  payload.is_active ?? true,
    login_attempt: 0,
  })

  return sanitize(user)
}

async function update({ uuid, payload, actor }) {
  const user = await userRepo.findByUuid(uuid)
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan.')

  if (payload.email) {
    const normalizedEmail = String(payload.email).trim().toLowerCase()
    if (normalizedEmail !== user.email) {
      const dupe = await userRepo.findByEmail(normalizedEmail)
      if (dupe) throw new ConflictError('Email sudah terdaftar.')
      payload.email = normalizedEmail
    } else {
      payload.email = normalizedEmail
    }
  }

  // Cegah super_admin menurunkan / menonaktifkan dirinya sendiri (terkunci dari app).
  if (actor.id === user.id) {
    if (payload.role && payload.role !== user.role) {
      throw new BadRequestError('Tidak dapat mengubah role akun sendiri.')
    }
    if (payload.is_active === false) {
      throw new BadRequestError('Tidak dapat menonaktifkan akun sendiri.')
    }
  }

  await user.update(payload)
  return sanitize(user)
}

async function toggleActive({ uuid, actor }) {
  const user = await userRepo.findByUuid(uuid)
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan.')
  if (actor.id === user.id) {
    throw new BadRequestError('Tidak dapat mengubah status akun sendiri.')
  }
  await user.update({ is_active: !user.is_active })
  return sanitize(user)
}

async function unlock({ uuid }) {
  const user = await userRepo.findByUuid(uuid)
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan.')
  await user.update({ locked_until: null, login_attempt: 0 })
  return sanitize(user)
}

async function resetPassword({ uuid, newPassword, actor }) {
  const user = await userRepo.findByUuid(uuid)
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan.')
  if (actor.id === user.id) {
    throw new ForbiddenError('Gunakan endpoint ganti password untuk akun sendiri.')
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_COST)
  await user.update({
    password:      hash,
    login_attempt: 0,
    locked_until:  null,
  })
  return { success: true }
}

async function softDelete({ uuid, actor }) {
  const user = await userRepo.findByUuid(uuid)
  if (!user) throw new NotFoundError('Pengguna tidak ditemukan.')
  if (actor.id === user.id) {
    throw new BadRequestError('Tidak dapat menghapus akun sendiri.')
  }
  await user.destroy()
  return { success: true }
}

module.exports = {
  sanitize,
  list,
  getByUuid,
  create,
  update,
  toggleActive,
  unlock,
  resetPassword,
  softDelete,
}
