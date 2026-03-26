'use strict'

require('./src/config/env')

const fs   = require('fs')
const path = require('path')
const app  = require('./src/app')
const env  = require('./src/config/env')
const logger = require('./src/utils/logger')
const { testConnection } = require('./src/config/database')
const { redis }          = require('./src/config/redis')

async function bootstrap() {
  // 1. Pastikan folder penting sudah ada
  const dirs = [
    path.resolve(env.upload.dir),
    path.resolve(env.pdf.outputDir),
    path.resolve(env.log.dir),
  ]
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
      logger.info(`Folder dibuat: ${dir}`)
    }
  }

  // 2. Test koneksi PostgreSQL
  await testConnection()

  // 3. Koneksi Redis
  await redis.connect()

  // 4. Start server
  app.listen(env.port, () => {
    logger.info(`PNJ Backend berjalan di port ${env.port} (${env.nodeEnv})`)
    logger.info(`Health check: http://localhost:${env.port}/health`)
  })
}

bootstrap().catch((err) => {
  logger.error('Gagal menjalankan server:', err)
  process.exit(1)
})
