'use strict'

const { Op } = require('sequelize')
const { StockItem } = require('../models')

function findByUuid(uuid, options = {}) {
  return StockItem.findOne({ where: { uuid }, ...options })
}

function findByCode(code, options = {}) {
  return StockItem.findOne({ where: { code }, ...options })
}

function list({ page, limit, search, category, is_active }) {
  const where = {}
  if (category) where.category = category
  if (typeof is_active === 'boolean') where.is_active = is_active
  if (search) {
    where[Op.or] = [
      { code: { [Op.iLike]: `%${search}%` } },
      { name: { [Op.iLike]: `%${search}%` } },
    ]
  }

  return StockItem.findAndCountAll({
    where,
    order:  [['code', 'ASC']],
    offset: (page - 1) * limit,
    limit,
  })
}

module.exports = { findByUuid, findByCode, list }
