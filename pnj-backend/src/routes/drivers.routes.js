'use strict'

const express           = require('express')
const router            = express.Router()

const { authenticate }  = require('../middlewares/auth.middleware')
const { isAnyRole, isOpsOrAbove } = require('../middlewares/rbac.middleware')
const { upload, processLampiran } = require('../middlewares/upload.middleware')
const { validate }      = require('../middlewares/validate.middleware')
const { uuidParam, uuidFilenameParam } = require('../validators/common.validator')
const {
  createDriverSchema,
  updateDriverSchema,
  listDriversQuery,
} = require('../validators/drivers.validator')
const { logActivity } = require('../middlewares/activityLog.middleware')
const controller = require('../controllers/drivers.controller')

router.use(authenticate)

router.get('/',
  isAnyRole,
  validate(listDriversQuery, 'query'),
  controller.list,
)
router.get('/:uuid',
  isAnyRole,
  validate(uuidParam, 'params'),
  controller.getOne,
)

router.post('/',
  isOpsOrAbove,
  validate(createDriverSchema),
  logActivity('create_driver', 'master'),
  controller.create,
)
router.put('/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  validate(updateDriverSchema),
  logActivity('update_driver', 'master'),
  controller.update,
)
router.patch('/:uuid/toggle-status',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  logActivity('update_driver', 'master'),
  controller.toggleStatus,
)
router.post('/:uuid/lampiran',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  upload.single('file'),
  processLampiran('driver-lampiran'),
  logActivity('update_driver', 'master'),
  controller.uploadLampiran,
)
router.delete('/:uuid/lampiran/:filename',
  isOpsOrAbove,
  validate(uuidFilenameParam, 'params'),
  logActivity('update_driver', 'master'),
  controller.deleteLampiran,
)
router.get('/:uuid/lampiran/:filename',
  isAnyRole,
  validate(uuidFilenameParam, 'params'),
  controller.downloadLampiran,
)
router.delete('/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  logActivity('delete_driver', 'master', {
    uuidExtractor: (_b, req) => req.params.uuid,
    skipBody: true,
  }),
  controller.remove,
)

module.exports = router
