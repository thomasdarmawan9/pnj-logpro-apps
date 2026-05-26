'use strict'

const { Op } = require('sequelize')
const {
  Invoice,
  InvoiceItem,
  Project,
  Customer,
  Fleet,
  Payment,
  DeliveryOrder,
  Driver,
  BankAccount,
  User,
} = require('../models')

const ITEM_INCLUDE = {
  model:   InvoiceItem,
  as:      'items',
  include: [{
    model:      Fleet,
    as:         'fleet',
    attributes: ['id', 'uuid', 'name', 'plate_number'],
    required:   false,
  }],
  separate: false,
}

const PAYMENT_INCLUDE = {
  model:    Payment,
  as:       'payments',
  required: false,
  include:  [{
    model:      User,
    as:         'creator',
    attributes: ['id', 'name'],
    required:   false,
  }],
}

const ATTACHED_SJ_INCLUDE = {
  model:    DeliveryOrder,
  as:       'attachedSJs',
  attributes: [
    'id', 'uuid', 'sj_number', 'sj_date',
    'origin', 'destination', 'status',
    'driver_name_manual',
  ],
  include: [
    { model: Fleet,  as: 'fleet',  attributes: ['id', 'uuid', 'name', 'plate_number'] },
    { model: Driver, as: 'driver', attributes: ['id', 'uuid', 'name'], required: false },
  ],
  required: false,
}

const HEADER_INCLUDES = [
  {
    model:      Project,
    as:         'project',
    attributes: ['id', 'uuid', 'code', 'name', 'contract_number'],
    required:   false,
  },
  {
    model:      Customer,
    as:         'customer',
    attributes: ['id', 'uuid', 'name', 'address', 'npwp', 'is_pkp'],
  },
]

const BANK_ACCOUNT_INCLUDE = {
  model:      BankAccount,
  as:         'bank_account',
  attributes: ['id', 'uuid', 'bank_name', 'account_number', 'account_holder'],
  required:   false,
}

const FULL_INCLUDES = [
  ...HEADER_INCLUDES,
  BANK_ACCOUNT_INCLUDE,
  ITEM_INCLUDE,
  PAYMENT_INCLUDE,
  ATTACHED_SJ_INCLUDE,
]

function findByUuid(uuid, options = {}) {
  return Invoice.findOne({
    where:   { uuid },
    include: FULL_INCLUDES,
    order:   [
      [{ model: InvoiceItem, as: 'items' }, 'sort_order', 'ASC'],
      [{ model: InvoiceItem, as: 'items' }, 'id', 'ASC'],
      [{ model: Payment,     as: 'payments' }, 'payment_date', 'ASC'],
    ],
    ...options,
  })
}

function findById(id, options = {}) {
  return Invoice.findByPk(id, { include: FULL_INCLUDES, ...options })
}

function findByNumber(invoiceNumber, options = {}) {
  return Invoice.findOne({ where: { invoice_number: invoiceNumber }, ...options })
}

/**
 * List dengan filter. periodRange diberikan service (bukan keyword period).
 */
function list({
  page, limit, search,
  status, projectId, customerId,
  periodRange,
}) {
  const where = {}

  if (status && status !== 'all') where.status = status
  if (projectId)  where.project_id  = projectId
  if (customerId) where.customer_id = customerId

  if (periodRange && (periodRange.from || periodRange.to)) {
    where.invoice_date = {}
    if (periodRange.from) where.invoice_date[Op.gte] = periodRange.from
    if (periodRange.to)   where.invoice_date[Op.lte] = periodRange.to
  }

  if (search) {
    where[Op.or] = [
      { invoice_number: { [Op.iLike]: `%${search}%` } },
      { notes:          { [Op.iLike]: `%${search}%` } },
    ]
  }

  return Invoice.findAndCountAll({
    where,
    include:  HEADER_INCLUDES,
    order:    [['invoice_date', 'DESC'], ['created_at', 'DESC']],
    offset:   (page - 1) * limit,
    limit,
    distinct: true,
  })
}

module.exports = {
  HEADER_INCLUDES,
  FULL_INCLUDES,
  findByUuid,
  findById,
  findByNumber,
  list,
}
