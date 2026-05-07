'use strict'

const express           = require('express')
const router            = express.Router()

const { authenticate }  = require('../middlewares/auth.middleware')
const { isSuperAdmin }  = require('../middlewares/rbac.middleware')
const { validate }      = require('../middlewares/validate.middleware')
const { uuidParam }     = require('../validators/common.validator')
const {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  listUsersQuery,
} = require('../validators/users.validator')
const { logActivity } = require('../middlewares/activityLog.middleware')
const userController = require('../controllers/users.controller')

router.use(authenticate, isSuperAdmin)

router.get('/',
  validate(listUsersQuery, 'query'),
  userController.list,
)

router.post('/',
  validate(createUserSchema),
  logActivity('create_user', 'master'),
  userController.create,
)

router.get('/:uuid',
  validate(uuidParam, 'params'),
  userController.getOne,
)

router.put('/:uuid',
  validate(uuidParam, 'params'),
  validate(updateUserSchema),
  logActivity('update_user', 'master'),
  userController.update,
)

router.delete('/:uuid',
  validate(uuidParam, 'params'),
  logActivity('delete_user', 'master', {
    uuidExtractor:  (_b, req) => req.params.uuid,
    labelExtractor: () => null,
    skipBody:       true,
  }),
  userController.remove,
)

router.patch('/:uuid/toggle',
  validate(uuidParam, 'params'),
  logActivity('toggle_user', 'master'),
  userController.toggle,
)

router.patch('/:uuid/unlock',
  validate(uuidParam, 'params'),
  logActivity('unlock_user', 'master'),
  userController.unlock,
)

router.post('/:uuid/reset-password',
  validate(uuidParam, 'params'),
  validate(resetPasswordSchema),
  logActivity('reset_password', 'master', {
    uuidExtractor:  (_b, req) => req.params.uuid,
    skipBody:       true,
  }),
  userController.resetPassword,
)

module.exports = router
