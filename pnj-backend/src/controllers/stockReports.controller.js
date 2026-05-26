'use strict'

const asyncHandler = require('../utils/asyncHandler')
const service      = require('../services/stockReport.service')
const { success } = require('../utils/response')
const ExcelJS      = require('exceljs')
const PDFDocument  = require('pdfkit')
const stockRecapTemplate = require('../pdf/stockRecap.template')
const customerStockRecapTemplate = require('../pdf/customerStockRecap.template')

const recap = asyncHandler(async (req, res) => {
  const data = await service.recap(req.query)
  res.json(success(data))
})

const summary = asyncHandler(async (req, res) => {
  const data = await service.summary(req.query)
  res.json(success(data))
})

function formatDateLabel(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toISOString().slice(0, 10)
}

function periodLabel(query) {
  if (query.from || query.to) {
    return `Periode ${formatDateLabel(query.from) || 'awal'} s/d ${formatDateLabel(query.to) || 'akhir'}`
  }
  if (!query.period || query.period === 'all') return 'Semua waktu'
  if (query.period === 'this_month') return 'Bulan ini'
  if (query.period === 'last_month') return 'Bulan lalu'
  return `Periode ${query.period}`
}

function stockRecapTitle(data) {
  const itemName = data.stock_item?.name || 'Stok'
  const customerName = data.customer?.name
  return customerName
    ? `Rekapan Muat ${itemName}, ${customerName}`
    : `Rekapan Muat ${itemName}`
}

const customerSummary = asyncHandler(async (_req, res) => {
  const data = await service.customerSummary()
  res.json(success(data))
})

const customerDetail = asyncHandler(async (req, res) => {
  const data = await service.customerDetail(req.params.uuid)
  res.json(success(data))
})

const customerAvailableItems = asyncHandler(async (req, res) => {
  const data = await service.customerAvailableItems(req.params.uuid)
  res.json(success(data))
})

const exportXlsx = asyncHandler(async (req, res) => {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PNJ Control'
  workbook.created = new Date()

  if (req.query.stock_item_uuid) {
    const data = await service.recap(req.query)
    const sheet = workbook.addWorksheet('Rekap Stok')
    sheet.columns = [
      { header: 'Tanggal', key: 'date', width: 14 },
      { header: 'Tipe', key: 'type', width: 16 },
      { header: 'Referensi', key: 'reference_number', width: 24 },
      { header: 'SJ/SPAL', key: 'sj_or_spal', width: 24 },
      { header: 'Supplier/Sopir', key: 'supplier_or_driver', width: 24 },
      { header: 'Kendaraan', key: 'vehicle_plate', width: 16 },
      { header: 'Tujuan', key: 'destination', width: 28 },
      { header: 'Kategori', key: 'kategori_name', width: 18 },
      { header: 'Masuk', key: 'qty_in', width: 12 },
      { header: 'Keluar', key: 'qty_out', width: 12 },
      { header: 'Saldo', key: 'balance', width: 12 },
      { header: 'Catatan', key: 'notes', width: 30 },
    ]
    data.rows.forEach(row => sheet.addRow(row))
    sheet.addRow({})
    sheet.addRow({ reference_number: 'Total Masuk', qty_in: data.totals.total_in })
    sheet.addRow({ reference_number: 'Total Keluar', qty_out: data.totals.total_out })
    sheet.addRow({ reference_number: 'Saldo Saat Ini', balance: data.totals.current_balance })
  } else {
    const rows = await service.summary(req.query)
    const sheet = workbook.addWorksheet('Ringkasan Stok')
    sheet.columns = [
      { header: 'Kode', key: 'code', width: 18 },
      { header: 'Nama Barang', key: 'name', width: 32 },
      { header: 'Kategori', key: 'category', width: 18 },
      { header: 'Satuan', key: 'unit', width: 12 },
      { header: 'Stok Saat Ini', key: 'current_stock', width: 16 },
      { header: 'Peak Stock', key: 'peak_stock', width: 14 },
      { header: 'Level', key: 'stock_level', width: 12 },
      { header: 'Aktif', key: 'is_active', width: 10 },
    ]
    rows.forEach(row => sheet.addRow(row))
  }

  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).alignment = { vertical: 'middle' }
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="stock-report-${new Date().toISOString().slice(0, 10)}.xlsx"`)
  await workbook.xlsx.write(res)
  res.end()
})

const exportPdf = asyncHandler(async (req, res) => {
  const data = await service.recap(req.query)
  const date = new Date().toISOString().slice(0, 10)
  const itemCode = String(data.stock_item?.code || 'stock').replace(/[^a-zA-Z0-9_-]/g, '_')
  const title = stockRecapTitle(data)

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="stock-recap-${itemCode}-${date}.pdf"`)

  const doc = new PDFDocument({
    size:    'A4',
    layout:  'landscape',
    margins: { top: 28, bottom: 28, left: 28, right: 28 },
    info: {
      Title:    title,
      Subject:  'Rekap Stok',
      Producer: 'pnj-backend',
    },
  })

  doc.pipe(res)
  stockRecapTemplate.render(doc, data, {
    title,
    periodLabel: periodLabel(req.query),
  })
  doc.end()
})

const exportCustomerPdf = asyncHandler(async (req, res) => {
  const data = await service.customerDetail(req.params.uuid)
  const date = new Date().toISOString().slice(0, 10)
  const customerCode = String(data.customerName || 'customer').replace(/[^a-zA-Z0-9_-]/g, '_')
  const title = `Rekap Stok Customer - ${data.customerName}`

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="stock-customer-${customerCode}-${date}.pdf"`)

  const doc = new PDFDocument({
    size:    'A4',
    layout:  'landscape',
    margins: { top: 28, bottom: 28, left: 28, right: 28 },
    info: {
      Title:    title,
      Subject:  'Rekap Stok Customer',
      Producer: 'pnj-backend',
    },
  })

  doc.pipe(res)
  customerStockRecapTemplate.render(doc, data, { title })
  doc.end()
})

module.exports = { recap, summary, customerSummary, customerDetail, customerAvailableItems, exportXlsx, exportPdf, exportCustomerPdf }
