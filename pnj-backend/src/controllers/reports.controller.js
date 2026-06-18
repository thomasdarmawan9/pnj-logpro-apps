'use strict'

const asyncHandler   = require('../utils/asyncHandler')
const { success }    = require('../utils/response')
const ExcelJS         = require('exceljs')
const PDFDocument     = require('pdfkit')

const agingArSvc      = require('../services/reports/agingAr.service')
const profitLossSvc   = require('../services/reports/profitLoss.service')
const auditTrailSvc   = require('../services/reports/auditTrail.service')
const { formatIDR, formatDateShort } = require('../pdf/utils')

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

function safeFilename(value) {
  return String(value || 'export').replace(/[^a-zA-Z0-9_\-.]/g, '_')
}

function resolveServiceLabel(serviceType, customName) {
  if (serviceType === 'delivery') return 'Pengiriman'
  if (serviceType === 'rental')   return 'Penyewaan'
  if (serviceType === 'other')    return customName || 'Lainnya'
  return customName || serviceType || '-'
}

function buildRincianItem(items, serviceType) {
  if (!items || items.length === 0) return '-'
  if (serviceType === 'rental') {
    return items.map(it => {
      const lines = [it.fleet_label || it.description || '-']
      lines.push(`Unit disewa: ${it.qty} unit`)
      if (it.period_start && it.period_end) {
        const durasiHari = Math.round(
          (new Date(it.period_end) - new Date(it.period_start)) / 86_400_000
        )
        lines.push(`Durasi: ${durasiHari} hari`)
      } else if (it.qty > 0 && it.unit && it.unit.toLowerCase() !== 'unit') {
        lines.push(`Durasi: ${it.qty} ${it.unit.toLowerCase()}`)
      }
      return lines.join('\n')
    }).join('\n\n')
  }
  return items.map(it => {
    const parts = [it.description || '-', `${it.qty} ${it.unit}`]
    if (it.cargo_notes) parts.push(it.cargo_notes)
    return parts.join(' - ')
  }).join('\n')
}

function statusLabel(status) {
  const labels = {
    draft:       'Draft',
    sent:        'Terbit',
    outstanding: 'Outstanding',
    paid:        'Lunas',
    void:        'Void',
    assigned:    'Assigned',
    delivered:   'Terkirim',
    active:      'Aktif',
    completed:   'Selesai',
    cancelled:   'Dibatalkan',
    on_hold:     'Ditunda',
    customer_only: 'Proyek Customer',
  }
  return labels[status] || status || '-'
}

function drawPdfTitle(doc, title, subtitle) {
  doc.font('Helvetica-Bold').fontSize(15).fillColor('#111827').text(title)
  if (subtitle) {
    doc.moveDown(0.2)
    doc.font('Helvetica').fontSize(9).fillColor('#4B5563').text(subtitle)
  }
  doc.moveDown(0.5)
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .strokeColor('#0F8C50').lineWidth(1).stroke()
  doc.fillColor('#111827').moveDown(0.8)
}

function ensurePdfSpace(doc, height) {
  const bottom = doc.page.height - doc.page.margins.bottom
  if (doc.y + height > bottom) doc.addPage()
}

function drawPdfKeyValues(doc, rows, opts = {}) {
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const width = right - left
  const cols = opts.cols || 4
  const colW = width / cols
  let x = left
  let y = doc.y

  rows.forEach((row, index) => {
    if (index > 0 && index % cols === 0) {
      x = left
      y += 42
    }
    doc.roundedRect(x, y, colW - 8, 34, 4).fillAndStroke('#F9FAFB', '#E5E7EB')
    doc.font('Helvetica').fontSize(7).fillColor('#6B7280')
      .text(row.label, x + 8, y + 7, { width: colW - 24 })
    doc.font('Helvetica-Bold').fontSize(9).fillColor(row.color || '#111827')
      .text(row.value, x + 8, y + 19, { width: colW - 24 })
    x += colW
  })

  doc.y = y + 44
  doc.fillColor('#111827')
}

