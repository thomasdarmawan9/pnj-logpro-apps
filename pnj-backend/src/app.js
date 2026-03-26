'use strict'

const express = require('express')
const helmet  = require('helmet')
const cors    = require('cors')
const morgan  = require('morgan')
const path    = require('path')

const env          = require('./config/env')
const logger       = require('./utils/logger')
const routes       = require('./routes')
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
app.use('/uploads', express.static(path.resolve(env.upload.dir)))
app.use('/pdfs',    express.static(path.resolve(env.pdf.outputDir)))

// 5. HTTP logging via morgan → winston
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}))

// 6. Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() })
})

// 7. API routes
app.use('/api/v1', routes)

// 8. 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Endpoint tidak ditemukan: ${req.method} ${req.path}` })
})

// 9. Global error handler (harus paling bawah)
app.use(errorHandler)

module.exports = app
