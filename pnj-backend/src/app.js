'use strict'

const express = require('express')
const helmet  = require('helmet')
const cors    = require('cors')
const morgan  = require('morgan')
const swaggerUi = require('swagger-ui-express')

const env          = require('./config/env')
const logger       = require('./utils/logger')
const routes       = require('./routes')
const openApiSpec  = require('./docs/openapi')
const { errorHandler } = require('./middlewares/errorHandler.middleware')

const app = express()

// 1. Security headers
app.use(helmet())

// 2. CORS
app.use(cors({
  origin:      env.frontendUrl,
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}))

// 3. Body parsers
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 4. Static files
//    NOTE: TIDAK ada static mount publik. Semua dokumen (PDF, lampiran SJ/Invoice,
//    POD photo, fleet photo) bersifat sensitif → akses via endpoint authenticated:
//      GET /api/v1/pdf-jobs/:uuid/download
//      GET /api/v1/surat-jalan/:uuid/lampiran/:filename
//      GET /api/v1/invoices/:uuid/lampiran/:filename
//    Lihat masing-masing controller untuk implementasinya.

// 5. HTTP logging via morgan → winston
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}))

// 6. API docs
app.get('/api-docs/openapi.json', (req, res) => {
  res.json(openApiSpec)
})
app.use('/api-docs', (req, res, next) => {
  // Swagger UI uses inline assets/scripts. Keep docs usable while API routes
  // still receive the global Helmet defaults above.
  res.removeHeader('Content-Security-Policy')
  next()
}, swaggerUi.serve, swaggerUi.setup(openApiSpec, {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
  },
}))

// 7. Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// 8. API routes
app.use('/api/v1', routes)

// 9. 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Endpoint tidak ditemukan: ${req.method} ${req.path}` })
})

// 10. Global error handler (harus paling bawah)
app.use(errorHandler)

module.exports = app
