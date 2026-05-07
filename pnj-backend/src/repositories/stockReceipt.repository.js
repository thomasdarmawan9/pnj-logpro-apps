'use strict'

const { Op } = require('sequelize')
const {
  StockReceipt,
  StockReceiptItem,
  StockItem,
  Customer,
  User,
} = require('../models')

const ITEM_INCLUDE = {
  model: StockReceiptItem,
  as:    'items',
  include: [{
    model:      StockItem,
    as:         'stock_item',
    attributes: ['id', 'uuid', 'code', 'name', 'unit', 'category', 'current_stock', 'peak_stock'],
  }],
  separate: false,
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

const HEADER_INCLUDES = [CUSTOMER_INCLUDE, CREATOR_INCLUDE]
const FULL_INCLUDES   = [CUSTOMER_INCLUDE, CREATOR_INCLUDE, ITEM_INCLUDE]

function findByUuid(uuid, options = {}) {
  return StockReceipt.findOne({
    where:   { uuid },
    include: FULL_INCLUDES,
    order:   [
      [{ model: StockReceiptItem, as: 'items' }, 'id', 'ASC'],
    ],
    ...options,
  })
}

function findById(id, options = {}) {
  return StockReceipt.findByPk(id, { include: FULL_INCLUDES, ...options })
}

/**
 * List receipts. periodRange diberikan service.
 * stockItemId: filter receipt yang punya item dengan stock_item_id tertentu.
 */
function list({
  page, limit, search,
  customerId, stockItemId,
  periodRange,
}) {
  const where = {}

  if (customerId) where.customer_id = customerId

  if (periodRange && (periodRange.from || periodRange.to)) {
    where.receipt_date = {}
    if (periodRange.from) where.receipt_date[Op.gte] = periodRange.from
    if (periodRange.to)   where.receipt_date[Op.lte] = periodRange.to
  }

  if (search) {
    where[Op.or] = [
      { receipt_number:  { [Op.iLike]: `%${search}%` } },
      { document_number: { [Op.iLike]: `%${search}%` } },
      { supplier_name:   { [Op.iLike]: `%${search}%` } },
      { notes:           { [Op.iLike]: `%${search}%` } },
    ]
  }

  // Kalau filter by stock_item, gunakan inner join.
  const include = [CUSTOMER_INCLUDE, CREATOR_INCLUDE]
  if (stockItemId) {
    include.push({
      model:    StockReceiptItem,
      as:       'items',
      where:    { stock_item_id: stockItemId },
      required: true,
      include: [{
        model:      StockItem,
        as:         'stock_item',
        attributes: ['id', 'uuid', 'code', 'name', 'unit'],
      }],
    })
  } else {
    include.push(ITEM_INCLUDE)
  }

  return StockReceipt.findAndCountAll({
    where,
    include,
    order:    [['receipt_date', 'DESC'], ['created_at', 'DESC']],
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
  list,
}
