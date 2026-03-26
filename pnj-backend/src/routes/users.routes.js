'use strict'

const express            = require('express')
const router             = express.Router()
const { authenticate }   = require('../middlewares/auth.middleware')
const { isSuperAdmin }   = require('../middlewares/rbac.middleware')

router.use(authenticate)

router.get('/',                    isSuperAdmin, (req, res) => res.json({ message: 'TODO' }))
router.post('/',                   isSuperAdmin, (req, res) => res.json({ message: 'TODO' }))
router.get('/:uuid',               isSuperAdmin, (req, res) => res.json({ message: 'TODO' }))
router.put('/:uuid',               isSuperAdmin, (req, res) => res.json({ message: 'TODO' }))
router.patch('/:uuid/toggle',      isSuperAdmin, (req, res) => res.json({ message: 'TODO' }))
router.patch('/:uuid/unlock',      isSuperAdmin, (req, res) => res.json({ message: 'TODO' }))
router.post('/:uuid/reset-password', isSuperAdmin, (req, res) => res.json({ message: 'TODO' }))

module.exports = router
