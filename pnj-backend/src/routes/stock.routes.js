'use strict'

const express          = require('express')
const router           = express.Router()

const { authenticate } = require('../middlewares/auth.middleware')
const { isAnyRole, isOpsOrAbove } = require('../middlewares/rbac.middleware')
const { validate }     = require('../middlewares/validate.middleware')
const { uuidParam }    = require('../validators/common.validator')

// Items master
const {
  createStockItemSchema,
  updateStockItemSchema,
  listStockItemsQuery,
} = require('../validators/stockItems.validator')
const stockItemsController = require('../controllers/stockItems.controller')

// Receipts
const {
  createReceiptSchema,
  updateReceiptSchema,
  listReceiptQuery,
} = require('../validators/stockReceipt.validator')
const receiptsController = require('../controllers/stockReceipts.controller')

// Disbursements
const {
  createDisbursementSchema,
  updateDisbursementSchema,
  listDisbursementQuery,
} = require('../validators/stockDisbursement.validator')
const disbursementsController = require('../controllers/stockDisbursements.controller')

// Reports
const { listRecapQuery, listSummaryQuery } = require('../validators/stockReport.validator')
const reportsController = require('../controllers/stockReports.controller')

const { logActivity } = require('../middlewares/activityLog.middleware')

router.use(authenticate)

// ── Stock Items (master) ───────────────────────────────────────────────────
router.get('/items',
  isAnyRole,
  validate(listStockItemsQuery, 'query'),
  stockItemsController.list,
)
router.post('/items',
  isOpsOrAbove,
  validate(createStockItemSchema),
  logActivity('create_stock_item', 'master'),
  stockItemsController.create,
)
router.get('/items/:uuid',
  isAnyRole,
  validate(uuidParam, 'params'),
  stockItemsController.getOne,
)
router.put('/items/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  validate(updateStockItemSchema),
  logActivity('update_stock_item', 'master'),
  stockItemsController.update,
)
router.patch('/items/:uuid/toggle',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  logActivity('toggle_stock_item', 'master'),
  stockItemsController.toggle,
)
router.delete('/items/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  logActivity('delete_stock_item', 'master', {
    uuidExtractor: (_b, req) => req.params.uuid,
    skipBody: true,
  }),
  stockItemsController.remove,
)

// ── Stock Receipts ────────────────────────────────────────────────────────
router.get('/receipts',
  isAnyRole,
  validate(listReceiptQuery, 'query'),
  receiptsController.list,
)
router.post('/receipts',
  isOpsOrAbove,
  validate(createReceiptSchema),
  logActivity('stock_in', 'stok'),
  receiptsController.create,
)
router.get('/receipts/:uuid',
  isAnyRole,
  validate(uuidParam, 'params'),
  receiptsController.getOne,
)
router.put('/receipts/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  validate(updateReceiptSchema),
  logActivity('update_stock_receipt', 'stok'),
  receiptsController.update,
)
router.delete('/receipts/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  logActivity('delete_stock_receipt', 'stok', {
    uuidExtractor: (_b, req) => req.params.uuid,
    skipBody: true,
  }),
  receiptsController.remove,
)

// ── Stock Disbursements ───────────────────────────────────────────────────
router.get('/disbursements',
  isAnyRole,
  validate(listDisbursementQuery, 'query'),
  disbursementsController.list,
)
router.post('/disbursements',
  isOpsOrAbove,
  validate(createDisbursementSchema),
  logActivity('stock_out', 'stok'),
  disbursementsController.create,
)
router.get('/disbursements/:uuid',
  isAnyRole,
  validate(uuidParam, 'params'),
  disbursementsController.getOne,
)
router.put('/disbursements/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  validate(updateDisbursementSchema),
  logActivity('update_stock_disbursement', 'stok'),
  disbursementsController.update,
)
router.delete('/disbursements/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  logActivity('delete_stock_disbursement', 'stok', {
    uuidExtractor: (_b, req) => req.params.uuid,
    skipBody: true,
  }),
  disbursementsController.remove,
)

// ── Stock Reports ─────────────────────────────────────────────────────────
router.get('/report/recap',
  isAnyRole,
  validate(listRecapQuery, 'query'),
  reportsController.recap,
)
router.get('/report/summary',
  isAnyRole,
  validate(listSummaryQuery, 'query'),
  reportsController.summary,
)
router.get('/report/export',
  isAnyRole,
  reportsController.exportXlsx,
)

module.exports = router
