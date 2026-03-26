'use strict'

const express            = require('express')
const router             = express.Router()
const { authenticate }   = require('../middlewares/auth.middleware')
const { isAnyRole }      = require('../middlewares/rbac.middleware')

router.use(authenticate, isAnyRole)

router.get('/',         (req, res) => res.json({ message: 'TODO' }))
router.post('/',        (req, res) => res.json({ message: 'TODO' }))
router.get('/:uuid',    (req, res) => res.json({ message: 'TODO' }))
router.put('/:uuid',    (req, res) => res.json({ message: 'TODO' }))
router.delete('/:uuid', (req, res) => res.json({ message: 'TODO' }))

module.exports = router
