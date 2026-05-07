'use strict'

const { Op } = require('sequelize')
const {
  DeliveryOrder,
  Project,
  Customer,
  Fleet,
  Driver,
  Invoice,
} = require('../models')

const INCLUDES = [
  {
    model:      Project,
    as:         'project',
    attributes: ['id', 'uuid', 'code', 'name', 'contract_number'],
  },
  {
    model:      Customer,
    as:         'customer',
    attributes: ['id', 'uuid', 'name', 'is_pkp'],
  },
  {
    model:      Fleet,
    as:         'fleet',
    attributes: ['id', 'uuid', 'name', 'plate_number', 'is_tbd', 'category'],
  },
  {
    model:      Driver,
    as:         'driver',
    attributes: ['id', 'uuid', 'name', 'phone', 'sim_expired_at'],
    required:   false,
  },
  {
    model:      Invoice,
    as:         'invoice',
    attributes: ['id', 'uuid', 'invoice_number', 'status'],
    required:   false,
  },
]

function findByUuid(uuid, options = {}) {
  return DeliveryOrder.findOne({
    where:   { uuid },
    include: INCLUDES,
    ...options,
  })
}

function findById(id, options = {}) {
  return DeliveryOrder.findByPk(id, { include: INCLUDES, ...options })
}

function findBySjNumber(sjNumber, options = {}) {
  return DeliveryOrder.findOne({ where: { sj_number: sjNumber }, ...options })
}

/**
 * List dengan filter lengkap. `periodRange` diberikan oleh service
 * sebagai { from, to } Date objects sudah translated dari keyword period.
 */
function list({
  page, limit, search,
  status, invoiceStatus,
  projectId, customerId,
  periodRange,
}) {
  const where = {}

  if (status && status !== 'all') where.status = status
  if (invoiceStatus && invoiceStatus !== 'all') {
    where.invoice_attachment_status = invoiceStatus
  }
  if (projectId)  where.project_id  = projectId
  if (customerId) where.customer_id = customerId

  if (periodRange && (periodRange.from || periodRange.to)) {
    where.sj_date = {}
    if (periodRange.from) where.sj_date[Op.gte] = periodRange.from
    if (periodRange.to)   where.sj_date[Op.lte] = periodRange.to
  }

  if (search) {
    where[Op.or] = [
      { sj_number:         { [Op.iLike]: `%${search}%` } },
      { origin:            { [Op.iLike]: `%${search}%` } },
      { destination:       { [Op.iLike]: `%${search}%` } },
      { cargo_description: { [Op.iLike]: `%${search}%` } },
    ]
  }

  return DeliveryOrder.findAndCountAll({
    where,
    include:  INCLUDES,
    order:    [['sj_date', 'DESC'], ['created_at', 'DESC']],
    offset:   (page - 1) * limit,
    limit,
    distinct: true,
  })
}

module.exports = { INCLUDES, findByUuid, findById, findBySjNumber, list }