function drawPdfTable(doc, columns, rows, opts = {}) {
  const left = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const topMargin = 18
  const lineGap = 3
  const minHeight = opts.minHeight || 22

  if (opts.title) {
    ensurePdfSpace(doc, 36)
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(opts.title)
    doc.moveDown(0.35)
  }

  const drawHeader = () => {
    ensurePdfSpace(doc, 24)
    let x = left
    const y = doc.y
    doc.rect(left, y, right - left, 20).fill('#0F8C50')
    columns.forEach(col => {
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF')
        .text(col.label, x + 4, y + 6, { width: col.width - 8, align: col.align || 'left' })
      x += col.width
    })
    doc.y = y + 20
  }

  drawHeader()

  const dataRows = rows.length > 0 ? rows : [Object.fromEntries(columns.map(col => [col.key, '-']))]
  dataRows.forEach((row, rowIndex) => {
    const heights = columns.map(col => {
      const value = row[col.key] === undefined || row[col.key] === null || row[col.key] === '' ? '-' : String(row[col.key])
      return doc.heightOfString(value, { width: col.width - 8, lineGap }) + 12
    })
    const rowHeight = Math.max(minHeight, ...heights)
    if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage()
      if (opts.repeatTitle) {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#111827').text(opts.repeatTitle)
        doc.moveDown(0.35)
      }
      drawHeader()
    }
    const y = doc.y
    let x = left
    const bg = row._bg ?? (rowIndex % 2 === 0 ? '#FFFFFF' : '#F9FAFB')
    doc.rect(left, y, right - left, rowHeight).fillAndStroke(bg, '#E5E7EB')
    columns.forEach(col => {
      const value = row[col.key] === undefined || row[col.key] === null || row[col.key] === '' ? '-' : String(row[col.key])
      doc.font('Helvetica').fontSize(7).fillColor('#111827')
        .text(value, x + 4, y + 6, { width: col.width - 8, align: col.align || 'left', lineGap })
      x += col.width
    })
    doc.y = y + rowHeight
  })

  doc.moveDown(opts.after || 0.8)
}

function customerDetailRows(data) {
  const invoiceRows = []
  const sjRows = []
  const projectRows = data.projects.map(project => {
    const projectName = project.project_id ? project.project_name : 'Proyek Customer'

    // Build SJ lookup by sj_number for route resolution
    const sjByNumber = Object.fromEntries(
      (project.surat_jalan || []).map(sj => [sj.sj_number, sj])
    )

    for (const inv of project.invoices) {
      const remaining = Number(inv.remaining_amount || 0)
      const detailNominal = [
        `Total    : ${formatIDR(inv.total_amount)}`,
        `Terbayar : ${inv.paid_amount > 0 ? formatIDR(inv.paid_amount) : '-'}`,
        `Sisa     : ${remaining > 0 ? formatIDR(remaining) : 'Lunas'}`,
      ].join('\n')

      const routes = (inv.attached_sj_numbers || [])
        .map(num => sjByNumber[num])
        .filter(Boolean)
        .map(sj => `${sj.origin} → ${sj.destination}`)
        .filter((v, i, arr) => arr.indexOf(v) === i)

      invoiceRows.push({
        project_name:     projectName,
        invoice_number:   inv.invoice_number,
        invoice_date:     formatDateShort(inv.invoice_date),
        due_date:         formatDateShort(inv.due_date),
        status:           statusLabel(inv.status),
        jasa:             resolveServiceLabel(inv.service_type, inv.custom_service_name),
        rincian_item:     buildRincianItem(inv.items, inv.service_type),
        rute_pengiriman:  routes.length > 0 ? routes.join('\n') : '-',
        detail_nominal:   detailNominal,
        // numeric fields kept for Excel export + _bg logic
        total_amount:     Number(inv.total_amount || 0),
        paid_amount:      Number(inv.paid_amount || 0),
        remaining_amount: remaining,
        attached_sj:      (inv.attached_sj_numbers || []).join(', ') || '-',
      })
    }
    for (const sj of project.surat_jalan) {
      sjRows.push({
        project_name:   projectName,
        sj_number:      sj.sj_number,
        sj_date:        formatDateShort(sj.sj_date),
        route:          `${sj.origin || '-'} -> ${sj.destination || '-'}`,
        status:         statusLabel(sj.status),
        fleet:          [sj.fleet_label, sj.fleet_plate].filter(Boolean).join(' / ') || '-',
        driver_name:    sj.driver_name || '-',
        invoice_number: sj.invoice_number || '-',
      })
    }
    return {
      project_name:      projectName,
      project_code:      project.project_id ? project.project_code : '-',
      contract_number:   project.contract_number || '-',
      status:            statusLabel(project.status),
      invoice_count:     project.invoice_count,
      sj_count:          project.sj_count,
      total_invoiced:    Number(project.total_invoiced || 0),
      total_paid:        Number(project.total_paid || 0),
      total_outstanding: Number(project.total_outstanding || 0),
    }
  })

  return { projectRows, invoiceRows, sjRows }
}

