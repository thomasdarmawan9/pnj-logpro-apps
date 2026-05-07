'use strict'

const { Op } = require('sequelize')
const { Project, Customer } = require('../models')

const CUSTOMER_ATTRS = ['id', 'uuid', 'name', 'npwp', 'is_pkp']

function findByUuid(uuid, options = {}) {
  return Project.findOne({
    where: { uuid },
    include: [{ model: Customer, as: 'customer', attributes: CUSTOMER_ATTRS }],
    ...options,
  })
}

function list({ page, limit, search, status, customerId }) {
  const where = {}
  if (status) where.status = status
  if (customerId) where.customer_id = customerId
  if (search) {
    where[Op.or] = [
      { name:            { [Op.iLike]: `%${search}%` } },
      { code:            { [Op.iLike]: `%${search}%` } },
      { contract_number: { [Op.iLike]: `%${search}%` } },
    ]
  }

  return Project.findAndCountAll({
    where,
    include: [{ model: Customer, as: 'customer', attributes: CUSTOMER_ATTRS }],
    order:   [['created_at', 'DESC']],
    offset:  (page - 1) * limit,
    limit,
    distinct: true,
  })
}

module.exports = { CUSTOMER_ATTRS, findByUuid, list }
