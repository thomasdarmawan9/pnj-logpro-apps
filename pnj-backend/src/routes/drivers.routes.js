'use strict'

const express            = require('express')
const router             = express.Router()
const { authenticate }   = require('../middlewares/auth.middleware')
const { isAnyRole, isOpsOrAbove } = require('../middlewares/rbac.middleware')

router.use(authenticate)

router.get('/',                      isAnyRole,    (req, res) => res.json({ message: 'TODO' }))
router.post('/',                     isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.get('/:uuid',                 isAnyRole,    (req, res) => res.json({ message: 'TODO' }))
router.put('/:uuid',                 isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))
router.patch('/:uuid/toggle-status', isOpsOrAbove, (req, res) => res.json({ message: 'TODO' }))

module.exports = router
