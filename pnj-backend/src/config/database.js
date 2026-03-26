'use strict'

const { Sequelize } = require('sequelize')
const env    = require('./env')
const logger = require('../utils/logger')

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, {
  host:    env.db.host,
  port:    env.db.port,
  dialect: 'postgres',
  pool: {
    max:     10,
    min:     2,
    acquire: 30000,
    idle:    10000,
  },
  define: {
    underscored:  true,
    timestamps:   true,
    paranoid:     true,
    createdAt:    'created_at',
    updatedAt:    'updated_at',
    deletedAt:    'deleted_at',
  },
  logging: (msg) => logger.debug(msg),
})

async function testConnection() {
  try {
    await sequelize.authenticate()
    logger.info('Koneksi database PostgreSQL berhasil.')
  } catch (err) {
    logger.error('Gagal terhubung ke database PostgreSQL:', err)
    throw err
  }
}

module.exports = { sequelize, testConnection }
