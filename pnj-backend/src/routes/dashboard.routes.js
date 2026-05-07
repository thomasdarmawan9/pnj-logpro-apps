'use strict'

const express          = require('express')
const router           = express.Router()
const { authenticate } = require('../middlewares/auth.middleware')
const { isAnyRole }    = require('../middlewares/rbac.middleware')
const { validate }     = require('../middlewares/validate.middleware')

const {
  summaryQuery,
  activityQuery,
} = require('../validators/dashboard.validator')

const controller = require('../controllers/dashboard.controller')

router.use(authenticate, isAnyRole)

router.get('/summary',
  validate(summaryQuery, 'query'),
  controller.getSummary,
)

router.get('/activity',
  validate(activityQuery, 'query'),
  controller.getActivity,
)

module.exports = router
