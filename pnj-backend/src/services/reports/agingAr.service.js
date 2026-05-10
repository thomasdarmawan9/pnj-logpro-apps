'use strict'

const { Op } = require('sequelize')
const {
  Invoice,
  InvoiceItem,
  Payment,
  Project,
  Customer,
  DeliveryOrder,
  Fleet,
  Driver,
  User,
} = require('../../models')
const { NotFoundError } = require('../../utils/AppError')
const { toISODate } = require('../../utils/reportPeriods')

const ALL_BUCKETS = ['current', '1-30', '31-60', '61-90', '>90']

function emptyBucketTotals() {
  return { 'current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '>90': 0 }
}

function getAgingBucket(dueDate, asOf) {
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate)
  const now = asOf   instanceof Date ? asOf   : new Date(asOf)
  // Pakai UTC components supaya konsisten lintas timezone server.
  const dueUTC = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate())
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const diffDays = Math.floor((nowUTC - dueUTC) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0)  return { bucket: 'current',  daysOverdue: 0 }
  if (diffDays <= 30) return { bucket: '1-30',     daysOverdue: diffDays }
  if (diffDays <= 60) return { bucket: '31-60',    daysOverdue: diffDays }
  if (diffDays <= 90) return { bucket: '61-90',    daysOverdue: diffDays }
  return { bucket: '>90', daysOverdue: diffDays }
}

function round2(n) { return Math.round(Number(n) * 100) / 100 }

/**
 * Ambil semua outstanding invoices (status sent/outstanding, remaining > 0).
 * Optional period filter dari invoice_date.
 */
async function fetchOutstandingInvoices({ asOfDate, periodFrom, periodTo }) {
  const where = {
    status: { [Op.in]: ['sent', 'outstanding'] },
  }

  if (periodFrom || periodTo) {
    where.invoice_date = {}
    if (periodFrom) where.invoice_date[Op.gte] = periodFrom
    if (periodTo)   where.invoice_date[Op.lte] = periodTo
  }

  const invoices = await Invoice.findAll({
    where,
    include: [
      {
        model:      Project,
        as:         'project',
        attributes: ['id', 'uuid', 'code', 'name', 'contract_number'],
        required:   true,
      },
      {
        model:      Customer,
        as:         'customer',
        attributes: ['id', 'uuid', 'name', 'npwp', 'is_pkp'],
        required:   true,
      },
    ],
    order: [['invoice_date', 'DESC']],
  })

  // Filter remaining > 0 di JS karena Sequelize sulit untuk computed expression
  // pada DECIMAL.
  return invoices
    .map((inv) => inv.get({ plain: true }))
    .filter((inv) => round2(inv.total_amount) - round2(inv.paid_amount) > 0)
}

// ── PUBLIC: getSummary ────────────────────────────────────────────────────
/**
 * @param {object} filters
 *   - customer_id: number | 'all'
 *   - bucket: AgingBucket | 'all'
 *   - period_from / period_to: ISO date
 *   - search: string
 *   - as_of: ISO date (default = today)
 */
