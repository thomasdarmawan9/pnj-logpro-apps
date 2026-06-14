'use strict'

const { Op } = require('sequelize')
const {
  Project,
  Customer,
  Invoice,
  Payment,
  DeliveryOrder,
  Driver,
  Fleet,
} = require('../../models')
const { resolvePeriod, toISODate } = require('../../utils/reportPeriods')

function round2(n) { return Math.round(Number(n) * 100) / 100 }

function classifyProfitability(grossProfit, revenuePaid) {
  if (revenuePaid === 0) return 'no_data'
  if (grossProfit > 0)   return 'profit'
  if (grossProfit < 0)   return 'loss'
  return 'breakeven'
}

function calcMargin(grossProfit, revenuePaid) {
  if (revenuePaid === 0) return null
  return Math.round((grossProfit / revenuePaid) * 1000) / 10  // 1 decimal place
}

function makeProjectEntry(project) {
  return {
    project_id:        Number(project.id),
    project_uuid:      project.uuid,
    project_code:      project.code,
    project_name:      project.name,
    contract_number:   project.contract_number || '',
    customer_id:       Number(project.customer_id),
    customer_name:     project.customer.name,
    start_date:        toISODate(project.start_date),
    end_date:          toISODate(project.end_date),
    status:            project.status,
    revenue_invoiced:  0,
    revenue_paid:      0,
    invoice_count:            0,
    invoice_paid_count:       0,
    invoice_outstanding_count: 0,
    total_operational_cost:   0,
    sj_count:                 0,
    sj_delivered_count:       0,
    _invoices: [],
    _sjs:      [],
  }
}

function makeCustomerOnlyEntry(customer) {
  return {
    project_id:        null,
    project_uuid:      null,
    project_code:      '-',
    project_name:      'Tanpa Proyek',
    contract_number:   '',
    customer_id:       Number(customer.id),
    customer_name:     customer.name,
    start_date:        null,
    end_date:          null,
    status:            'customer_only',
    revenue_invoiced:  0,
    revenue_paid:      0,
    invoice_count:            0,
    invoice_paid_count:       0,
    invoice_outstanding_count: 0,
    total_operational_cost:   0,
    sj_count:                 0,
    sj_delivered_count:       0,
    _invoices: [],
    _sjs:      [],
  }
}

function finalizeEntry(e, includeDetails) {
  const grossProfit = round2(e.revenue_paid - e.total_operational_cost)
  const project = {
    project_id:        e.project_id,
    project_uuid:      e.project_uuid,
    project_name:      e.project_name,
    project_code:      e.project_code,
    contract_number:   e.contract_number,
    customer_id:       e.customer_id,
    customer_name:     e.customer_name,
    start_date:        e.start_date,
    end_date:          e.end_date,
    status:            e.status,
    revenue_invoiced:  e.revenue_invoiced,
    revenue_paid:      e.revenue_paid,
    invoice_count:           e.invoice_count,
    invoice_paid_count:      e.invoice_paid_count,
    invoice_outstanding_count: e.invoice_outstanding_count,
    total_operational_cost:  e.total_operational_cost,
    sj_count:                e.sj_count,
    sj_delivered_count:      e.sj_delivered_count,
    gross_profit:            grossProfit,
    margin_percent:          calcMargin(grossProfit, e.revenue_paid),
    profitability:           classifyProfitability(grossProfit, e.revenue_paid),
  }
  if (includeDetails) {
    project.invoices = e._invoices
    project.sj_list  = e._sjs
  }
  return project
}

/**
 * @param {object} filters
 *   - period_preset, period_from, period_to
 *   - customer_id: number | 'all'
 *   - project_status: 'all' | 'active' | 'completed' | 'on_hold'
 *   - profitability: 'all' | 'profit' | 'loss' | 'breakeven' | 'no_data'
 *   - include_details: boolean
 */
