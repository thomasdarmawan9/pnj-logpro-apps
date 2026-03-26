'use strict'

const express            = require('express')
const router             = express.Router()
const { authenticate }   = require('../middlewares/auth.middleware')
const { isAnyRole, isOpsOrAbove } = require('../middlewares/rbac.middleware')
const { upload, compressImage }   = require('../middlewares/upload.middleware')

router.use(authenticate)

router.get('/',                      isAnyRole,     (req, res) => res.json({ message: 'TODO' }))
router.post('/',                     isOpsOrAbove,  (req, res) => res.json({ message: 'TODO' }))
router.get('/:uuid',                 isAnyRole,     (req, res) => res.json({ message: 'TODO' }))
router.put('/:uuid',                 isOpsOrAbove,  (req, res) => res.json({ message: 'TODO' }))
router.patch('/:uuid/toggle-status', isOpsOrAbove,  (req, res) => res.json({ message: 'TODO' }))
router.post('/:uuid/photo',          isOpsOrAbove,  upload.single('photo'), compressImage('fleets'), (req, res) => res.json({ message: 'TODO' }))

module.exports = router
