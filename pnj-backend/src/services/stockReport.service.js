'use strict'

const { Op } = require('sequelize')
const {
  StockItem,
  StockReceipt,
  StockReceiptItem,
  StockDisbursement,
  Customer,
  DeliveryOrder,
  Invoice,
  Fleet,
  Driver,
} = require('../models')
const { NotFoundError } = require('../utils/AppError')
const { computeStockLevel } = require('./stockItem.service')
const { round2 } = require('../utils/stockBalance')

const PERIODS = ['this_month', 'last_month', 'all', 'custom']

function periodToRange(period) {
  if (!period || period === 'all' || period === 'custom') return null
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()

  switch (period) {
    case 'this_month':
      return {
        from: new Date(year, month, 1),
        to:   new Date(year, month + 1, 0, 23, 59, 59),
      }
    case 'last_month':
      return {
        from: new Date(year, month - 1, 1),
        to:   new Date(year, month, 0, 23, 59, 59),
      }
    default: return null
  }
}

function customerKey(customer) {
  return customer.uuid || String(customer.id)
}

function getPlain(row) {
  return typeof row?.get === 'function' ? row.get({ plain: true }) : row
}

function ensureCustomerSummary(map, customer) {
  const key = customerKey(customer)
  if (map.has(key)) return map.get(key)

  const summary = {
    customerId:       Number(customer.id),
    customerUuid:     key,
    customerName:     customer.name,
    totalAsset:       0,
    totalItemTypes:   0,
    totalIn:          0,
    totalOut:         0,
    itemRows:         [],
    transactions:     [],
  }
  map.set(key, summary)
  return summary
}

function ensureCustomerItemRow(summary, item) {
  const plainItem = getPlain(item)
  let row = summary.itemRows.find(r => r.stockItemId === Number(plainItem.id))
  if (row) return row

  row = {
    stockItemId:   Number(plainItem.id),
    stockItemUuid: plainItem.uuid,
    code:          plainItem.code,
    name:          plainItem.name,
    unit:          plainItem.unit,
    categories:    [],
    totalIn:       0,
    totalOut:      0,
    balance:       0,
  }
  summary.itemRows.push(row)
  return row
}

function finalizeCustomerSummary(summary, includeTransactions) {
  summary.itemRows = summary.itemRows
    .map(row => ({
      ...row,
      categories: [...row.categories].sort((a, b) => a.localeCompare(b)),
      totalIn:    round2(row.totalIn),
      totalOut:   round2(row.totalOut),
      balance:    round2(row.totalIn - row.totalOut),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  summary.totalIn        = round2(summary.itemRows.reduce((s, row) => s + row.totalIn, 0))
  summary.totalOut       = round2(summary.itemRows.reduce((s, row) => s + row.totalOut, 0))
  summary.totalAsset     = round2(summary.itemRows.reduce((s, row) => s + row.balance, 0))
  summary.totalItemTypes = summary.itemRows.length
  summary.transactions.sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate !== 0) return byDate
    return a.type.localeCompare(b.type)
  })
  if (!includeTransactions) summary.transactions = []
}