const exportAgingAR = asyncHandler(async (req, res) => {
  const data = await agingArSvc.getExportSummary(req.query)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PNJ Control'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Aging AR')
  sheet.columns = [
    { header: 'Customer', key: 'customer_name', width: 32 },
    { header: 'Invoice Count', key: 'invoice_count', width: 14 },
    { header: 'SJ Count', key: 'sj_count', width: 12 },
    { header: 'Belum Jatuh Tempo', key: 'not_due_amount', width: 20 },
    { header: 'Sudah Jatuh Tempo', key: 'overdue_amount', width: 20 },
    { header: 'Sudah Bayar', key: 'paid_amount', width: 18 },
    { header: 'Sudah Lunas', key: 'fully_paid_amount', width: 18 },
    { header: 'Total Proyek', key: 'project_amount', width: 18 },
    { header: 'Total Non Proyek', key: 'non_project_amount', width: 20 },
    { header: '1-30', key: '1-30', width: 16 },
    { header: '31-60', key: '31-60', width: 16 },
    { header: '61-90', key: '61-90', width: 16 },
    { header: '>90', key: '>90', width: 16 },
    { header: 'Total Outstanding', key: 'total_outstanding', width: 20 },
  ]
  data.customers.forEach(c => sheet.addRow({
    customer_name: c.customer_name,
    invoice_count: c.invoice_count,
    sj_count: c.sj_count,
    not_due_amount: c.not_due_amount,
    overdue_amount: c.overdue_amount,
    paid_amount: c.paid_amount,
    fully_paid_amount: c.fully_paid_amount,
    project_amount: c.project_amount,
    non_project_amount: c.non_project_amount,
    '1-30': c.bucket_totals['1-30'],
    '31-60': c.bucket_totals['31-60'],
    '61-90': c.bucket_totals['61-90'],
    '>90': c.bucket_totals['>90'],
    total_outstanding: c.total_outstanding,
  }))
  const exportedInvoiceCount = data.customers.reduce((sum, c) => sum + Number(c.invoice_count || 0), 0)
  const exportedSjCount = data.customers.reduce((sum, c) => sum + Number(c.sj_count || 0), 0)
  sheet.addRow({
    customer_name: 'TOTAL',
    invoice_count: exportedInvoiceCount,
    sj_count: exportedSjCount,
    not_due_amount: data.export_totals.not_due_amount,
    overdue_amount: data.export_totals.overdue_amount,
    paid_amount: data.export_totals.paid_amount,
    fully_paid_amount: data.export_totals.fully_paid_amount,
    project_amount: data.export_totals.project_amount,
    non_project_amount: data.export_totals.non_project_amount,
    '1-30': data.bucket_totals['1-30'],
    '31-60': data.bucket_totals['31-60'],
    '61-90': data.bucket_totals['61-90'],
    '>90': data.bucket_totals['>90'],
    total_outstanding: data.total_outstanding,
  })
  styleWorkbook(workbook)
  const lastRow = sheet.lastRow
  if (lastRow) {
    lastRow.font = { bold: true }
    lastRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
  }
  const moneyColumns = [
    'not_due_amount',
    'overdue_amount',
    'paid_amount',
    'fully_paid_amount',
    'project_amount',
    'non_project_amount',
    '1-30',
    '31-60',
    '61-90',
    '>90',
    'total_outstanding',
  ]
  moneyColumns.forEach(key => {
    const col = sheet.getColumn(key)
    col.numFmt = '"Rp"#,##0'
  })
  await sendWorkbook(res, workbook, `aging-ar-${new Date().toISOString().slice(0, 10)}.xlsx`)
})

