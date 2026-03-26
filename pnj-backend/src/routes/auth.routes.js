'use strict'

const express             = require('express')
const router              = express.Router()
const { authenticate }    = require('../middlewares/auth.middleware')
const { loginLimiter }    = require('../middlewares/rateLimit.middleware')

router.post('/login',           loginLimiter,  (req, res) => res.json({ message: 'TODO: auth controller Part 2' }))
router.post('/refresh',                        (req, res) => res.json({ message: 'TODO' }))
router.post('/logout',          authenticate,  (req, res) => res.json({ message: 'TODO' }))
router.put('/change-password',  authenticate,  (req, res) => res.json({ message: 'TODO' }))

module.exports = router