async function getSummary(filters = {}) {
  const period = resolvePeriod(
    filters.period_preset,
    filters.period_from,
    filters.period_to,
  )
  const periodFrom = period.from
  const periodTo   = period.to

  // Filter projects.
  const projectWhere = {}
  if (filters.customer_id && filters.customer_id !== 'all') {
    projectWhere.customer_id = Number(filters.customer_id)
  }
  if (filters.project_status && filters.project_status !== 'all') {
    projectWhere.status = filters.project_status
  }

  const projects = await Project.findAll({
    where: projectWhere,
    include: [{
      model:      Customer,
      as:         'customer',
      attributes: ['id', 'uuid', 'name'],
      required:   true,
    }],
    order: [['code', 'ASC']],
  })

  const projectIds = projects.map(p => Number(p.id))
  const includeCustomerOnly = !filters.project_status || filters.project_status === 'all'
  const customerOnlyWhere = {}
  if (filters.customer_id && filters.customer_id !== 'all') {
    customerOnlyWhere.id = Number(filters.customer_id)
  }
  const customerOnlyCustomers = includeCustomerOnly
    ? await Customer.findAll({
        where: customerOnlyWhere,
        attributes: ['id', 'uuid', 'name'],
        order: [['name', 'ASC']],
      })
    : []
  const customerOnlyIds = customerOnlyCustomers.map(c => Number(c.id))

  // Pre-fetch invoices in period (untuk revenue_invoiced + invoice counts).
  const invoiceWhere = {}
  const invoiceOr = []
  if (projectIds.length > 0) invoiceOr.push({ project_id: { [Op.in]: projectIds } })
  if (customerOnlyIds.length > 0) {
    invoiceOr.push({
      customer_id: { [Op.in]: customerOnlyIds },
      project_id: null,
    })
  }
  if (invoiceOr.length === 0) return emptySummary(periodFrom, periodTo)
  invoiceWhere[Op.or] = invoiceOr
  if (periodFrom || periodTo) {
    invoiceWhere.invoice_date = {}
    if (periodFrom) invoiceWhere.invoice_date[Op.gte] = periodFrom
    if (periodTo)   invoiceWhere.invoice_date[Op.lte] = periodTo
  }
  const invoices = await Invoice.findAll({
    where: invoiceWhere,
    attributes: ['id', 'uuid', 'invoice_number', 'project_id', 'customer_id', 'total_amount', 'paid_amount', 'status'],
  })

  // Payments in period (untuk revenue_paid).
  const paymentWhere = {}
  if (periodFrom || periodTo) {
    paymentWhere.payment_date = {}
    if (periodFrom) paymentWhere.payment_date[Op.gte] = periodFrom
    if (periodTo)   paymentWhere.payment_date[Op.lte] = periodTo
  }
  const paymentInvoiceOr = []
  if (projectIds.length > 0) paymentInvoiceOr.push({ project_id: { [Op.in]: projectIds } })
  if (customerOnlyIds.length > 0) {
    paymentInvoiceOr.push({
      customer_id: { [Op.in]: customerOnlyIds },
      project_id: null,
    })
  }
  const payments = await Payment.findAll({
    where: paymentWhere,
    include: [{
      model:      Invoice,
      as:         'invoice',
      attributes: ['id', 'project_id', 'customer_id', 'status'],
      where:      {
        status: { [Op.ne]: 'void' },
        [Op.or]: paymentInvoiceOr,
      },
      required:   true,
    }],
    attributes: ['id', 'amount', 'invoice_id'],
  })

  // SJs in period (untuk operational_cost).
  const sjWhere = {
    status:     { [Op.ne]: 'void' },
  }
  const sjOr = []
  if (projectIds.length > 0) sjOr.push({ project_id: { [Op.in]: projectIds } })
  if (customerOnlyIds.length > 0) {
    sjOr.push({
      customer_id: { [Op.in]: customerOnlyIds },
      project_id: null,
    })
  }
  sjWhere[Op.or] = sjOr
  if (periodFrom || periodTo) {
    sjWhere.sj_date = {}
    if (periodFrom) sjWhere.sj_date[Op.gte] = periodFrom
    if (periodTo)   sjWhere.sj_date[Op.lte] = periodTo
  }
  const sjs = await DeliveryOrder.findAll({
    where: sjWhere,
    attributes: ['id', 'uuid', 'sj_number', 'project_id', 'customer_id', 'fleet_id', 'driver_id', 'status', 'operational_cost', 'driver_name_manual'],
    include: filters.include_details ? [
      { model: Fleet,  as: 'fleet',  attributes: ['id', 'uuid', 'name', 'plate_number', 'is_tbd'], required: false },
      { model: Driver, as: 'driver', attributes: ['id', 'uuid', 'name'], required: false },
    ] : [],
  })

  // Aggregate per project.
  const byProject = new Map()
  for (const p of projects) {
    byProject.set(Number(p.id), makeProjectEntry(p))
  }

  const byCustomerOnly = new Map()
  for (const c of customerOnlyCustomers) {
    byCustomerOnly.set(Number(c.id), makeCustomerOnlyEntry(c))
  }

  function getEntryForRecord(record) {
    const projectId = record.project_id ? Number(record.project_id) : null
    if (projectId && byProject.has(projectId)) return byProject.get(projectId)
    const customerId = record.customer_id ? Number(record.customer_id) : null
    if (customerId && byCustomerOnly.has(customerId)) return byCustomerOnly.get(customerId)
    return null
  }

  for (const inv of invoices) {
    const e = getEntryForRecord(inv)
    if (!e) continue
    if (inv.status !== 'void') {
      e.revenue_invoiced = round2(e.revenue_invoiced + Number(inv.total_amount))
      e.invoice_count   += 1
      if (inv.status === 'paid') e.invoice_paid_count += 1
      else if (['sent', 'outstanding'].includes(inv.status)) e.invoice_outstanding_count += 1
    }
    if (filters.include_details) {
      e._invoices.push({
        uuid:           inv.uuid,
        invoice_number: inv.invoice_number,
        total_amount:   round2(inv.total_amount),
        status:         inv.status,
      })
    }
  }

  for (const pm of payments) {
    const e = getEntryForRecord(pm.invoice)
    if (!e) continue
    e.revenue_paid = round2(e.revenue_paid + Number(pm.amount))
  }

  for (const sj of sjs) {
    const e = getEntryForRecord(sj)
    if (!e) continue
    e.sj_count += 1
    if (sj.status === 'delivered') e.sj_delivered_count += 1
    e.total_operational_cost = round2(e.total_operational_cost + Number(sj.operational_cost || 0))

    if (filters.include_details) {
      const fleetIsTbd = !sj.fleet || sj.fleet.is_tbd
      e._sjs.push({
        uuid:             sj.uuid,
        sj_number:        sj.sj_number,
        driver_name:      sj.driver?.name || sj.driver_name_manual || '-',
        fleet_label:      fleetIsTbd
          ? 'TBD'
          : `${sj.fleet?.name || ''}${sj.fleet?.plate_number ? ` (${sj.fleet.plate_number})` : ''}`.trim(),
        status:           sj.status,
        operational_cost: round2(sj.operational_cost),
      })
    }
  }

  // Build final projects array with computed fields.
  let projectsArr = [...byProject.values(), ...byCustomerOnly.values()]
    .filter(e => e.invoice_count > 0 || e.sj_count > 0 || e.revenue_paid > 0)
    .map(e => finalizeEntry(e, filters.include_details))

  // Apply profitability filter.
  if (filters.profitability && filters.profitability !== 'all') {
    projectsArr = projectsArr.filter(p => p.profitability === filters.profitability)
  }

  // Sort by gross_profit DESC.
  projectsArr.sort((a, b) => b.gross_profit - a.gross_profit)

  // Final summary.
  const totalRevenuePaid = round2(projectsArr.reduce((s, p) => s + p.revenue_paid, 0))
  const totalOpsCost     = round2(projectsArr.reduce((s, p) => s + p.total_operational_cost, 0))
  const totalGrossProfit = round2(totalRevenuePaid - totalOpsCost)
  const profitableCount  = projectsArr.filter(p => p.profitability === 'profit').length
  const lossCount        = projectsArr.filter(p => p.profitability === 'loss').length

  const margins = projectsArr
    .filter(p => p.margin_percent !== null)
    .map(p => p.margin_percent)
  const avgMargin = margins.length > 0
    ? Math.round((margins.reduce((s, m) => s + m, 0) / margins.length) * 10) / 10
    : null

  return {
    period_from:           toISODate(periodFrom),
    period_to:             toISODate(periodTo),
    cached_at:             null,
    total_revenue_paid:    totalRevenuePaid,
    total_operational_cost: totalOpsCost,
    total_gross_profit:    totalGrossProfit,
    average_margin:        avgMargin,
    project_count:         projectsArr.length,
    profitable_count:      profitableCount,
    loss_count:            lossCount,
    projects:              projectsArr,
  }
}

function emptySummary(periodFrom, periodTo) {
  return {
    period_from:            toISODate(periodFrom),
    period_to:              toISODate(periodTo),
    cached_at:              null,
    total_revenue_paid:     0,
    total_operational_cost: 0,
    total_gross_profit:     0,
    average_margin:         null,
    project_count:          0,
    profitable_count:       0,
    loss_count:             0,
    projects:               [],
  }
}

module.exports = {
  getSummary,
  classifyProfitability,
  calcMargin,
}
