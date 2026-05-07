'use strict'

const express          = require('express')
const router           = express.Router()

const { authenticate } = require('../middlewares/auth.middleware')
const { isAnyRole, isOpsOrAbove } = require('../middlewares/rbac.middleware')
const {
  upload,
  compressImage,
  uploadLampiran,
  processLampiran,
} = require('../middlewares/upload.middleware')
const { validate }     = require('../middlewares/validate.middleware')
const { uuidParam, uuidFilenameParam } = require('../validators/common.validator')
const {
  createSJSchema,
  updateSJSchema,
  assignSJSchema,
  deliverSJSchema,
  voidSJSchema,
  listSJQuery,
} = require('../validators/suratJalan.validator')
const { generateSJPdfSchema } = require('../validators/pdfJob.validator')
const { logActivity } = require('../middlewares/activityLog.middleware')
const controller = require('../controllers/suratJalan.controller')

router.use(authenticate)

router.get('/',
  isAnyRole,
  validate(listSJQuery, 'query'),
  controller.list,
)

router.post('/',
  isOpsOrAbove,
  validate(createSJSchema),
  logActivity('create_sj', 'surat_jalan'),
  controller.create,
)

router.get('/export',
  isAnyRole,
  validate(listSJQuery, 'query'),
  controller.exportXlsx,
)

router.get('/:uuid',
  isAnyRole,
  validate(uuidParam, 'params'),
  controller.getOne,
)

router.put('/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  validate(updateSJSchema),
  logActivity('update_sj', 'surat_jalan'),
  controller.update,
)

router.patch('/:uuid/assign',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  validate(assignSJSchema),
  logActivity('assign_sj', 'surat_jalan'),
  controller.assign,
)

router.post('/:uuid/pod',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  upload.single('photo'),
  compressImage('pod'),
  controller.uploadPod,
)

router.get('/:uuid/pod',
  isAnyRole,
  validate(uuidParam, 'params'),
  controller.downloadPod,
)

router.patch('/:uuid/deliver',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  validate(deliverSJSchema),
  logActivity('deliver_sj', 'surat_jalan'),
  controller.deliver,
)

router.patch('/:uuid/void',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  validate(voidSJSchema),
  logActivity('void_sj', 'surat_jalan'),
  controller.voidSJ,
)

router.delete('/:uuid',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  logActivity('delete_sj', 'surat_jalan'),
  controller.remove,
)

router.post('/:uuid/generate-pdf',
  isAnyRole,
  validate(uuidParam, 'params'),
  validate(generateSJPdfSchema),
  logActivity('generate_pdf', 'surat_jalan', {
    // Response berisi PdfJob — bukan SJ. Pakai req.params.uuid sebagai record.
    uuidExtractor:  (_b, req) => req.params.uuid,
    labelExtractor: (_b, _req) => null,
    skipBody:       true,
  }),
  controller.generatePdf,
)

// ── Lampiran ──────────────────────────────────────────────────────────────
router.post('/:uuid/lampiran',
  isOpsOrAbove,
  validate(uuidParam, 'params'),
  uploadLampiran.single('file'),
  processLampiran('sj-lampiran'),
  controller.uploadLampiran,
)

router.delete('/:uuid/lampiran/:filename',
  isOpsOrAbove,
  validate(uuidFilenameParam, 'params'),
  controller.deleteLampiran,
)

router.get('/:uuid/lampiran/:filename',
  isAnyRole,
  validate(uuidFilenameParam, 'params'),
  controller.downloadLampiran,
)

module.exports = router
