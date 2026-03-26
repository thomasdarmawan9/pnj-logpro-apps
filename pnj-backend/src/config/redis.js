'use strict'

const Redis  = require('ioredis')
const env    = require('./env')
const logger = require('../utils/logger')

const redisConfig = {
  host:          env.redis.host,
  port:          env.redis.port,
  lazyConnect:   true,
  retryStrategy: (times) => Math.min(times * 50, 2000),
}

if (env.redis.password) {
  redisConfig.password = env.redis.password
}

const redis = new Redis(redisConfig)

redis.on('connect',      ()  => logger.info('Redis terhubung.'))
redis.on('error',        (e) => logger.error('Redis error:', e))
redis.on('reconnecting', ()  => logger.warn('Redis mencoba reconnect...'))

const REDIS_KEYS = {
  JWT_BLACKLIST:    (token) => `blacklist:${token}`,
  DASHBOARD_CACHE:  (role)  => `cache:dashboard:${role}`,
  AGING_AR_CACHE:            'cache:reports:aging_ar',
  PNL_CACHE:                 'cache:reports:profit_loss',
  RATE_LIMIT_LOGIN: (ip)    => `ratelimit:login:${ip}`,
}

const CACHE_TTL = {
  DASHBOARD:  5  * 60,
  REPORTS:    10 * 60,
  JWT_ACCESS: 15 * 60,
}

module.exports = { redis, REDIS_KEYS, CACHE_TTL }