const exportAgingARCustomerExcel = asyncHandler(async (req, res) => {
  const data = await agingArSvc.getCustomerDetail(Number(req.params.id))
  const { projectRows, invoiceRows, sjRows } = customerDetailRows(data)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'PNJ Control'
  workbook.created = new Date()

  const summary = workbook.addWorksheet('Ringkasan')
  summary.columns = [
    { header: 'Customer', key: 'customer_name', width: 32 },
    { header: 'NPWP', key: 'npwp', width: 24 },
    { header: 'PKP', key: 'is_pkp', width: 10 },
    { header: 'Invoice Count', key: 'invoice_count', width: 14 },
    { header: 'SJ Count', key: 'sj_count', width: 12 },
    { header: 'Total Ditagihkan', key: 'total_invoiced', width: 20 },
    { header: 'Total Terbayar', key: 'total_paid', width: 20 },
    { header: 'Sisa Tagihan', key: 'total_outstanding', width: 20 },
  ]
  summary.addRow({
    customer_name: data.customer_name,
    npwp: data.npwp || '-',
    is_pkp: data.is_pkp ? 'Ya' : 'Tidak',
    invoice_count: data.invoice_count,
    sj_count: data.sj_count,
    total_invoiced: data.total_invoiced,
    total_paid: data.total_paid,
    total_outstanding: data.total_outstanding,
  })

  const projects = workbook.addWorksheet('Proyek')
  projects.columns = [
    { header: 'Proyek', key: 'project_name', width: 32 },
    { header: 'Kode', key: 'project_code', width: 18 },
    { header: 'Kontrak', key: 'contract_number', width: 22 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Invoice Count', key: 'invoice_count', width: 14 },
    { header: 'SJ Count', key: 'sj_count', width: 12 },
    { header: 'Total Ditagihkan', key: 'total_invoiced', width: 20 },
    { header: 'Terbayar', key: 'total_paid', width: 18 },
    { header: 'Outstanding', key: 'total_outstanding', width: 18 },
  ]
  projectRows.forEach(row => projects.addRow(row))

  const invoices = workbook.addWorksheet('Invoice')
  invoices.columns = [
    { header: 'Proyek', key: 'project_name', width: 32 },
    { header: 'No. Invoice', key: 'invoice_number', width: 20 },
    { header: 'Tgl Invoice', key: 'invoice_date', width: 14 },
    { header: 'Jatuh Tempo', key: 'due_date', width: 14 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Jasa', key: 'jasa', width: 16 },
    { header: 'Rincian Item', key: 'rincian_item', width: 40 },
    { header: 'Rute Pengiriman', key: 'rute_pengiriman', width: 40 },
    { header: 'Total', key: 'total_amount', width: 18 },
    { header: 'Terbayar', key: 'paid_amount', width: 18 },
    { header: 'Sisa', key: 'remaining_amount', width: 18 },
    { header: 'SJ Terkait', key: 'attached_sj', width: 28 },
  ]
  invoiceRows.forEach(row => invoices.addRow(row))

  const sjs = workbook.addWorksheet('Surat Jalan')
  sjs.columns = [
    { header: 'Proyek', key: 'project_name', width: 32 },
    { header: 'No. SJ', key: 'sj_number', width: 20 },
    { header: 'Tgl SJ', key: 'sj_date', width: 14 },
    { header: 'Rute', key: 'route', width: 44 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Armada', key: 'fleet', width: 24 },
    { header: 'Sopir', key: 'driver_name', width: 22 },
    { header: 'Invoice', key: 'invoice_number', width: 20 },
  ]
  sjRows.forEach(row => sjs.addRow(row))

  styleWorkbook(workbook)
  ;[
    [summary, ['total_invoiced', 'total_paid', 'total_outstanding']],
    [projects, ['total_invoiced', 'total_paid', 'total_outstanding']],
    [invoices, ['total_amount', 'paid_amount', 'remaining_amount']],
  ].forEach(([sheet, keys]) => {
    keys.forEach(key => sheet.getColumn(key).numFmt = '"Rp"#,##0')
  })

  const filename = `aging-ar-customer-${safeFilename(data.customer_name)}-${new Date().toISOString().slice(0, 10)}.xlsx`
  await sendWorkbook(res, workbook, filename)
})

const STATUS_LABELS = {
  draft:       'Draft',
  sent:        'Terbit',
  outstanding: 'Outstanding',
  paid:        'Lunas',
  void:        'Void',
}

const exportAgingARCustomerPdf = asyncHandler(async (req, res) => {
  const data = await agingArSvc.getCustomerDetail(Number(req.params.id))

  // Optional status filter: ?status=outstanding|paid|sent|draft|void
  const statusFilter = req.query.status && req.query.status !== 'all' ? req.query.status : null
  if (statusFilter) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    data.projects.forEach(project => {
      project.invoices = project.invoices.filter(inv => {
        if (statusFilter === 'outstanding') {
          // Tangkap invoice berstatus 'outstanding' ATAU 'sent' yang sudah lewat jatuh tempo
          const isExplicitlyOutstanding = inv.status === 'outstanding'
          const isSentOverdue = inv.status === 'sent'
            && Number(inv.remaining_amount) > 0
            && new Date(inv.due_date) < today
          return isExplicitlyOutstanding || isSentOverdue
        }
        return inv.status === statusFilter
      })

      // Recalculate project-level totals dari invoices yang sudah difilter
      const nonVoid = project.invoices.filter(i => i.status !== 'void')
      project.invoice_count     = nonVoid.length
      project.total_invoiced    = nonVoid.reduce((s, i) => s + Number(i.total_amount    || 0), 0)
      project.total_paid        = nonVoid.reduce((s, i) => s + Number(i.paid_amount     || 0), 0)
      project.total_outstanding = nonVoid.reduce((s, i) => s + Number(i.remaining_amount || 0), 0)
    })

    // Recalculate customer-level totals (untuk summary cards di header PDF)
    data.invoice_count     = data.projects.reduce((s, p) => s + p.invoice_count,     0)
    data.total_invoiced    = data.projects.reduce((s, p) => s + p.total_invoiced,    0)
    data.total_paid        = data.projects.reduce((s, p) => s + p.total_paid,        0)
    data.total_outstanding = data.projects.reduce((s, p) => s + p.total_outstanding, 0)
  }

  const { projectRows, invoiceRows, sjRows } = customerDetailRows(data)
  const date = new Date().toISOString().slice(0, 10)
  const statusSuffix = statusFilter ? `-${statusFilter}` : ''
  const filename = `aging-ar-customer-${safeFilename(data.customer_name)}${statusSuffix}-${date}.pdf`

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

  const doc = new PDFDocument({
    size:    'A4',
    layout:  'landscape',
    margins: { top: 28, bottom: 28, left: 28, right: 28 },
    info: {
      Title:    `Aging AR Customer - ${data.customer_name}`,
      Subject:  'Detail Aging AR Customer',
      Producer: 'pnj-backend',
    },
  })

  const filterLabel = statusFilter
    ? ` | Filter: ${statusFilter === 'outstanding' ? 'Outstanding (termasuk Terbit jatuh tempo)' : (STATUS_LABELS[statusFilter] || statusFilter)}`
    : ''
  doc.pipe(res)
  drawPdfTitle(doc, `Detail Aging AR Customer - ${data.customer_name}`, `Dicetak ${formatDateShort(new Date())}${filterLabel} | NPWP: ${data.npwp || '-'} | PKP: ${data.is_pkp ? 'Ya' : 'Tidak'}`)
  drawPdfKeyValues(doc, [
    { label: 'Total Ditagihkan', value: formatIDR(data.total_invoiced), color: '#1D4ED8' },
    { label: 'Total Terbayar', value: formatIDR(data.total_paid), color: '#15803D' },
    { label: 'Sisa Tagihan', value: data.total_outstanding > 0 ? formatIDR(data.total_outstanding) : 'Lunas', color: data.total_outstanding > 0 ? '#B45309' : '#15803D' },
    { label: 'Invoice / SJ', value: `${data.invoice_count} invoice | ${data.sj_count} SJ`, color: '#111827' },
  ])

  drawPdfTable(doc, [
    { key: 'project_name', label: 'Proyek', width: 150 },
    { key: 'project_code', label: 'Kode', width: 70 },
    { key: 'contract_number', label: 'Kontrak', width: 90 },
    { key: 'status', label: 'Status', width: 64 },
    { key: 'invoice_count', label: 'Inv', width: 36, align: 'right' },
    { key: 'sj_count', label: 'SJ', width: 36, align: 'right' },
    { key: 'total_invoiced_display', label: 'Total', width: 96, align: 'right' },
    { key: 'total_paid_display', label: 'Terbayar', width: 96, align: 'right' },
    { key: 'total_outstanding_display', label: 'Sisa', width: 96, align: 'right' },
  ], projectRows.map(row => ({
    ...row,
    total_invoiced_display: formatIDR(row.total_invoiced),
    total_paid_display: formatIDR(row.total_paid),
    total_outstanding_display: row.total_outstanding > 0 ? formatIDR(row.total_outstanding) : 'Lunas',
  })), { title: 'Ringkasan Proyek / Proyek Customer', repeatTitle: 'Ringkasan Proyek / Proyek Customer' })

  drawPdfTable(doc, [
    { key: 'project_name',    label: 'Proyek',           width: 118 },
    { key: 'invoice_number',  label: 'No. Invoice',      width: 76 },
    { key: 'invoice_date',    label: 'Tgl Inv',          width: 52 },
    { key: 'due_date',        label: 'Jatuh Tempo',      width: 54 },
    { key: 'status',          label: 'Status',           width: 58 },
    { key: 'jasa',            label: 'Jasa',             width: 58 },
    { key: 'rincian_item',    label: 'Rincian Item',     width: 138 },
    { key: 'rute_pengiriman', label: 'Rute Pengiriman',  width: 100 },
    { key: 'detail_nominal',  label: 'Detail Nominal',   width: 111 },
  ], invoiceRows.map(row => ({
    ...row,
    _bg: row.remaining_amount <= 0 ? '#F0FDF4' : undefined,
  })), { title: 'Daftar Invoice', repeatTitle: 'Daftar Invoice' })

  drawPdfTable(doc, [
    { key: 'project_name', label: 'Proyek', width: 140 },
    { key: 'sj_number', label: 'No. SJ', width: 84 },
    { key: 'sj_date', label: 'Tgl SJ', width: 56 },
    { key: 'route', label: 'Rute', width: 200 },
    { key: 'status', label: 'Status', width: 64 },
    { key: 'fleet', label: 'Armada', width: 110 },
    { key: 'driver_name', label: 'Sopir', width: 86 },
  ], sjRows, { title: 'Daftar Surat Jalan', repeatTitle: 'Daftar Surat Jalan' })

  doc.end()
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

module.exports = {
  getAgingAR,
  getAgingARCustomer,
  getAgingARProject,
  refreshAgingAR,
  exportAgingAR,
  exportAgingARCustomerExcel,
  exportAgingARCustomerPdf,
  getProfitLoss,
  refreshProfitLoss,
  exportProfitLoss,
  getAuditTrail,
}
