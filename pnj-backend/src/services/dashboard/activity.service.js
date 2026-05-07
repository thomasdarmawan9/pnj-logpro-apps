'use strict'

const { Op } = require('sequelize')
const {
  Invoice,
  DeliveryOrder,
  Project,
  Customer,
  Fleet,
  Driver,
} = require('../../models')
const { startOfMonth, endOfMonth, toISODate } = require('../../utils/reportPeriods')

// FE → BE status mapping. FE pakai uppercase, BE pakai lowercase.
const SJ_STATUS_MAP = {
  DRAFT:     'draft',
  ASSIGNED:  'assigned',
  DELIVERED: 'delivered',
  VOID:      'void',
}
// FE OUTSTANDING mencakup BE 'sent' + 'outstanding'.
const INVOICE_STATUS_MAP = {
  DRAFT:       ['draft'],
  OUTSTANDING: ['sent', 'outstanding'],
  PAID:        ['paid'],
  VOID:        ['void'],
}

function periodToRange(period) {
  if (period === 'all') return { from: null, to: null }
  const now = new Date()
  if (period === 'this_month') {
    return { from: startOfMonth(now), to: endOfMonth(now) }
  }
  if (period === 'last_month') {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return { from: startOfMonth(last), to: endOfMonth(last) }
  }
  return { from: null, to: null }
}

function buildSjWhere({ status, period }) {
  const where = {}
  if (status !== 'all' && SJ_STATUS_MAP[status]) {
    where.status = SJ_STATUS_MAP[status]
  } else if (status !== 'all' && !SJ_STATUS_MAP[status]) {
    // Status hanya untuk Invoice — kalau status invoice-only ditanyakan ke
    // SJ branch, return empty.
    return null
  }
  const { from, to } = periodToRange(period)
  if (from && to) where.sj_date = { [Op.between]: [from, to] }
  return where
}

function buildInvoiceWhere({ status, period }) {
  const where = {}
  if (status !== 'all' && INVOICE_STATUS_MAP[status]) {
    where.status = { [Op.in]: INVOICE_STATUS_MAP[status] }
  } else if (status !== 'all' && !INVOICE_STATUS_MAP[status]) {
    // Status hanya valid untuk SJ.
    return null
  }
  const { from, to } = periodToRange(period)
  if (from && to) where.invoice_date = { [Op.between]: [from, to] }
  return where
}

/**
 * Map SJ → ActivityRow (sesuai shape FE activityData).
 */
function mapSj(sj) {
  const plain = sj.get({ plain: true })
  const fleetIsTbd = !plain.fleet || plain.fleet.is_tbd
  const armada = fleetIsTbd
    ? 'TBD'
    : `${plain.fleet?.name || ''} ${plain.fleet?.plate_number || ''}`.trim()

  // Status invoice attachment
  let statusInvoice = 'belum'
  let invoiceNo     = null
  if (plain.invoice) {
    statusInvoice = 'terlampir'
    invoiceNo     = plain.invoice.invoice_number
  }

  return {
    id:            `sj-${plain.id}`,
    type:          'sj',
    record_uuid:   plain.uuid,
    noDokumen:     plain.sj_number,
    proyek:        plain.project
      ? `${plain.customer?.name || '—'} / ${plain.project.name}`
      : (plain.customer?.name || '—'),
    armada,
    statusOps:     String(plain.status || '').toUpperCase(),
    statusInvoice,
    invoiceNo,
    tanggal:       formatDateID(plain.sj_date),
    tanggalISO:    toISODate(plain.sj_date),
    sortKey:       new Date(plain.sj_date).getTime(),
  }
}

/**
 * Map Invoice → ActivityRow.
 */
