'use strict'

const express            = require('express')
const router             = express.Router()
const { authenticate }   = require('../middlewares/auth.middleware')
const { isAnyRole, isSuperAdmin } = require('../middlewares/rbac.middleware')
const { upload, compressImage }   = require('../middlewares/upload.middleware')

router.use(authenticate)

router.get('/company',      isAnyRole,    (req, res) => res.json({ message: 'TODO' }))
router.put('/company',      isSuperAdmin, (req, res) => res.json({ message: 'TODO' }))
router.post('/company/logo', isSuperAdmin, upload.single('logo'), compressImage('logos'), (req, res) => res.json({ message: 'TODO' }))
router.get('/numbering',    isSuperAdmin, (req, res) => res.json({ message: 'TODO' }))
router.put('/numbering',    isSuperAdmin, (req, res) => res.json({ message: 'TODO' }))

module.exports = router
