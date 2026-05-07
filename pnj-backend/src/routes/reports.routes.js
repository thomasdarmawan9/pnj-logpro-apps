'use strict'

const express          = require('express')
const router           = express.Router()
const { authenticate } = require('../middlewares/auth.middleware')
const {
  isAnyRole,
  isFinanceOrAbove,
  isSuperAdmin,
} = require('../middlewares/rbac.middleware')
const { validate }     = require('../middlewares/validate.middleware')

const {
  agingARQuery,
  agingARIdParam,
  profitLossQuery,
  fleetUtilizationQuery,
  auditTrailQuery,
} = require('../validators/reports.validator')

const controller = require('../controllers/reports.controller')

router.use(authenticate)

// ── Aging AR (Finance) ────────────────────────────────────────────────────
router.get('/aging-ar',
  isFinanceOrAbove,
  validate(agingARQuery, 'query'),
  controller.getAgingAR,
)

router.post('/aging-ar/refresh',
  isFinanceOrAbove,
  controller.refreshAgingAR,
)

router.get('/aging-ar/customers/:id',
  isFinanceOrAbove,
  validate(agingARIdParam, 'params'),
  controller.getAgingARCustomer,
)

router.get('/aging-ar/projects/:id',
  isFinanceOrAbove,
  validate(agingARIdParam, 'params'),
  controller.getAgingARProject,
)

router.get('/aging-ar/export',
  isFinanceOrAbove,
  validate(agingARQuery, 'query'),
  controller.exportAgingAR,
)

// ── Profit & Loss (Finance) ───────────────────────────────────────────────
router.get('/profit-loss',
  isFinanceOrAbove,
  validate(profitLossQuery, 'query'),
  controller.getProfitLoss,
)

router.post('/profit-loss/refresh',
  isFinanceOrAbove,
  controller.refreshProfitLoss,
)

router.get('/profit-loss/export',
  isFinanceOrAbove,
  validate(profitLossQuery, 'query'),
  controller.exportProfitLoss,
)

// ── Fleet Utilization (Super Admin only — sesuai FE redirect) ─────────────
router.get('/fleet-utilization',
  isSuperAdmin,
  validate(fleetUtilizationQuery, 'query'),
  controller.getFleetUtilization,
)

router.get('/fleet-utilization/export',
  isSuperAdmin,
  validate(fleetUtilizationQuery, 'query'),
  controller.exportFleetUtilization,
)

// ── Audit Trail ───────────────────────────────────────────────────────────
router.get('/audit-trail',
  isAnyRole,
  validate(auditTrailQuery, 'query'),
  controller.getAuditTrail,
)

module.exports = router