async function buildCustomerStockSummaries({ customerUuid = null, includeTransactions = false } = {}) {
  let customerWhere = {}
  if (customerUuid) customerWhere = { uuid: customerUuid }

  const customers = await Customer.findAll({
    where:      customerWhere,
    attributes: ['id', 'uuid', 'name'],
  })
  if (customerUuid && customers.length === 0) {
    throw new NotFoundError('Customer tidak ditemukan.')
  }

  const customerIds = customers.map(c => c.id)
  if (customerIds.length === 0) return []

  const customerById = new Map(customers.map(c => [Number(c.id), getPlain(c)]))
  const map = new Map()

  const receiptItems = await StockReceiptItem.findAll({
    include: [
      {
        model:      StockReceipt,
        as:         'receipt',
        where:      { customer_id: customerIds },
        required:   true,
        attributes: ['id', 'uuid', 'receipt_number', 'receipt_date', 'supplier_name', 'document_number', 'customer_id', 'notes'],
      },
      {
        model:      StockItem,
        as:         'stock_item',
        attributes: ['id', 'uuid', 'code', 'name', 'unit', 'category'],
      },
    ],
  })

  for (const receiptItemRow of receiptItems) {
    const receiptItem = getPlain(receiptItemRow)
    const receipt = receiptItem.receipt
    const customer = customerById.get(Number(receipt.customer_id))
    if (!customer) continue

    const summary = ensureCustomerSummary(map, customer)
    const itemRow = ensureCustomerItemRow(summary, receiptItem.stock_item)
    itemRow.totalIn = round2(itemRow.totalIn + Number(receiptItem.qty || 0))
    if (receiptItem.kategori_name && !itemRow.categories.includes(receiptItem.kategori_name)) {
      itemRow.categories.push(receiptItem.kategori_name)
    }

    if (includeTransactions) {
      summary.transactions.push({
        id:          `receipt-${receipt.uuid}-${receiptItem.uuid}`,
        date:        receipt.receipt_date,
        type:        'masuk',
        number:      receipt.receipt_number,
        itemCode:    receiptItem.stock_item.code,
        itemName:    receiptItem.stock_item.name,
        category:    receiptItem.kategori_name || null,
        qty:         round2(Number(receiptItem.qty || 0)),
        unit:        receiptItem.stock_item.unit,
        partner:     receipt.supplier_name || '-',
        reference:   receipt.document_number || receipt.receipt_number,
        sjNumber:    null,
        invoiceNumber: null,
        destination: null,
        notes:       receiptItem.notes || receipt.notes || null,
        detailPath:  `/stok/masuk/${receipt.uuid}`,
      })
    }
  }

  const disbursements = await StockDisbursement.findAll({
    where: { customer_id: customerIds },
    include: [
      {
        model:      StockItem,
        as:         'stock_item',
        attributes: ['id', 'uuid', 'code', 'name', 'unit', 'category'],
      },
      {
        model:      DeliveryOrder,
        as:         'delivery_order',
        attributes: ['id', 'uuid', 'sj_number', 'driver_name_manual', 'destination'],
        include:    [
          { model: Invoice, as: 'invoice', attributes: ['id', 'uuid', 'invoice_number'], required: false },
          { model: Fleet, as: 'fleet', attributes: ['id', 'uuid', 'plate_number', 'name'], required: false },
          { model: Driver, as: 'driver', attributes: ['id', 'uuid', 'name'], required: false },
        ],
        required:   false,
      },
    ],
  })

  for (const disbursementRow of disbursements) {
    const disbursement = getPlain(disbursementRow)
    const customer = customerById.get(Number(disbursement.customer_id))
    if (!customer) continue

    const summary = ensureCustomerSummary(map, customer)
    const itemRow = ensureCustomerItemRow(summary, disbursement.stock_item)
    itemRow.totalOut = round2(itemRow.totalOut + Number(disbursement.qty || 0))
    if (disbursement.kategori_name && !itemRow.categories.includes(disbursement.kategori_name)) {
      itemRow.categories.push(disbursement.kategori_name)
    }

    if (includeTransactions) {
      summary.transactions.push({
        id:          `disbursement-${disbursement.uuid}`,
        date:        disbursement.disbursement_date,
        type:        'keluar',
        number:      disbursement.disbursement_number,
        itemCode:    disbursement.stock_item.code,
        itemName:    disbursement.stock_item.name,
        category:    disbursement.kategori_name || null,
        qty:         round2(Number(disbursement.qty || 0)),
        unit:        disbursement.stock_item.unit,
        partner:     null,
        reference:   disbursement.sj_number_manual
          ? `SJ ${disbursement.sj_number_manual}`
          : disbursement.delivery_order?.sj_number || disbursement.disbursement_number,
        sjNumber:    disbursement.delivery_order?.sj_number || disbursement.sj_number_manual || null,
        invoiceNumber: disbursement.delivery_order?.invoice?.invoice_number || disbursement.invoice_number_manual || null,
        destination: disbursement.destination || disbursement.delivery_order?.destination || null,
        driverName:  disbursement.delivery_order?.driver?.name || disbursement.delivery_order?.driver_name_manual || disbursement.driver_name || null,
        vehiclePlate: disbursement.delivery_order?.fleet?.plate_number || disbursement.vehicle_plate || null,
        notes:       disbursement.notes || null,
        detailPath:  `/stok/keluar/${disbursement.uuid}`,
      })
    }
  }

  const summaries = Array.from(map.values())
  summaries.forEach(summary => finalizeCustomerSummary(summary, includeTransactions))
  return summaries.sort((a, b) => a.customerName.localeCompare(b.customerName))
}

async function customerSummary() {
  return buildCustomerStockSummaries({ includeTransactions: false })
}

async function customerDetail(customerUuid) {
  const summaries = await buildCustomerStockSummaries({ customerUuid, includeTransactions: true })
  if (summaries.length === 0) {
    const customer = await Customer.findOne({ where: { uuid: customerUuid }, attributes: ['id', 'uuid', 'name'] })
    if (!customer) throw new NotFoundError('Customer tidak ditemukan.')
    const plainCustomer = getPlain(customer)
    return {
      customerId:       Number(plainCustomer.id),
      customerUuid:     plainCustomer.uuid,
      customerName:     plainCustomer.name,
      totalAsset:       0,
      totalItemTypes:   0,
      totalIn:          0,
      totalOut:         0,
      itemRows:         [],
      transactions:     [],
    }
  }
  return summaries[0]
}

