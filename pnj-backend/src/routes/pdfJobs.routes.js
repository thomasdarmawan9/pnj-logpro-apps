'use strict'

const express          = require('express')
const router           = express.Router()
const { authenticate } = require('../middlewares/auth.middleware')
const { isAnyRole }    = require('../middlewares/rbac.middleware')
const { validate }     = require('../middlewares/validate.middleware')
const { uuidParam }    = require('../validators/common.validator')
const controller       = require('../controllers/pdfJobs.controller')

router.use(authenticate, isAnyRole)

router.get('/:uuid',
  validate(uuidParam, 'params'),
  controller.getOne,
)

router.get('/:uuid/download',
  validate(uuidParam, 'params'),
  controller.download,
)

module.exports = router
