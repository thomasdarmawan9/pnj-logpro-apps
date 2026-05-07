'use strict'

const asyncHandler = require('../utils/asyncHandler')
const service      = require('../services/stockReport.service')
const { success } = require('../utils/response')
const ExcelJS      = require('exceljs')

const recap = asyncHandler(async (req, res) => {
  const data = await service.recap(req.query)
  res.json(success(data))
})

const summary = asyncHandler(async (req, res) => {
  const data = await service.summary(req.query)
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

module.exports = { recap, summary, exportXlsx }
