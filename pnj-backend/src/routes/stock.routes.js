'use strict'

const express            = require('express')
const router             = express.Router()
const { authenticate }   = require('../middlewares/auth.middleware')
const { isAnyRole, isOpsOrAbove } = require('../middlewares/rbac.middleware')

router.use(authenticate)

// Stock Items
router.get('/items',              isAnyRole,    (req, res) => res.json({ message: 'TODO' }))
router.post('/items',             isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.get('/items/:uuid',        isAnyRole,    (req, res) => res.json({ message: 'TODO' }))
router.put('/items/:uuid',        isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.patch('/items/:uuid/toggle', isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))

// Stock Receipts
router.get('/receipts',           isAnyRole,    (req, res) => res.json({ message: 'TODO' }))
router.post('/receipts',          isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.get('/receipts/:uuid',     isAnyRole,    (req, res) => res.json({ message: 'TODO' }))
router.put('/receipts/:uuid',     isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.delete('/receipts/:uuid',  isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))

// Stock Disbursements
router.get('/disbursements',           isAnyRole,    (req, res) => res.json({ message: 'TODO' }))
router.post('/disbursements',          isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.get('/disbursements/:uuid',     isAnyRole,    (req, res) => res.json({ message: 'TODO' }))
router.put('/disbursements/:uuid',     isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.delete('/disbursements/:uuid',  isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))

// Stock Reports
router.get('/report/recap',    isAnyRole, (req, res) => res.json({ message: 'TODO' }))
router.get('/report/summary',  isAnyRole, (req, res) => res.json({ message: 'TODO' }))
router.get('/report/export',   isAnyRole, (req, res) => res.json({ message: 'TODO' }))

module.exports = router
