'use strict'

const { Op } = require('sequelize')
const { Fleet } = require('../models')

function findByUuid(uuid, options = {}) {
  return Fleet.findOne({ where: { uuid }, ...options })
}

function findByPlate(plate, options = {}) {
  return Fleet.findOne({ where: { plate_number: plate }, ...options })
}

function list({ page, limit, search, category, status, include_tbd }) {
  const where = {}
  if (category) where.category = category
  if (status)   where.status   = status
  if (include_tbd === false) where.is_tbd = false
  if (search) {
    where[Op.or] = [
      { plate_number: { [Op.iLike]: `%${search}%` } },
      { name:         { [Op.iLike]: `%${search}%` } },
      { brand:        { [Op.iLike]: `%${search}%` } },
    ]
  }

  return Fleet.findAndCountAll({
    where,
    order:  [['is_tbd', 'ASC'], ['created_at', 'DESC']],
    offset: (page - 1) * limit,
    limit,
  })
}

module.exports = { findByUuid, findByPlate, list }