async function customerAvailableItems(customerUuid) {
  const customer = await Customer.findOne({ where: { uuid: customerUuid }, attributes: ['id'] })
  if (!customer) throw new NotFoundError('Customer tidak ditemukan.')

  const map = new Map()
  const ensureRow = (item, kategoriName) => {
    const plainItem = getPlain(item)
    const category = kategoriName || null
    const key = `${plainItem.id}::${category || ''}`
    if (map.has(key)) return map.get(key)

    const row = {
      stockItemId:   Number(plainItem.id),
      stockItemUuid: plainItem.uuid,
      code:          plainItem.code,
      name:          plainItem.name,
      unit:          plainItem.unit,
      categoryName:  category,
      categories:    category ? [category] : [],
      totalIn:       0,
      totalOut:      0,
      availableQty:  0,
    }
    map.set(key, row)
    return row
  }

  const receiptItems = await StockReceiptItem.findAll({
    include: [
      {
        model:      StockReceipt,
        as:         'receipt',
        where:      { customer_id: customer.id },
        required:   true,
        attributes: [],
      },
      {
        model:      StockItem,
        as:         'stock_item',
        attributes: ['id', 'uuid', 'code', 'name', 'unit'],
      },
    ],
  })

  for (const receiptItemRow of receiptItems) {
    const receiptItem = getPlain(receiptItemRow)
    const row = ensureRow(receiptItem.stock_item, receiptItem.kategori_name || null)
    row.totalIn = round2(row.totalIn + Number(receiptItem.qty || 0))
  }

  const disbursements = await StockDisbursement.findAll({
    where: { customer_id: customer.id },
    include: [{
      model:      StockItem,
      as:         'stock_item',
      attributes: ['id', 'uuid', 'code', 'name', 'unit'],
    }],
  })

  for (const disbursementRow of disbursements) {
    const disbursement = getPlain(disbursementRow)
    const row = ensureRow(disbursement.stock_item, disbursement.kategori_name || null)
    row.totalOut = round2(row.totalOut + Number(disbursement.qty || 0))
  }

  return Array.from(map.values())
    .map(row => ({
      ...row,
      availableQty: round2(row.totalIn - row.totalOut),
    }))
    .filter(row => row.availableQty > 0)
    .sort((a, b) => {
      const byName = a.name.localeCompare(b.name)
      if (byName !== 0) return byName
      return (a.categoryName || '').localeCompare(b.categoryName || '')
    })
}

/**
 * Recap per stock item: kombinasi receipt + disbursement, sorted by date,
 * dengan running balance. Mirip behavior FE GetStockRecap.calculateRunningBalance.
 *
 * Filter customerId optional. Period filter: balance dihitung dari awal
 * (lifetime) lalu di-trim ke period.
 */
