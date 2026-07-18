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
const { differenceInCalendarDays, normalizeDateOnly, todayDateOnly } = require('../../utils/dateOnly')

const ALL_BUCKETS = ['current', '1-30', '31-60', '61-90', '>90']

function emptyBucketTotals() {
  return { 'current': 0, '1-30': 0, '31-60': 0, '61-90': 0, '>90': 0 }
}

function getAgingBucket(dueDate, asOf) {
  const due = normalizeDateOnly(toISODate(dueDate))
  const asOfDate = normalizeDateOnly(toISODate(asOf)) || todayDateOnly()
  const diffDays = differenceInCalendarDays(asOfDate, due)
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
        required:   false,
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

function buildInvoiceDetails(invoices, asOf) {
  return invoices.map((inv) => {
    const plain = typeof inv.get === 'function' ? inv.get({ plain: true }) : inv
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
      sent_at:              plain.sent_at ? new Date(plain.sent_at).toISOString() : null,
      notes:                plain.notes || null,
      service_type:         plain.service_type || 'delivery',
      custom_service_name:  plain.custom_service_name || null,
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
        cargo_notes:  it.cargo_notes || null,
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
}

function buildSJDetails(sjs) {
  return sjs.map(sj => {
    const plain = typeof sj.get === 'function' ? sj.get({ plain: true }) : sj
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
  const asOf = filters.as_of || todayDateOnly()
  const asOfISO = asOf

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
      project_id:       inv.project?.id ? Number(inv.project.id) : null,
      project_code:     inv.project?.code || null,
      project_name:     inv.project?.name || 'Proyek Customer',
      contract_number:  inv.project?.contract_number || '',
      sent_at:          inv.sent_at ? new Date(inv.sent_at).toISOString() : null,
    }

    let entry = byCustomer.get(inv.customer.id)
    if (!entry) {
      entry = {
        customer_id:       Number(inv.customer.id),
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

  const metricsByCustomer = new Map()
  for (const inv of await fetchExportInvoices(filters)) {
    const customerId = Number(inv.customer.id)
    let entry = metricsByCustomer.get(customerId)
    if (!entry) {
      entry = {
        customer_id:   customerId,
        customer_name: inv.customer.name,
        npwp:          inv.customer.npwp || null,
        is_pkp:        !!inv.customer.is_pkp,
        ...emptySummaryMetrics(),
      }
      metricsByCustomer.set(customerId, entry)
    }
    addInvoiceMetric(entry, inv, asOf)
  }

  const customersById = new Map(customers.map(c => [Number(c.customer_id), c]))
  const includePaidOnlyCustomers = !filters.bucket || filters.bucket === 'all'
  if (includePaidOnlyCustomers) {
    for (const [customerId, metric] of metricsByCustomer.entries()) {
      if (!customersById.has(customerId)) {
        const entry = {
          customer_id:       customerId,
          customer_name:     metric.customer_name,
          npwp:              metric.npwp,
          is_pkp:            metric.is_pkp,
          invoices:          [],
          bucket_totals:     emptyBucketTotals(),
          total_outstanding: 0,
          oldest_invoice_days: 0,
          invoice_count:     0,
        }
        customersById.set(customerId, entry)
        customers.push(entry)
      }
    }
  }

  for (const customer of customers) {
    const metric = metricsByCustomer.get(Number(customer.customer_id)) || emptySummaryMetrics()
    customer.not_due_amount = metric.not_due_amount || 0
    customer.overdue_amount = metric.overdue_amount || 0
    customer.paid_amount = metric.paid_amount || 0
    customer.fully_paid_amount = metric.fully_paid_amount || 0
    customer.not_due_count = metric.not_due_count || 0
    customer.overdue_count = metric.overdue_count || 0
    customer.fully_paid_count = metric.fully_paid_count || 0
    customer.invoice_count = metric.metric_invoice_count || customer.invoice_count
  }

  // Sort by total_outstanding DESC.
  customers.sort((a, b) => b.total_outstanding - a.total_outstanding)

  // Aggregate.
  const bucketTotals = emptyBucketTotals()
  let totalOutstanding = 0
  let invoiceCount = 0
  const agingTotals = emptySummaryMetrics()
  for (const c of customers) {
    totalOutstanding = round2(totalOutstanding + c.total_outstanding)
    invoiceCount += c.invoice_count
    for (const b of ALL_BUCKETS) {
      bucketTotals[b] = round2(bucketTotals[b] + c.bucket_totals[b])
    }
    agingTotals.not_due_amount    = round2(agingTotals.not_due_amount + (c.not_due_amount || 0))
    agingTotals.overdue_amount    = round2(agingTotals.overdue_amount + (c.overdue_amount || 0))
    agingTotals.paid_amount       = round2(agingTotals.paid_amount + (c.paid_amount || 0))
    agingTotals.fully_paid_amount = round2(agingTotals.fully_paid_amount + (c.fully_paid_amount || 0))
    agingTotals.not_due_count     += c.not_due_count || 0
    agingTotals.overdue_count     += c.overdue_count || 0
    agingTotals.fully_paid_count  += c.fully_paid_count || 0
  }

  return {
    as_of_date:        asOfISO,
    cached_at:         null, // disengaja null — no-cache strategy
    total_outstanding: totalOutstanding,
    customer_count:    customers.length,
    invoice_count:     invoiceCount,
    bucket_totals:     bucketTotals,
    not_due_amount:    agingTotals.not_due_amount,
    overdue_amount:    agingTotals.overdue_amount,
    paid_amount:       agingTotals.paid_amount,
    fully_paid_amount: agingTotals.fully_paid_amount,
    not_due_count:     agingTotals.not_due_count,
    overdue_count:     agingTotals.overdue_count,
    fully_paid_count:  agingTotals.fully_paid_count,
    customers,
  }
}

async function fetchExportInvoices(filters = {}) {
  const where = {
    status: { [Op.in]: ['sent', 'outstanding', 'paid'] },
  }

  if (filters.period_from || filters.period_to) {
    where.invoice_date = {}
    if (filters.period_from) where.invoice_date[Op.gte] = filters.period_from
    if (filters.period_to)   where.invoice_date[Op.lte] = filters.period_to
  }

  if (filters.customer_id && filters.customer_id !== 'all') {
    where.customer_id = Number(filters.customer_id)
  }

  const invoices = await Invoice.findAll({
    where,
    include: [
      {
        model:      Project,
        as:         'project',
        attributes: ['id', 'uuid', 'code', 'name', 'contract_number'],
        required:   false,
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

  let rows = invoices.map(inv => inv.get({ plain: true }))

  if (filters.search) {
    const q = String(filters.search).toLowerCase()
    rows = rows.filter(inv =>
      inv.customer?.name?.toLowerCase().includes(q) ||
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.project?.name || '').toLowerCase().includes(q) ||
      (inv.project?.code || '').toLowerCase().includes(q),
    )
  }

  return rows
}

async function fetchExportSjCounts(filters = {}) {
  const where = {
    status: { [Op.ne]: 'void' },
  }

  if (filters.customer_id && filters.customer_id !== 'all') {
    where.customer_id = Number(filters.customer_id)
  }

  const sjs = await DeliveryOrder.findAll({
    where,
    include: [{
      model:      Customer,
      as:         'customer',
      attributes: ['id', 'name'],
      required:   true,
    }],
    attributes: ['id', 'customer_id', 'sj_number'],
  })

  const counts = new Map()
  for (const sj of sjs.map(row => row.get({ plain: true }))) {
    if (filters.search) {
      const q = String(filters.search).toLowerCase()
      const matches =
        sj.customer?.name?.toLowerCase().includes(q) ||
        sj.sj_number.toLowerCase().includes(q)
      if (!matches) continue
    }

    const customerId = Number(sj.customer_id)
    counts.set(customerId, (counts.get(customerId) || 0) + 1)
  }

  return counts
}

function emptyExportTotals() {
  return {
    not_due_amount:    0,
    overdue_amount:    0,
    paid_amount:       0,
    fully_paid_amount: 0,
    project_amount:    0,
    non_project_amount: 0,
  }
}

function emptySummaryMetrics() {
  return {
    not_due_amount:       0,
    overdue_amount:       0,
    paid_amount:          0,
    fully_paid_amount:    0,
    not_due_count:        0,
    overdue_count:        0,
    fully_paid_count:     0,
    metric_invoice_count: 0,
  }
}

function addInvoiceMetric(entry, inv, asOf) {
  const total = round2(inv.total_amount)
  const paid = round2(inv.paid_amount)
  const remaining = round2(Math.max(0, total - paid))

  if ('invoice_count' in entry) entry.invoice_count += 1
  if ('metric_invoice_count' in entry) entry.metric_invoice_count += 1
  entry.paid_amount = round2(entry.paid_amount + paid)

  if ('project_amount' in entry && inv.project?.id) {
    entry.project_amount = round2(entry.project_amount + total)
  } else if ('non_project_amount' in entry) {
    entry.non_project_amount = round2(entry.non_project_amount + total)
  }

  if (inv.status === 'paid' || remaining <= 0) {
    entry.fully_paid_amount = round2(entry.fully_paid_amount + total)
    if ('fully_paid_count' in entry) entry.fully_paid_count += 1
  }

  if (['sent', 'outstanding'].includes(inv.status) && remaining > 0) {
    const { bucket } = getAgingBucket(inv.due_date, asOf)
    if (bucket === 'current') {
      entry.not_due_amount = round2(entry.not_due_amount + remaining)
      if ('not_due_count' in entry) entry.not_due_count += 1
    } else {
      entry.overdue_amount = round2(entry.overdue_amount + remaining)
      if ('overdue_count' in entry) entry.overdue_count += 1
    }
  }
}

const addExportInvoiceMetric = addInvoiceMetric

async function getExportSummary(filters = {}) {
  const summary = await getSummary(filters)
  const asOf = filters.as_of || todayDateOnly()
  const metricsByCustomer = new Map()
  const sjCountsByCustomer = await fetchExportSjCounts(filters)

  for (const inv of await fetchExportInvoices(filters)) {
    const customerId = Number(inv.customer.id)
    let entry = metricsByCustomer.get(customerId)
    if (!entry) {
      entry = {
        customer_id:       customerId,
        customer_name:     inv.customer.name,
        npwp:              inv.customer.npwp || null,
        invoice_count:     0,
        ...emptyExportTotals(),
      }
      metricsByCustomer.set(customerId, entry)
    }
    addExportInvoiceMetric(entry, inv, asOf)
  }

  const summaryByCustomer = new Map(summary.customers.map(c => [Number(c.customer_id), c]))
  const includePaidOnlyCustomers = !filters.bucket || filters.bucket === 'all'
  const customerIds = new Set(summary.customers.map(c => Number(c.customer_id)))
  if (includePaidOnlyCustomers) {
    for (const id of metricsByCustomer.keys()) customerIds.add(id)
    for (const id of sjCountsByCustomer.keys()) customerIds.add(id)
  }

  const customers = [...customerIds].map(customerId => {
    const aging = summaryByCustomer.get(customerId)
    const metric = metricsByCustomer.get(customerId)
    return {
      customer_id:          customerId,
      customer_name:        aging?.customer_name || metric?.customer_name || '-',
      npwp:                 aging?.npwp ?? metric?.npwp ?? null,
      invoice_count:        metric?.invoice_count ?? aging?.invoice_count ?? 0,
      sj_count:             sjCountsByCustomer.get(customerId) || 0,
      bucket_totals:        aging?.bucket_totals || emptyBucketTotals(),
      total_outstanding:    aging?.total_outstanding || 0,
      oldest_invoice_days:  aging?.oldest_invoice_days || 0,
      not_due_amount:       metric?.not_due_amount || 0,
      overdue_amount:       metric?.overdue_amount || 0,
      paid_amount:          metric?.paid_amount || 0,
      fully_paid_amount:    metric?.fully_paid_amount || 0,
      project_amount:       metric?.project_amount || 0,
      non_project_amount:   metric?.non_project_amount || 0,
    }
  }).sort((a, b) => {
    const totalA = round2(a.total_outstanding + a.paid_amount)
    const totalB = round2(b.total_outstanding + b.paid_amount)
    return totalB - totalA
  })

  const exportTotals = emptyExportTotals()
  for (const c of customers) {
    exportTotals.not_due_amount     = round2(exportTotals.not_due_amount + c.not_due_amount)
    exportTotals.overdue_amount     = round2(exportTotals.overdue_amount + c.overdue_amount)
    exportTotals.paid_amount        = round2(exportTotals.paid_amount + c.paid_amount)
    exportTotals.fully_paid_amount  = round2(exportTotals.fully_paid_amount + c.fully_paid_amount)
    exportTotals.project_amount     = round2(exportTotals.project_amount + c.project_amount)
    exportTotals.non_project_amount = round2(exportTotals.non_project_amount + c.non_project_amount)
  }

  return {
    ...summary,
    customers,
    customer_count: customers.length,
    export_totals: exportTotals,
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
      required:   false,
    }],
    order: [['invoice_date', 'DESC']],
  })

  const activeProjects = await Project.findAll({
    where:      { customer_id: customer.id },
    attributes: ['id'],
  })
  const activeProjectIds = activeProjects.map(p => Number(p.id))

  // Hitung total invoice + paid + outstanding.
  let totalInvoiced    = 0
  let totalPaid        = 0
  let totalOutstanding = 0
  const projectIds = new Set()
  const invoiceCount = invoices.filter(i => i.status !== 'void').length

  const asOf = todayDateOnly()
  for (const inv of invoices) {
    if (inv.status === 'void') continue
    if (inv.project?.id) projectIds.add(inv.project.id)
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

  const nonProjectInvoiceIds = invoices
    .filter(inv => !inv.project?.id)
    .map(inv => inv.id)

  const nonProjectInvoices = nonProjectInvoiceIds.length > 0
    ? await Invoice.findAll({
        where: { id: { [Op.in]: nonProjectInvoiceIds } },
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
    : []

  const nonProjectSjWhere = {
    customer_id: customer.id,
    [Op.or]: [
      { project_id: null },
      ...(activeProjectIds.length > 0
        ? [{ project_id: { [Op.notIn]: activeProjectIds } }]
        : [{ project_id: { [Op.ne]: null } }]),
    ],
  }

  const nonProjectSjs = await DeliveryOrder.findAll({
    where: nonProjectSjWhere,
    include: [
      { model: Fleet,  as: 'fleet',  attributes: ['id', 'uuid', 'name', 'plate_number', 'is_tbd'], required: false },
      { model: Driver, as: 'driver', attributes: ['id', 'uuid', 'name'], required: false },
      { model: Invoice, as: 'invoice', attributes: ['id', 'uuid', 'invoice_number'], required: false },
    ],
    order: [['sj_date', 'DESC']],
  })

  const nonProjectInvoiceCount = nonProjectInvoices.filter(i => i.status !== 'void').length
  const nonProjectSjCount = nonProjectSjs.filter(s => s.status !== 'void').length
  if (nonProjectInvoiceCount > 0 || nonProjectSjCount > 0) {
    projects.push({
      project_id:          null,
      project_code:        'PROYEK-CUSTOMER',
      project_name:        'Proyek Customer',
      contract_number:     '',
      customer_id:         customer.id,
      customer_name:       customer.name,
      npwp:                customer.npwp || null,
      is_pkp:              !!customer.is_pkp,
      start_date:          null,
      end_date:            null,
      status:              'customer_only',
      total_invoiced:      round2(nonProjectInvoices.filter(i => i.status !== 'void').reduce((s, i) => s + Number(i.total_amount), 0)),
      total_paid:          round2(nonProjectInvoices.filter(i => i.status !== 'void').reduce((s, i) => s + Number(i.paid_amount), 0)),
      total_outstanding:   round2(nonProjectInvoices.filter(i => i.status !== 'void').reduce((s, i) => s + Math.max(0, Number(i.total_amount) - Number(i.paid_amount)), 0)),
      total_operational_cost: round2(nonProjectSjs.filter(s => s.status !== 'void').reduce((s, sj) => s + Number(sj.operational_cost), 0)),
      invoice_count:       nonProjectInvoiceCount,
      sj_count:            nonProjectSjCount,
      sj_delivered_count:  nonProjectSjs.filter(s => s.status === 'delivered').length,
      invoices:            buildInvoiceDetails(nonProjectInvoices, asOf),
      surat_jalan:         buildSJDetails(nonProjectSjs),
    })
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

  const asOf = opts.asOf || todayDateOnly()

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
      sent_at:              plain.sent_at ? new Date(plain.sent_at).toISOString() : null,
      notes:                plain.notes || null,
      service_type:         plain.service_type || 'delivery',
      custom_service_name:  plain.custom_service_name || null,
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
        cargo_notes:  it.cargo_notes || null,
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
  getExportSummary,
  getCustomerDetail,
  getProjectDetail,
}
