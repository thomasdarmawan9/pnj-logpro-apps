'use strict'

const asyncHandler         = require('../utils/asyncHandler')
const userService          = require('../services/user.service')
const { success, paginate } = require('../utils/response')

const list = asyncHandler(async (req, res) => {
  const { page, limit, search, role, is_active } = req.query
  const { rows, count } = await userService.list({ page, limit, search, role, is_active })
  res.json(paginate(rows, count, page, limit))
})

const getOne = asyncHandler(async (req, res) => {
  const data = await userService.getByUuid(req.params.uuid)
  res.json(success(data))
})

const create = asyncHandler(async (req, res) => {
  const data = await userService.create(req.body)
  res.status(201).json(success(data, 'Pengguna berhasil dibuat.'))
})

const update = asyncHandler(async (req, res) => {
  const data = await userService.update({
    uuid:    req.params.uuid,
    payload: req.body,
    actor:   req.user,
  })
  res.json(success(data, 'Pengguna berhasil diperbarui.'))
})

const toggle = asyncHandler(async (req, res) => {
  const data = await userService.toggleActive({ uuid: req.params.uuid, actor: req.user })
  res.json(success(data, 'Status pengguna diperbarui.'))
})

const unlock = asyncHandler(async (req, res) => {
  const data = await userService.unlock({ uuid: req.params.uuid })
  res.json(success(data, 'Akun pengguna berhasil di-unlock.'))
})

const resetPassword = asyncHandler(async (req, res) => {
  await userService.resetPassword({
    uuid:        req.params.uuid,
    newPassword: req.body.new_password,
    actor:       req.user,
  })
  res.json(success(null, 'Password pengguna berhasil direset.'))
})

const remove = asyncHandler(async (req, res) => {
  await userService.softDelete({ uuid: req.params.uuid, actor: req.user })
  res.json(success(null, 'Pengguna berhasil dihapus.'))
})

module.exports = { list, getOne, create, update, toggle, unlock, resetPassword, remove }
