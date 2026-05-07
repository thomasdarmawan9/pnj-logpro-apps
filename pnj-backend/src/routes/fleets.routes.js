'use strict'

const express           = require('express')
const router            = express.Router()

const { authenticate }  = require('../middlewares/auth.middleware')
const { isAnyRole, isOpsOrAbove } = require('../middlewares/rbac.middleware')
const { upload, compressImage }   = require('../middlewares/upload.middleware')
const { validate }      = require('../middlewares/validate.middleware')
const { uuidParam }     = require('../validators/common.validator')
const {
  createFleetSchema,
  updateFleetSchema,
  listFleetsQuery,
} = require('../validators/fleets.validator')
const { logActivity } = require('../middlewares/activityLog.middleware')
const controller = require('../controllers/fleets.controller')

router.use(authenticate)

router.get('/',
  isAnyRole,
  validate(listFleetsQuery, 'query'),
  controller.list,
)
router.get('/:uuid',
  isAnyRole,
  validate(uuidParam, 'params'),
  controller.getOne,
)

router.post('/',
  isOpsOrAbove,
  validate(createFleetSchema),
  logActivity('create_fleet', 'master'),
  controller.create,
)
router.put('/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  validate(updateFleetSchema),
  logActivity('update_fleet', 'master'),
  controller.update,
)
router.patch('/:uuid/toggle-status',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  logActivity('update_fleet', 'master'),
  controller.toggleStatus,
)
router.post('/:uuid/photo',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  upload.single('photo'),
  compressImage('fleets'),
  logActivity('update_fleet', 'master'),
  controller.uploadPhoto,
)
router.delete('/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  logActivity('delete_fleet', 'master', {
    uuidExtractor: (_b, req) => req.params.uuid,
    skipBody: true,
  }),
  controller.remove,
)

module.exports = router
