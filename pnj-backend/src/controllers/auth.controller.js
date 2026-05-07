'use strict'

const asyncHandler = require('../utils/asyncHandler')
const authService  = require('../services/auth.service')
const { success }  = require('../utils/response')

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const result = await authService.login({
    email,
    password,
    ip: req.ip,
  })
  res.json(success(result, 'Login berhasil.'))
})

const logout = asyncHandler(async (req, res) => {
  await authService.logout({
    accessToken:    req.token,
    accessTokenExp: req.tokenExp,
  })
  res.json(success(null, 'Logout berhasil.'))
})

const refresh = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body
  const tokens = await authService.refresh({ refreshToken: refresh_token })
  res.json(success(tokens, 'Token berhasil diperbarui.'))
})

const changePassword = asyncHandler(async (req, res) => {
  const { old_password, new_password } = req.body
  await authService.changePassword({
    user:         req.user,
    oldPassword:  old_password,
    newPassword:  new_password,
  })
  res.json(success(null, 'Password berhasil diubah.'))
})

const me = asyncHandler(async (req, res) => {
  res.json(success(authService.sanitize(req.user), 'Profil pengguna.'))
})

module.exports = { login, logout, refresh, changePassword, me }
