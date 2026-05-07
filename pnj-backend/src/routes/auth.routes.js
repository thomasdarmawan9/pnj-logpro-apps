'use strict'

const express          = require('express')
const router           = express.Router()

const { authenticate } = require('../middlewares/auth.middleware')
const { loginLimiter, refreshLimiter } = require('../middlewares/rateLimit.middleware')
const { validate }     = require('../middlewares/validate.middleware')
const { logActivity }  = require('../middlewares/activityLog.middleware')
const {
  loginSchema,
  refreshSchema,
  changePasswordSchema,
} = require('../validators/auth.validator')
const authController = require('../controllers/auth.controller')

router.post('/login',
  loginLimiter,
  validate(loginSchema),
  // Login response: { user: {...}, access_token, refresh_token }.
  // req.user belum di-set (auth middleware tidak jalan), jadi pakai userExtractor.
  logActivity('login', 'auth', {
    userExtractor:  (body) => body?.data?.user?.id,
    uuidExtractor:  (body) => body?.data?.user?.uuid || null,
    labelExtractor: (body) => body?.data?.user?.email || null,
  }),
  authController.login,
)

router.post('/refresh',
  refreshLimiter,
  validate(refreshSchema),
  authController.refresh,
)

router.post('/logout',
  authenticate,
  logActivity('logout', 'auth', {
    labelExtractor: (_body, req) => req.user?.email || null,
    skipBody:       true,
  }),
  authController.logout,
)

router.get('/me',
  authenticate,
  authController.me,
)

router.put('/change-password',
  authenticate,
  validate(changePasswordSchema),
  logActivity('change_password', 'auth', {
    labelExtractor: (_body, req) => req.user?.email || null,
    skipBody:       true,
  }),
  authController.changePassword,
)

module.exports = router
