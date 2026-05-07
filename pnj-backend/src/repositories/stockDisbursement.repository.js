'use strict'

const { Op } = require('sequelize')
const {
  StockDisbursement,
  StockItem,
  Customer,
  DeliveryOrder,
  Fleet,
  Driver,
  User,
} = require('../models')

const STOCK_ITEM_INCLUDE = {
  model:      StockItem,
  as:         'stock_item',
  attributes: ['id', 'uuid', 'code', 'name', 'unit', 'category', 'current_stock', 'peak_stock'],
}

const CUSTOMER_INCLUDE = {
  model:      Customer,
  as:         'customer',
  attributes: ['id', 'uuid', 'name'],
  required:   false,
}

const CREATOR_INCLUDE = {
  model:      User,
  as:         'creator',
  attributes: ['id', 'uuid', 'name'],
  required:   false,
}

const DELIVERY_ORDER_INCLUDE = {
  model:      DeliveryOrder,
  as:         'delivery_order',
  attributes: [
    'id', 'uuid', 'sj_number', 'sj_date',
    'origin', 'destination', 'status', 'driver_name_manual',
  ],
  include: [
    { model: Fleet,  as: 'fleet',  attributes: ['id', 'uuid', 'name', 'plate_number'], required: false },
    { model: Driver, as: 'driver', attributes: ['id', 'uuid', 'name'], required: false },
  ],
  required: false,
}

const FULL_INCLUDES = [
  STOCK_ITEM_INCLUDE,
  CUSTOMER_INCLUDE,
  DELIVERY_ORDER_INCLUDE,
  CREATOR_INCLUDE,
]

function findByUuid(uuid, options = {}) {
  return StockDisbursement.findOne({
    where:   { uuid },
    include: FULL_INCLUDES,
    ...options,
  })
}

function findById(id, options = {}) {
  return StockDisbursement.findByPk(id, { include: FULL_INCLUDES, ...options })
}

function list({
  page, limit, search,
  customerId, stockItemId,
  periodRange,
}) {
  const where = {}

  if (customerId)  where.customer_id   = customerId
  if (stockItemId) where.stock_item_id = stockItemId

  if (periodRange && (periodRange.from || periodRange.to)) {
    where.disbursement_date = {}
    if (periodRange.from) where.disbursement_date[Op.gte] = periodRange.from
    if (periodRange.to)   where.disbursement_date[Op.lte] = periodRange.to
  }

  if (search) {
    where[Op.or] = [
      { disbursement_number:    { [Op.iLike]: `%${search}%` } },
      { sj_number_manual:       { [Op.iLike]: `%${search}%` } },
      { invoice_number_manual:  { [Op.iLike]: `%${search}%` } },
      { driver_name:            { [Op.iLike]: `%${search}%` } },
      { vehicle_plate:          { [Op.iLike]: `%${search}%` } },
      { destination:            { [Op.iLike]: `%${search}%` } },
      { notes:                  { [Op.iLike]: `%${search}%` } },
    ]
  }

  return StockDisbursement.findAndCountAll({
    where,
    include: FULL_INCLUDES,
    order:    [['disbursement_date', 'DESC'], ['created_at', 'DESC']],
    offset:   (page - 1) * limit,
    limit,
    distinct: true,
  })
}

module.exports = {
  FULL_INCLUDES,
  findByUuid,
  findById,
  list,
}
