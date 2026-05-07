'use strict'

const express          = require('express')
const router           = express.Router()

const { authenticate } = require('../middlewares/auth.middleware')
const { isAnyRole, isFinanceOrAbove } = require('../middlewares/rbac.middleware')
const { validate }     = require('../middlewares/validate.middleware')
const { uuidParam, uuidFilenameParam } = require('../validators/common.validator')
const {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
  voidInvoiceSchema,
  attachSJSchema,
  detachSJParamSchema,
  listInvoiceQuery,
} = require('../validators/invoice.validator')
const { generateInvoicePdfSchema } = require('../validators/pdfJob.validator')
const { uploadLampiran, processLampiran } = require('../middlewares/upload.middleware')
const { logActivity } = require('../middlewares/activityLog.middleware')
const controller = require('../controllers/invoices.controller')

router.use(authenticate)

router.get('/',
  isAnyRole,
  validate(listInvoiceQuery, 'query'),
  controller.list,
)

router.post('/',
  isFinanceOrAbove,
  validate(createInvoiceSchema),
  logActivity('create_invoice', 'invoice'),
  controller.create,
)

router.get('/export',
  isAnyRole,
  validate(listInvoiceQuery, 'query'),
  controller.exportXlsx,
)

router.get('/:uuid',
  isAnyRole,
  validate(uuidParam, 'params'),
  controller.getOne,
)

router.put('/:uuid',
  isFinanceOrAbove,
  validate(uuidParam, 'params'),
  validate(updateInvoiceSchema),
  logActivity('update_invoice', 'invoice'),
  controller.update,
)

router.patch('/:uuid/send',
  isFinanceOrAbove,
  validate(uuidParam, 'params'),
  logActivity('send_invoice', 'invoice'),
  controller.send,
)

router.patch('/:uuid/mark-outstanding',
  isFinanceOrAbove,
  validate(uuidParam, 'params'),
  logActivity('mark_outstanding', 'invoice'),
  controller.markOutstanding,
)

router.post('/:uuid/payments',
  isFinanceOrAbove,
  validate(uuidParam, 'params'),
  validate(recordPaymentSchema),
  logActivity('record_payment', 'invoice'),
  controller.recordPayment,
)

router.patch('/:uuid/void',
  isFinanceOrAbove,
  validate(uuidParam, 'params'),
  validate(voidInvoiceSchema),
  logActivity('void_invoice', 'invoice'),
  controller.voidInvoice,
)

router.post('/:uuid/attach-sj',
  isFinanceOrAbove,
  validate(uuidParam, 'params'),
  validate(attachSJSchema),
  logActivity('attach_sj', 'invoice'),
  controller.attachSJ,
)

router.delete('/:uuid/detach-sj/:sjUuid',
  isFinanceOrAbove,
  validate(detachSJParamSchema, 'params'),
  logActivity('detach_sj', 'invoice'),
  controller.detachSJ,
)

router.get('/:uuid/attachable-sj',
  isAnyRole,
  validate(uuidParam, 'params'),
  controller.attachableSJ,
)

router.post('/:uuid/generate-pdf',
  isAnyRole,
  validate(uuidParam, 'params'),
  validate(generateInvoicePdfSchema),
  logActivity('generate_pdf', 'invoice', {
    uuidExtractor:  (_b, req) => req.params.uuid,
    labelExtractor: (_b, _req) => null,
    skipBody:       true,
  }),
  controller.generatePdf,
)

// ── Lampiran ──────────────────────────────────────────────────────────────
router.post('/:uuid/lampiran',
  isFinanceOrAbove,
  validate(uuidParam, 'params'),
  uploadLampiran.single('file'),
  processLampiran('invoice-lampiran'),
  controller.uploadLampiran,
)

router.delete('/:uuid/lampiran/:filename',
  isFinanceOrAbove,
  validate(uuidFilenameParam, 'params'),
  controller.deleteLampiran,
)

router.get('/:uuid/lampiran/:filename',
  isAnyRole,
  validate(uuidFilenameParam, 'params'),
  controller.downloadLampiran,
)

module.exports = router
