'use strict'

const express            = require('express')
const router             = express.Router()
const { authenticate }   = require('../middlewares/auth.middleware')
const { isAnyRole, isFinanceOrAbove } = require('../middlewares/rbac.middleware')

router.use(authenticate)

router.get('/aging-ar',               isFinanceOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.post('/aging-ar/refresh',      isFinanceOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.get('/aging-ar/export',        isFinanceOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.get('/profit-loss',            isFinanceOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.post('/profit-loss/refresh',   isFinanceOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.get('/profit-loss/export',     isFinanceOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.get('/fleet-utilization',      isAnyRole,        (req, res) => res.json({ message: 'TODO' }))
router.get('/audit-trail',            isAnyRole,        (req, res) => res.json({ message: 'TODO' }))

module.exports = router
