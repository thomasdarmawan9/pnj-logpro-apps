'use strict'

const express            = require('express')
const router             = express.Router()
const { authenticate }   = require('../middlewares/auth.middleware')
const { isAnyRole, isFinanceOrAbove } = require('../middlewares/rbac.middleware')

router.use(authenticate)

router.get('/',                              isAnyRole,          (req, res) => res.json({ message: 'TODO' }))
router.post('/',                             isFinanceOrAbove,   (req, res) => res.json({ message: 'TODO' }))
router.get('/export',                        isAnyRole,          (req, res) => res.json({ message: 'TODO' }))
router.get('/:uuid',                         isAnyRole,          (req, res) => res.json({ message: 'TODO' }))
router.put('/:uuid',                         isFinanceOrAbove,   (req, res) => res.json({ message: 'TODO' }))
router.patch('/:uuid/send',                  isFinanceOrAbove,   (req, res) => res.json({ message: 'TODO' }))
router.post('/:uuid/payments',               isFinanceOrAbove,   (req, res) => res.json({ message: 'TODO' }))
router.patch('/:uuid/void',                  isFinanceOrAbove,   (req, res) => res.json({ message: 'TODO' }))
router.post('/:uuid/attach-sj',              isFinanceOrAbove,   (req, res) => res.json({ message: 'TODO' }))
router.delete('/:uuid/detach-sj/:sjUuid',    isFinanceOrAbove,   (req, res) => res.json({ message: 'TODO' }))
router.get('/:uuid/attachable-sj',           isAnyRole,          (req, res) => res.json({ message: 'TODO' }))
router.post('/:uuid/generate-pdf',           isAnyRole,          (req, res) => res.json({ message: 'TODO' }))

module.exports = router
