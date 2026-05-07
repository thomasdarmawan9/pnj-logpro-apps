'use strict'

const { Op } = require('sequelize')
const { Customer } = require('../models')

function findByUuid(uuid, options = {}) {
  return Customer.findOne({ where: { uuid }, ...options })
}

function findByNpwp(npwp, options = {}) {
  return Customer.findOne({ where: { npwp }, ...options })
}

function list({ page, limit, search, is_pkp }) {
  const where = {}
  if (typeof is_pkp === 'boolean') where.is_pkp = is_pkp
  if (search) {
    where[Op.or] = [
      { name:     { [Op.iLike]: `%${search}%` } },
      { pic_name: { [Op.iLike]: `%${search}%` } },
      { phone:    { [Op.iLike]: `%${search}%` } },
      { npwp:     { [Op.iLike]: `%${search}%` } },
    ]
  }

  return Customer.findAndCountAll({
    where,
    order:  [['created_at', 'DESC']],
    offset: (page - 1) * limit,
    limit,
  })
}

module.exports = { findByUuid, findByNpwp, list }
