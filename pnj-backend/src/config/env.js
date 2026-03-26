'use strict'

require('dotenv').config()

const requiredVars = [
  'DB_HOST',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
]

const missing = requiredVars.filter((v) => !process.env[v])
if (missing.length > 0) {
  console.error(`[ENV ERROR] Variable wajib tidak ditemukan: ${missing.join(', ')}`)
  console.error('Pastikan file .env sudah dibuat dan semua variable wajib sudah diisi.')
  process.exit(1)
}

const env = {
  nodeEnv:     process.env.NODE_ENV || 'development',
  port:        parseInt(process.env.PORT, 10) || 3001,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  db: {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT, 10) || 5432,
    name:     process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },

  redis: {
    host:     process.env.REDIS_HOST || '127.0.0.1',
    port:     parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret:  process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES  || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  upload: {
    dir:              process.env.UPLOAD_DIR || './uploads',
    maxFileSizeMB:    parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5,
    compressQuality:  parseInt(process.env.UPLOAD_COMPRESS_QUALITY, 10) || 80,
  },

  pdf: {
    outputDir:          process.env.PDF_OUTPUT_DIR || './pdfs',
    workerMaxConcurrent: parseInt(process.env.PDF_WORKER_MAX_CONCURRENT, 10) || 2,
  },

  log: {
    level: process.env.LOG_LEVEL || 'info',
    dir:   process.env.LOG_DIR   || './logs',
  },

  rateLimit: {
    windowMs:  parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxLogin:  parseInt(process.env.RATE_LIMIT_MAX_LOGIN, 10) || 5,
  },
}

module.exports = env
