'use strict'

const express            = require('express')
const router             = express.Router()
const { authenticate }   = require('../middlewares/auth.middleware')
const { isAnyRole }      = require('../middlewares/rbac.middleware')

router.use(authenticate)

router.get('/summary', isAnyRole, (req, res) => res.json({ message: 'TODO' }))

module.exports = router