function mapInvoice(inv) {
  const plain = inv.get({ plain: true })
  const sjCount = (plain.attachedSJs || []).length

  // FE statusOps untuk Invoice — pakai mapping dari BE → FE label.
  let statusOps = String(plain.status || '').toUpperCase()
  if (plain.status === 'sent') statusOps = 'OUTSTANDING'  // FE merge sent + outstanding

  return {
    id:            `inv-${plain.id}`,
    type:          'invoice',
    record_uuid:   plain.uuid,
    noDokumen:     plain.invoice_number,
    proyek:        plain.project
      ? `${plain.customer?.name || '—'} / ${plain.project.contract_number || plain.project.code}`
      : (plain.customer?.name || '—'),
    armada:        sjCount > 0 ? `${sjCount} unit kendaraan` : '—',
    statusOps,
    statusInvoice: null,
    invoiceNo:     null,
    tanggal:       formatDateID(plain.invoice_date),
    tanggalISO:    toISODate(plain.invoice_date),
    sortKey:       new Date(plain.invoice_date).getTime(),
  }
}

const BULAN_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
function formatDateID(input) {
  if (!input) return '-'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return String(input)
  return `${String(d.getUTCDate()).padStart(2, '0')} ${BULAN_ID[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/**
 * @param {object} filters - { module, status, period, page, limit }
 */
async function getActivity(filters = {}) {
  const { module, status, period, page, limit } = filters

  const sjBaseInclude = [
    { model: Project,  as: 'project',  attributes: ['id', 'uuid', 'code', 'name', 'contract_number'], required: false },
    { model: Customer, as: 'customer', attributes: ['id', 'uuid', 'name'], required: false },
    { model: Fleet,    as: 'fleet',    attributes: ['id', 'uuid', 'name', 'plate_number', 'is_tbd'], required: false },
    { model: Driver,   as: 'driver',   attributes: ['id', 'uuid', 'name'], required: false },
    { model: Invoice,  as: 'invoice',  attributes: ['id', 'uuid', 'invoice_number'], required: false },
  ]

  const invoiceBaseInclude = [
    { model: Project,  as: 'project',  attributes: ['id', 'uuid', 'code', 'name', 'contract_number'], required: false },
    { model: Customer, as: 'customer', attributes: ['id', 'uuid', 'name'], required: false },
    {
      model: DeliveryOrder, as: 'attachedSJs',
      attributes: ['id', 'uuid', 'sj_number'],
      required: false,
    },
  ]

  const wantSj      = module === 'all' || module === 'sj'
  const wantInvoice = module === 'all' || module === 'invoice'

  const sjWhere      = wantSj      ? buildSjWhere({ status, period })      : null
  const invoiceWhere = wantInvoice ? buildInvoiceWhere({ status, period }) : null

  // Hard limit ambil 200 per source supaya merge + sort tidak terlalu mahal.
  const SOURCE_CAP = 200

  const [sjs, invoices] = await Promise.all([
    sjWhere
      ? DeliveryOrder.findAll({
          where:   sjWhere,
          include: sjBaseInclude,
          order:   [['sj_date', 'DESC'], ['created_at', 'DESC']],
          limit:   SOURCE_CAP,
        })
      : Promise.resolve([]),
    invoiceWhere
      ? Invoice.findAll({
          where:   invoiceWhere,
          include: invoiceBaseInclude,
          order:   [['invoice_date', 'DESC'], ['created_at', 'DESC']],
          limit:   SOURCE_CAP,
        })
      : Promise.resolve([]),
  ])

  const all = [
    ...sjs.map(mapSj),
    ...invoices.map(mapInvoice),
  ]

  // Sort by sortKey DESC (paling baru dulu).
  all.sort((a, b) => b.sortKey - a.sortKey)

  const total = all.length
  const start = (page - 1) * limit
  const data  = all.slice(start, start + limit).map(({ sortKey, ...row }) => row)

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }
}

module.exports = {
  getActivity,
  // exposed for test
  buildSjWhere,
  buildInvoiceWhere,
  periodToRange,
  SJ_STATUS_MAP,
  INVOICE_STATUS_MAP,
}