async function getSummary(filters = {}) {
  const asOf = filters.as_of ? new Date(filters.as_of) : new Date()
  const asOfISO = toISODate(asOf)

  const invoices = await fetchOutstandingInvoices({
    asOfDate:   asOf,
    periodFrom: filters.period_from || null,
    periodTo:   filters.period_to   || null,
  })

  // Group by customer
  const byCustomer = new Map()
  for (const inv of invoices) {
    const remaining = round2(round2(inv.total_amount) - round2(inv.paid_amount))
    const { bucket, daysOverdue } = getAgingBucket(inv.due_date, asOf)

    const aging = {
      uuid:             inv.uuid,
      invoice_number:   inv.invoice_number,
      invoice_date:     toISODate(inv.invoice_date),
      due_date:         toISODate(inv.due_date),
      total_amount:     round2(inv.total_amount),
      paid_amount:      round2(inv.paid_amount),
      remaining_amount: remaining,
      days_overdue:     daysOverdue,
      aging_bucket:     bucket,
      project_id:       inv.project.id,
      project_code:     inv.project.code,
      project_name:     inv.project.name,
      contract_number:  inv.project.contract_number || '',
      sent_at:          inv.sent_at ? new Date(inv.sent_at).toISOString() : null,
    }

    let entry = byCustomer.get(inv.customer.id)
    if (!entry) {
      entry = {
        customer_id:       inv.customer.id,
        customer_name:     inv.customer.name,
        npwp:              inv.customer.npwp || null,
        is_pkp:            !!inv.customer.is_pkp,
        invoices:          [],
        bucket_totals:     emptyBucketTotals(),
        total_outstanding: 0,
        oldest_invoice_days: 0,
        invoice_count:     0,
      }
      byCustomer.set(inv.customer.id, entry)
    }
    entry.invoices.push(aging)
    entry.bucket_totals[bucket]    = round2(entry.bucket_totals[bucket] + remaining)
    entry.total_outstanding        = round2(entry.total_outstanding + remaining)
    entry.invoice_count           += 1
    if (daysOverdue > entry.oldest_invoice_days) {
      entry.oldest_invoice_days = daysOverdue
    }
  }

  let customers = [...byCustomer.values()]

  // Apply filter customer.
  if (filters.customer_id && filters.customer_id !== 'all') {
    customers = customers.filter(c => c.customer_id === Number(filters.customer_id))
  }

  // Apply filter bucket.
  if (filters.bucket && filters.bucket !== 'all') {
    customers = customers.filter(c => c.bucket_totals[filters.bucket] > 0)
  }

  // Apply search.
  if (filters.search) {
    const q = String(filters.search).toLowerCase()
    customers = customers.filter(c =>
      c.customer_name.toLowerCase().includes(q) ||
      c.invoices.some(i =>
        i.invoice_number.toLowerCase().includes(q) ||
        i.project_name.toLowerCase().includes(q),
      ),
    )
  }

  // Sort by total_outstanding DESC.
  customers.sort((a, b) => b.total_outstanding - a.total_outstanding)

  // Aggregate.
  const bucketTotals = emptyBucketTotals()
  let totalOutstanding = 0
  let invoiceCount = 0
  for (const c of customers) {
    totalOutstanding = round2(totalOutstanding + c.total_outstanding)
    invoiceCount += c.invoice_count
    for (const b of ALL_BUCKETS) {
      bucketTotals[b] = round2(bucketTotals[b] + c.bucket_totals[b])
    }
  }

  return {
    as_of_date:        asOfISO,
    cached_at:         null, // disengaja null — no-cache strategy
    total_outstanding: totalOutstanding,
    customer_count:    customers.length,
    invoice_count:     invoiceCount,
    bucket_totals:     bucketTotals,
    customers,
  }
}

// ── PUBLIC: customer detail ───────────────────────────────────────────────
/**
 * Aging AR breakdown untuk satu customer (semua invoice + project breakdown).
 */
async function getCustomerDetail(customerId) {
  const customer = await Customer.findByPk(customerId)
  if (!customer) throw new NotFoundError('Customer tidak ditemukan.')

  // Ambil semua invoice customer (semua status, untuk hitung total_invoiced).
  const invoices = await Invoice.findAll({
    where: { customer_id: customer.id },
    include: [{
      model:      Project,
      as:         'project',
      attributes: ['id', 'uuid', 'code', 'name', 'contract_number', 'start_date', 'end_date', 'status'],
      required:   true,
    }],
    order: [['invoice_date', 'DESC']],
  })

  // Hitung total invoice + paid + outstanding.
  let totalInvoiced    = 0
  let totalPaid        = 0
  let totalOutstanding = 0
  const projectIds = new Set()
  const invoiceCount = invoices.filter(i => i.status !== 'void').length

  const asOf = new Date()
  for (const inv of invoices) {
    if (inv.status === 'void') continue
    projectIds.add(inv.project.id)
    totalInvoiced    = round2(totalInvoiced    + Number(inv.total_amount))
    totalPaid        = round2(totalPaid        + Number(inv.paid_amount))
    totalOutstanding = round2(totalOutstanding + Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount)))
  }

  // SJ count (delivered + non-void).
  const sjRows = await DeliveryOrder.findAll({
    where: {
      customer_id: customer.id,
      status:      { [Op.ne]: 'void' },
    },
    attributes: ['id', 'project_id'],
  })
  const sjCount = sjRows.length

  // Untuk setiap project_id, build summary by reusing getProjectDetail logic-lite.
  const projects = []
  for (const projectId of projectIds) {
    const detail = await getProjectDetail(projectId, { asOf })
    projects.push(detail)
  }

  // Sort projects by total_outstanding DESC.
  projects.sort((a, b) => b.total_outstanding - a.total_outstanding)

  return {
    customer_id:       customer.id,
    customer_name:     customer.name,
    npwp:              customer.npwp || null,
    is_pkp:            !!customer.is_pkp,
    project_count:     projectIds.size,
    invoice_count:     invoiceCount,
    sj_count:          sjCount,
    total_invoiced:    totalInvoiced,
    total_paid:        totalPaid,
    total_outstanding: totalOutstanding,
    projects,
  }
}

