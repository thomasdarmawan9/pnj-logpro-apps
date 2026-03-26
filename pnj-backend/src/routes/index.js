'use strict'

const express = require('express')
const router  = express.Router()

router.use('/auth',       require('./auth.routes'))
router.use('/users',      require('./users.routes'))
router.use('/customers',  require('./customers.routes'))
router.use('/fleets',     require('./fleets.routes'))
router.use('/drivers',    require('./drivers.routes'))
router.use('/projects',   require('./projects.routes'))
router.use('/surat-jalan', require('./suratJalan.routes'))
router.use('/invoices',   require('./invoices.routes'))
router.use('/stock',      require('./stock.routes'))
router.use('/reports',    require('./reports.routes'))
router.use('/dashboard',  require('./dashboard.routes'))
router.use('/pdf-jobs',   require('./pdfJobs.routes'))
router.use('/settings',   require('./settings.routes'))

module.exports = router
