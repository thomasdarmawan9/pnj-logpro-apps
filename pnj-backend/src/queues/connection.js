'use strict'

/**
 * Connection factory untuk BullMQ. BullMQ butuh ioredis instance dengan
 * `maxRetriesPerRequest: null` (memang konvensi BullMQ supaya commands tidak
 * di-retry agar Lua scripts safe).
 *
 * Kita pisahkan dari src/config/redis.js karena yang di config dipakai untuk
 * blacklist/cache (boleh retry), sementara BullMQ butuh konfigurasi berbeda.
 */

const IORedis = require('ioredis')
const env     = require('../config/env')
const logger  = require('../utils/logger')

let bullConn = null

function getBullConnection() {
  if (bullConn) return bullConn

  const opts = {
    host:                 env.redis.host,
    port:                 env.redis.port,
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
  }
  if (env.redis.password) opts.password = env.redis.password

  bullConn = new IORedis(opts)

  bullConn.on('error', (err) => {
    logger.error('[BullMQ Redis] error:', err.message)
  })
  bullConn.on('connect', () => {
    logger.info('[BullMQ Redis] connected.')
  })

  return bullConn
}

async function closeBullConnection() {
  if (!bullConn) return
  await bullConn.quit().catch(() => {})
  bullConn = null
}

module.exports = { getBullConnection, closeBullConnection }