// ── PUBLIC: project detail ────────────────────────────────────────────────
/**
 * Detail project untuk Aging AR drilldown — invoices (incl items + payments)
 * + delivery orders.
 */
async function getProjectDetail(projectId, opts = {}) {
  const project = await Project.findByPk(projectId, {
    include: [{
      model:      Customer,
      as:         'customer',
      attributes: ['id', 'uuid', 'name', 'npwp', 'is_pkp'],
      required:   true,
    }],
  })
  if (!project) throw new NotFoundError('Project tidak ditemukan.')

  const asOf = opts.asOf ? new Date(opts.asOf) : new Date()

  // Invoices + items + payments (incl creator) + attached SJs.
  const invoices = await Invoice.findAll({
    where: { project_id: project.id },
    include: [
      { model: InvoiceItem, as: 'items',   separate: false },
      {
        model:    Payment,
        as:       'payments',
        required: false,
        include:  [{
          model:      User,
          as:         'creator',
          attributes: ['id', 'uuid', 'name'],
          required:   false,
        }],
      },
      {
        model: DeliveryOrder, as: 'attachedSJs',
        attributes: ['id', 'uuid', 'sj_number'],
        required:   false,
      },
    ],
    order: [
      ['invoice_date', 'DESC'],
      [{ model: InvoiceItem, as: 'items' }, 'sort_order', 'ASC'],
      [{ model: InvoiceItem, as: 'items' }, 'id', 'ASC'],
      [{ model: Payment, as: 'payments' }, 'payment_date', 'ASC'],
      [{ model: Payment, as: 'payments' }, 'id', 'ASC'],
    ],
  })

  // SJs project ini.
  const sjs = await DeliveryOrder.findAll({
    where: { project_id: project.id },
    include: [
      { model: Fleet,  as: 'fleet',  attributes: ['id', 'uuid', 'name', 'plate_number', 'is_tbd'], required: false },
      { model: Driver, as: 'driver', attributes: ['id', 'uuid', 'name'], required: false },
      { model: Invoice, as: 'invoice', attributes: ['id', 'uuid', 'invoice_number'], required: false },
    ],
    order: [['sj_date', 'DESC']],
  })

  // Build invoice details.
  const invoiceDetails = invoices.map((inv) => {
    const plain = inv.get({ plain: true })
    const allPayments = plain.payments || []
    const dp = allPayments.find(p => p.is_down_payment === true) || null
    const regularPayments = allPayments.filter(p => p.is_down_payment !== true)
    const remaining = round2(Math.max(0, round2(plain.total_amount) - round2(plain.paid_amount)))
    let aging_bucket = null
    let days_overdue = 0
    if (['sent', 'outstanding'].includes(plain.status) && remaining > 0) {
      const a = getAgingBucket(plain.due_date, asOf)
      aging_bucket = a.bucket
      days_overdue = a.daysOverdue
    }
    return {
      uuid:             plain.uuid,
      invoice_number:   plain.invoice_number,
      invoice_date:     toISODate(plain.invoice_date),
      due_date:         toISODate(plain.due_date),
      status:           plain.status,
      subtotal_amount:  round2(plain.subtotal_amount),
      tax_percent:      Number(plain.tax_percent || 0),
      tax_amount:       round2(plain.tax_amount),
      total_amount:     round2(plain.total_amount),
      paid_amount:      round2(plain.paid_amount),
      down_payment_amount: dp ? round2(dp.amount) : 0,
      has_down_payment: !!dp,
      remaining_amount: remaining,
      days_overdue,
      aging_bucket,
      sent_at:          plain.sent_at ? new Date(plain.sent_at).toISOString() : null,
      notes:            plain.notes || null,
      items: (plain.items || []).map(it => ({
        uuid:         it.uuid,
        fleet_label:  it.fleet_label,
        description:  it.description || null,
        period_start: toISODate(it.period_start),
        period_end:   toISODate(it.period_end),
        qty:          Number(it.qty || 0),
        unit:         it.unit || 'Unit',
        unit_price:   round2(it.unit_price),
        subtotal:     round2(it.subtotal),
      })),
      payments: regularPayments.map(p => ({
        uuid:            p.uuid,
        payment_date:    toISODate(p.payment_date),
        amount:          round2(p.amount),
        method:          p.method,
        notes:           p.notes || null,
        is_down_payment: false,
        created_by_name: p.creator?.name || '-',
        created_at:      p.created_at ? new Date(p.created_at).toISOString() : null,
      })),
      attached_sj_numbers: (plain.attachedSJs || []).map(s => s.sj_number),
    }
  })

  // SJ details.
  const sjDetails = sjs.map(sj => {
    const plain = sj.get({ plain: true })
    const fleetIsTbd = !plain.fleet || plain.fleet.is_tbd
    return {
      uuid:               plain.uuid,
      sj_number:          plain.sj_number,
      sj_date:            toISODate(plain.sj_date),
      origin:             plain.origin,
      destination:        plain.destination,
      cargo_description:  plain.cargo_description || null,
      operational_cost:   round2(plain.operational_cost),
      status:             plain.status,
      fleet_label:        fleetIsTbd ? 'TBD' : (plain.fleet?.name || ''),
      fleet_plate:        fleetIsTbd ? '' : (plain.fleet?.plate_number || ''),
      driver_name:        plain.driver?.name || plain.driver_name_manual || null,
      delivered_at:       plain.delivered_at ? new Date(plain.delivered_at).toISOString() : null,
      pod_photo_path:     plain.pod_photo_path || null,
      internal_notes:     plain.internal_notes || null,
      void_reason:        plain.void_reason || null,
      invoice_number:     plain.invoice?.invoice_number || null,
    }
  })

  // Aggregate
  const totalInvoiced    = round2(invoices.filter(i => i.status !== 'void').reduce((s, i) => s + Number(i.total_amount), 0))
  const totalPaid        = round2(invoices.filter(i => i.status !== 'void').reduce((s, i) => s + Number(i.paid_amount),  0))
  const totalOutstanding = round2(invoices.filter(i => i.status !== 'void').reduce((s, i) => s + Math.max(0, Number(i.total_amount) - Number(i.paid_amount)), 0))
  const totalOpsCost     = round2(sjs.filter(s => s.status !== 'void').reduce((s, sj) => s + Number(sj.operational_cost), 0))
  const invoiceCount     = invoices.filter(i => i.status !== 'void').length
  const sjCount          = sjs.filter(s => s.status !== 'void').length
  const sjDeliveredCount = sjs.filter(s => s.status === 'delivered').length

  return {
    project_id:          project.id,
    project_code:        project.code,
    project_name:        project.name,
    contract_number:     project.contract_number || '',
    customer_id:         project.customer.id,
    customer_name:       project.customer.name,
    npwp:                project.customer.npwp || null,
    is_pkp:              !!project.customer.is_pkp,
    start_date:          toISODate(project.start_date),
    end_date:            toISODate(project.end_date),
    status:              project.status,
    total_invoiced:      totalInvoiced,
    total_paid:          totalPaid,
    total_outstanding:   totalOutstanding,
    total_operational_cost: totalOpsCost,
    invoice_count:       invoiceCount,
    sj_count:            sjCount,
    sj_delivered_count:  sjDeliveredCount,
    invoices:            invoiceDetails,
    surat_jalan:         sjDetails,
  }
}

module.exports = {
  ALL_BUCKETS,
  getAgingBucket,
  getSummary,
  getCustomerDetail,
  getProjectDetail,
}
