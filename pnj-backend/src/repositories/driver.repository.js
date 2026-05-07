'use strict'

const { Op } = require('sequelize')
const { Driver } = require('../models')

function findByUuid(uuid, options = {}) {
  return Driver.findOne({ where: { uuid }, ...options })
}

function list({ page, limit, search, status }) {
  const where = {}
  if (status) where.status = status
  if (search) {
    where[Op.or] = [
      { name:       { [Op.iLike]: `%${search}%` } },
      { phone:      { [Op.iLike]: `%${search}%` } },
      { sim_number: { [Op.iLike]: `%${search}%` } },
    ]
  }
  return Driver.findAndCountAll({
    where,
    order:  [['created_at', 'DESC']],
    offset: (page - 1) * limit,
    limit,
  })
}

module.exports = { findByUuid, list }