async function recap(params) {
  const { stock_item_uuid, customer_uuid, period, from, to } = params

  const stockItem = await StockItem.findOne({ where: { uuid: stock_item_uuid } })
  if (!stockItem) throw new NotFoundError('Stock item tidak ditemukan.')

  let customerId = null
  let customer = null
  if (customer_uuid) {
    const c = await Customer.findOne({ where: { uuid: customer_uuid }, attributes: ['id', 'uuid', 'name'] })
    if (!c) {
      return {
        stock_item: decorateItem(stockItem),
        customer:   null,
        rows:       [],
        totals:     {
          total_in: 0, total_out: 0, ending_balance: 0,
          lifetime_in: 0, lifetime_out: 0,
          current_balance: round2(Number(stockItem.current_stock || 0)),
        },
      }
    }
    customerId = c.id
    customer = getPlain(c)
  }

  // 1) Ambil seluruh riwayat untuk hitung running balance dari nol.
  const receiptItems = await StockReceiptItem.findAll({
    where: { stock_item_id: stockItem.id },
    include: [{
      model:    StockReceipt,
      as:       'receipt',
      where:    customerId ? { customer_id: customerId } : undefined,
      required: true,
    }],
  })

  const disbursements = await StockDisbursement.findAll({
    where: {
      stock_item_id: stockItem.id,
      ...(customerId ? { customer_id: customerId } : {}),
    },
    include: [{
      model:      DeliveryOrder,
      as:         'delivery_order',
      attributes: ['id', 'uuid', 'sj_number', 'driver_name_manual', 'destination'],
      include:    [
        { model: Invoice, as: 'invoice', attributes: ['id', 'uuid', 'invoice_number'], required: false },
      ],
      required:   false,
    }],
  })

  const rows = []

  for (const ri of receiptItems) {
    const r = ri.receipt
    rows.push({
      date:               r.receipt_date,
      type:               'receipt',
      reference_number:   r.receipt_number,
      sj_or_spal:         r.document_number || r.receipt_number,
      supplier_or_driver: r.supplier_name || '—',
      vehicle_plate:      null,
      destination:        null,
      qty_in:             round2(Number(ri.qty)),
      qty_out:            null,
      balance:            0,
      notes:              ri.notes,
      kategori_name:      ri.kategori_name || null,
    })
  }

  for (const d of disbursements) {
    const sjLabel = d.sj_number_manual
      ? `SJ ${d.sj_number_manual}`
      : (d.delivery_order?.sj_number || d.disbursement_number)
    const driver = d.driver_name || d.delivery_order?.driver_name_manual || '—'
    rows.push({
      date:               d.disbursement_date,
      type:               'disbursement',
      reference_number:   d.disbursement_number,
      sj_or_spal:         sjLabel,
      supplier_or_driver: driver,
      vehicle_plate:      d.vehicle_plate,
      destination:        d.destination || d.delivery_order?.destination || null,
      invoice_number:     d.invoice_number_manual || d.delivery_order?.invoice?.invoice_number || null,
      qty_in:             null,
      qty_out:            round2(Number(d.qty)),
      balance:            0,
      notes:              d.notes,
      kategori_name:      d.kategori_name || null,
    })
  }

  // Sort by date ASC. Tiebreaker: receipt sebelum disbursement pada tanggal sama.
  rows.sort((a, b) => {
    const da = new Date(a.date).getTime()
    const db = new Date(b.date).getTime()
    if (da !== db) return da - db
    if (a.type === b.type) return 0
    return a.type === 'receipt' ? -1 : 1
  })

  let balance  = 0
  let totalIn  = 0
  let totalOut = 0
  const withBalance = rows.map(row => {
    if (row.qty_in)  { balance = round2(balance + row.qty_in);  totalIn  = round2(totalIn  + row.qty_in)  }
    if (row.qty_out) { balance = round2(balance - row.qty_out); totalOut = round2(totalOut + row.qty_out) }
    return { ...row, balance }
  })

  // 2) Apply period filter (in-place trim).
  let filtered = withBalance
  let periodRange = null
  if (from || to) periodRange = { from: from || null, to: to || null }
  else            periodRange = periodToRange(period)

  if (periodRange && (periodRange.from || periodRange.to)) {
    filtered = withBalance.filter(row => {
      const d = new Date(row.date).getTime()
      if (periodRange.from && d < new Date(periodRange.from).getTime()) return false
      if (periodRange.to   && d > new Date(periodRange.to).getTime())   return false
      return true
    })
  }

  // Totals re-computed dari filtered rows (in-period).
  const periodTotalIn  = round2(filtered.reduce((s, r) => s + (r.qty_in  || 0), 0))
  const periodTotalOut = round2(filtered.reduce((s, r) => s + (r.qty_out || 0), 0))

  return {
    stock_item: decorateItem(stockItem),
    customer,
    rows:       filtered,
    totals: {
      total_in:        periodTotalIn,
      total_out:       periodTotalOut,
      ending_balance:  filtered.length > 0 ? filtered[filtered.length - 1].balance : balance,
      lifetime_in:     totalIn,
      lifetime_out:    totalOut,
      current_balance: round2(Number(stockItem.current_stock || 0)),
    },
  }
}

/**
 * Summary: snapshot semua stock item — code, name, current_stock, peak_stock,
 * stock_level. Untuk dashboard/list.
 */
async function summary(params) {
  const where = {}
  if (params.search) {
    where[Op.or] = [
      { code: { [Op.iLike]: `%${params.search}%` } },
      { name: { [Op.iLike]: `%${params.search}%` } },
    ]
  }
  if (params.category) where.category = params.category
  if (typeof params.is_active === 'boolean') where.is_active = params.is_active

  const items = await StockItem.findAll({
    where,
    order: [['code', 'ASC']],
  })

  return items.map(decorateItem)
}

function decorateItem(item) {
  const plain = typeof item.get === 'function' ? item.get({ plain: true }) : item
  plain.current_stock = Number(plain.current_stock || 0)
  plain.peak_stock    = Number(plain.peak_stock    || 0)
  plain.stock_level   = computeStockLevel(plain.current_stock, plain.peak_stock)
  return plain
}

module.exports = { PERIODS, recap, summary, customerSummary, customerDetail, customerAvailableItems, periodToRange }
