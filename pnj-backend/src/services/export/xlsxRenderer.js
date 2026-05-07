'use strict'

/**
 * Shared util untuk render Excel workbook via exceljs.
 *
 * Pattern: builder pakai opsi { columns, rows, headerRows, summary } —
 * controller tinggal panggil renderToStream(workbook, res).
 */

const ExcelJS = require('exceljs')

const BRAND_GREEN = 'FF0F8C50'
const HEADER_TXT  = 'FFFFFFFF'

/**
 * Buat workbook baru dengan metadata standar.
 */
function newWorkbook({ title = 'Export', creator = 'pnj-backend' } = {}) {
  const wb = new ExcelJS.Workbook()
  wb.creator       = creator
  wb.lastModifiedBy = creator
  wb.created       = new Date()
  wb.modified      = new Date()
  wb.title         = title
  return wb
}

/**
 * Add sheet + header rows (info perusahaan / period range / dst) sebelum tabel data.
 *
 * @param {Workbook} wb
 * @param {string}   sheetName
 * @param {object}   opts
 *   - title:        'EXPORT — XYZ' (heading besar)
 *   - subtitle:     '<sub heading>'
 *   - meta:         array of [label, value] rows (tanggal, periode, filter aktif)
 *   - columns:      array of { header, key, width, format?, align? }
 *   - rows:         array of object/array
 *   - summary:      array of [label, value] rows setelah data
 *   - autoFilter:   boolean (default true)
 */
function addSheet(wb, sheetName, opts = {}) {
  const sheet = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: opts.headerRowIndex || 0 }],
  })

  let cursor = 1

  // Title
  if (opts.title) {
    sheet.mergeCells(cursor, 1, cursor, opts.columns.length)
    const cell = sheet.getCell(cursor, 1)
    cell.value = opts.title
    cell.font  = { bold: true, size: 14, color: { argb: 'FF111111' } }
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    sheet.getRow(cursor).height = 22
    cursor++
  }

  if (opts.subtitle) {
    sheet.mergeCells(cursor, 1, cursor, opts.columns.length)
    const cell = sheet.getCell(cursor, 1)
    cell.value = opts.subtitle
    cell.font  = { italic: true, size: 10, color: { argb: 'FF555555' } }
    cursor++
  }

  // Meta rows
  if (Array.isArray(opts.meta) && opts.meta.length > 0) {
    for (const [label, value] of opts.meta) {
      sheet.getCell(cursor, 1).value = label
      sheet.getCell(cursor, 1).font  = { bold: true, color: { argb: 'FF555555' } }
      sheet.getCell(cursor, 2).value = value
      cursor++
    }
    cursor++  // blank line
  }

  // Header row
  const headerRowIdx = cursor
  const headerRow = sheet.getRow(headerRowIdx)
  opts.columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1)
    cell.value = col.header
    cell.font  = { bold: true, color: { argb: HEADER_TXT } }
    cell.fill  = {
      type:    'pattern',
      pattern: 'solid',
      fgColor: { argb: BRAND_GREEN },
    }
    cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' }
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    }
    if (col.width) {
      sheet.getColumn(idx + 1).width = col.width
    }
  })
  headerRow.height = 20
  cursor++

  // Data rows
  const dataStartIdx = cursor
  const rows = opts.rows || []
  for (const r of rows) {
    const row = sheet.getRow(cursor)
    opts.columns.forEach((col, idx) => {
      const cell = row.getCell(idx + 1)
      const value = Array.isArray(r) ? r[idx] : r[col.key]
      cell.value = value === undefined || value === null ? '' : value
      cell.alignment = { vertical: 'middle', horizontal: col.align || 'left' }
      if (col.format) cell.numFmt = col.format
    })
    cursor++
  }

  // Auto filter di header.
  if (opts.autoFilter !== false && rows.length > 0) {
    sheet.autoFilter = {
      from: { row: headerRowIdx, column: 1 },
      to:   { row: cursor - 1,   column: opts.columns.length },
    }
  }

  // Summary rows
  if (Array.isArray(opts.summary) && opts.summary.length > 0) {
    cursor++ // blank line
    for (const [label, value, opt] of opts.summary) {
      const labelCell = sheet.getCell(cursor, opts.columns.length - 1)
      labelCell.value = label
      labelCell.font  = { bold: true }
      labelCell.alignment = { horizontal: 'right' }
      const valueCell = sheet.getCell(cursor, opts.columns.length)
      valueCell.value = value
      valueCell.font  = { bold: true }
      if (opt?.format) valueCell.numFmt = opt.format
      cursor++
    }
  }

  return { sheet, dataStartRow: dataStartIdx, dataEndRow: cursor - 1 }
}

/**
 * Stream workbook ke HTTP response sebagai download xlsx.
 *
 * Set proper Content-Type + Content-Disposition.
 */
async function streamWorkbook(wb, res, filename = 'export.xlsx') {
  const safeName = String(filename).replace(/[^a-zA-Z0-9_\-.]/g, '_')
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`)
  await wb.xlsx.write(res)
  res.end()
}

// ── Format presets ─────────────────────────────────────────────────────────
const FMT = {
  IDR:        '"Rp"#,##0',
  IDR_2:      '"Rp"#,##0.00',
  NUMBER_2:   '#,##0.00',
  NUMBER_INT: '#,##0',
  PERCENT_1:  '0.0"%"',
  DATE_ID:    'dd-mmm-yyyy',
  DATETIME:   'dd-mmm-yyyy hh:mm',
}

module.exports = {
  newWorkbook,
  addSheet,
  streamWorkbook,
  FMT,
  BRAND_GREEN,
}
