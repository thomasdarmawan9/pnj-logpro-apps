'use strict'

const { createLogger, format, transports } = require('winston')
const path = require('path')
const fs   = require('fs')

const env = require('../config/env')

const logDir = path.resolve(env.log.dir)
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

const logger = createLogger({
  level: env.log.level,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.File({
      filename: path.join(logDir, 'error.log'),
      level:    'error',
    }),
    new transports.File({
      filename: path.join(logDir, 'combined.log'),
    }),
  ],
})

if (env.nodeEnv !== 'production') {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  )
}

module.exports = logger
