'use strict'

const asyncHandler   = require('../utils/asyncHandler')
const { success }    = require('../utils/response')
const ExcelJS         = require('exceljs')

const agingArSvc      = require('../services/reports/agingAr.service')
const profitLossSvc   = require('../services/reports/profitLoss.service')
const fleetUtilSvc    = require('../services/reports/fleetUtilization.service')
const auditTrailSvc   = require('../services/reports/auditTrail.service')

// ── Aging AR ───────────────────────────────────────────────────────────────
const getAgingAR = asyncHandler(async (req, res) => {
  const data = await agingArSvc.getSummary(req.query)
  res.json(success(data))
})

const getAgingARCustomer = asyncHandler(async (req, res) => {
  const data = await agingArSvc.getCustomerDetail(Number(req.params.id))
  res.json(success(data))
})

const getAgingARProject = asyncHandler(async (req, res) => {
  const data = await agingArSvc.getProjectDetail(Number(req.params.id))
  res.json(success(data))
})

const refreshAgingAR = asyncHandler(async (req, res) => {
  // No-cache strategy — flush ini no-op. Tetap return 200 supaya FE bisa
  // tetap memakai pola "klik refresh".
  res.json(success({ flushed: true, cached_at: null }, 'Cache aging AR di-flush.'))
})

// ── Profit & Loss ──────────────────────────────────────────────────────────
const getProfitLoss = asyncHandler(async (req, res) => {
  const data = await profitLossSvc.getSummary(req.query)
  res.json(success(data))
})

const refreshProfitLoss = asyncHandler(async (req, res) => {
  res.json(success({ flushed: true, cached_at: null }, 'Cache profit-loss di-flush.'))
})

// ── Fleet Utilization ─────────────────────────────────────────────────────
const getFleetUtilization = asyncHandler(async (req, res) => {
  const data = await fleetUtilSvc.getSummary(req.query)
  res.json(success(data))
})

// ── Audit Trail ───────────────────────────────────────────────────────────
const getAuditTrail = asyncHandler(async (req, res) => {
  const data = await auditTrailSvc.getList(req.query)
  res.json(success(data))
})

async function sendWorkbook(res, workbook, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  await workbook.xlsx.write(res)
  res.end()
}

function styleWorkbook(workbook) {
  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true }
    sheet.views = [{ state: 'frozen', ySplit: 1 }]
  }
}

const exportAgingAR = asyncHandler(async (req, res) => {
  const data = await agingArSvc.getSummary(req.query)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PNJ Control'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Aging AR')
  sheet.columns = [
    { header: 'Customer', key: 'customer_name', width: 32 },
    { header: 'Invoice Count', key: 'invoice_count', width: 14 },
    { header: 'Current', key: 'current', width: 16 },
    { header: '1-30', key: '1-30', width: 16 },
    { header: '31-60', key: '31-60', width: 16 },
    { header: '61-90', key: '61-90', width: 16 },
    { header: '>90', key: '>90', width: 16 },
    { header: 'Total Outstanding', key: 'total_outstanding', width: 20 },
    { header: 'Oldest Days', key: 'oldest_invoice_days', width: 14 },
  ]
  data.customers.forEach(c => sheet.addRow({
    customer_name: c.customer_name,
    invoice_count: c.invoice_count,
    current: c.bucket_totals.current,
    '1-30': c.bucket_totals['1-30'],
    '31-60': c.bucket_totals['31-60'],
    '61-90': c.bucket_totals['61-90'],
    '>90': c.bucket_totals['>90'],
    total_outstanding: c.total_outstanding,
    oldest_invoice_days: c.oldest_invoice_days,
  }))
  styleWorkbook(workbook)
  await sendWorkbook(res, workbook, `aging-ar-${new Date().toISOString().slice(0, 10)}.xlsx`)
})

const exportProfitLoss = asyncHandler(async (req, res) => {
  const data = await profitLossSvc.getSummary(req.query)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PNJ Control'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Profit Loss')
  sheet.columns = [
    { header: 'Project Code', key: 'project_code', width: 18 },
    { header: 'Project', key: 'project_name', width: 32 },
    { header: 'Customer', key: 'customer_name', width: 32 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Revenue Paid', key: 'revenue_paid', width: 18 },
    { header: 'Ops Cost', key: 'total_operational_cost', width: 18 },
    { header: 'Gross Profit', key: 'gross_profit', width: 18 },
    { header: 'Margin %', key: 'margin_percent', width: 12 },
    { header: 'Profitability', key: 'profitability', width: 16 },
    { header: 'SJ Count', key: 'sj_count', width: 12 },
    { header: 'Invoice Count', key: 'invoice_count', width: 14 },
  ]
  data.projects.forEach(p => sheet.addRow(p))
  styleWorkbook(workbook)
  await sendWorkbook(res, workbook, `profit-loss-${new Date().toISOString().slice(0, 10)}.xlsx`)
})

const exportFleetUtilization = asyncHandler(async (req, res) => {
  const data = await fleetUtilSvc.getSummary(req.query)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PNJ Control'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Fleet Utilization')
  sheet.columns = [
    { header: 'Plate Number', key: 'plate_number', width: 16 },
    { header: 'Fleet', key: 'fleet_name', width: 28 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Total Trips', key: 'total_trips', width: 12 },
    { header: 'Delivered', key: 'delivered_trips', width: 12 },
    { header: 'Active Days', key: 'active_days', width: 12 },
    { header: 'Total Days', key: 'total_days_in_period', width: 12 },
    { header: 'Utilization %', key: 'utilization_percent', width: 16 },
    { header: 'Ops Cost', key: 'total_operational_cost', width: 18 },
    { header: 'Avg Cost/Trip', key: 'avg_cost_per_trip', width: 18 },
  ]
  data.fleets.forEach(f => sheet.addRow(f))
  styleWorkbook(workbook)
  await sendWorkbook(res, workbook, `fleet-utilization-${new Date().toISOString().slice(0, 10)}.xlsx`)
})

module.exports = {
  getAgingAR,
  getAgingARCustomer,
  getAgingARProject,
  refreshAgingAR,
  exportAgingAR,
  getProfitLoss,
  refreshProfitLoss,
  exportProfitLoss,
  getFleetUtilization,
  exportFleetUtilization,
  getAuditTrail,
}
