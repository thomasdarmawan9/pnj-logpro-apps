'use strict'

const express           = require('express')
const router            = express.Router()

const { authenticate }  = require('../middlewares/auth.middleware')
const { isAnyRole, isOpsOrAbove } = require('../middlewares/rbac.middleware')
const { validate }      = require('../middlewares/validate.middleware')
const { uuidParam }     = require('../validators/common.validator')
const {
  createProjectSchema,
  updateProjectSchema,
  listProjectsQuery,
} = require('../validators/projects.validator')
const { logActivity } = require('../middlewares/activityLog.middleware')
const controller = require('../controllers/projects.controller')

router.use(authenticate)

router.get('/',
  isAnyRole,
  validate(listProjectsQuery, 'query'),
  controller.list,
)

router.post('/',
  isOpsOrAbove,
  validate(createProjectSchema),
  logActivity('create_project', 'master'),
  controller.create,
)

router.get('/:uuid',
  isAnyRole,
  validate(uuidParam, 'params'),
  controller.getOne,
)

router.put('/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  validate(updateProjectSchema),
  logActivity('update_project', 'master'),
  controller.update,
)

router.delete('/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  logActivity('delete_project', 'master', {
    uuidExtractor: (_b, req) => req.params.uuid,
    skipBody: true,
  }),
  controller.remove,
)

router.get('/:uuid/summary',
  isAnyRole,
  validate(uuidParam, 'params'),
  controller.summary,
)

module.exports = router
