'use strict'

const express           = require('express')
const router            = express.Router()

const { authenticate }  = require('../middlewares/auth.middleware')
const { isAnyRole, isOpsOrAbove } = require('../middlewares/rbac.middleware')
const { validate }      = require('../middlewares/validate.middleware')
const { uuidParam }     = require('../validators/common.validator')
const {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomersQuery,
} = require('../validators/customers.validator')
const { logActivity } = require('../middlewares/activityLog.middleware')
const controller = require('../controllers/customers.controller')

router.use(authenticate)

// Read — semua role (ops + finance butuh customer lookup)
router.get('/',
  isAnyRole,
  validate(listCustomersQuery, 'query'),
  controller.list,
)
router.get('/:uuid',
  isAnyRole,
  validate(uuidParam, 'params'),
  controller.getOne,
)

// Write — super_admin + admin_ops
router.post('/',
  isOpsOrAbove,
  validate(createCustomerSchema),
  logActivity('create_customer', 'master'),
  controller.create,
)
router.put('/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  validate(updateCustomerSchema),
  logActivity('update_customer', 'master'),
  controller.update,
)
router.delete('/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  logActivity('delete_customer', 'master', {
    uuidExtractor: (_b, req) => req.params.uuid,
    skipBody: true,
  }),
  controller.remove,
)

module.exports = router
