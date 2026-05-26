'use strict'

const C_BORDER = '#222222'
const C_HEADER = '#FCE4D6'
const C_GREEN = '#00A651'
const C_BLACK = '#111111'
const C_GRAY = '#666666'

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatQty(value) {
  if (value == null || value === '') return ''
  return Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

function drawCell(doc, x, y, w, h, text = '', options = {}) {
  const {
    fill = null,
    align = 'center',
    bold = false,
    color = C_BLACK,
    fontSize = 7,
    valign = 'middle',
    padding = 3,
    lineBreak = true,
    ellipsis = false,
  } = options

  doc.rect(x, y, w, h)
  if (fill) doc.fillAndStroke(fill, C_BORDER)
  else doc.strokeColor(C_BORDER).lineWidth(0.5).stroke()

  if (text !== null && text !== undefined && text !== '') {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).fillColor(color)
    const textHeight = doc.heightOfString(String(text), { width: w - padding * 2, align })
    const ty = valign === 'top' ? y + padding : y + Math.max((h - textHeight) / 2, padding - 1)
    doc.text(String(text), x + padding, ty, {
      width: w - padding * 2,
      align,
      lineGap: 1,
      lineBreak,
      ellipsis,
    })
  }
}

function buildCategories(data) {
  const categories = []
  for (const row of data.rows || []) {
    const name = row.kategori_name || data.stock_item?.name || 'Stok'
    if (!categories.includes(name)) categories.push(name)
  }
  return categories.length > 0 ? categories : [data.stock_item?.name || 'Stok']
}

function render(doc, data, options = {}) {
  const landscape = doc.page.width > doc.page.height
  const pageW = doc.page.width
  const pageH = doc.page.height
  const margin = 28
  const tableW = pageW - margin * 2
  const title = options.title || `Rekapan Muat ${data.stock_item?.name || 'Stok'}`
  const periodLabel = options.periodLabel || ''
  const categories = buildCategories(data)

  const fixed = {
    no: 36,
    date: 68,
    driver: 78,
    plate: 70,
    destination: 166,
    invoice: 56,
    sj: 48,
  }
  const categoryW = (tableW - fixed.no - fixed.date - fixed.driver - fixed.plate - fixed.destination - fixed.invoice - fixed.sj) / categories.length

  const widths = [
    fixed.no,
    fixed.date,
    fixed.driver,
    fixed.plate,
    ...categories.map(() => categoryW),
    fixed.destination,
    fixed.invoice,
    fixed.sj,
  ]
  const xs = [margin]
  for (let i = 0; i < widths.length - 1; i++) xs.push(xs[i] + widths[i])

  let y = 42
  const titleH = 18
  drawCell(doc, margin, y, tableW, titleH, title, {
    fill: C_HEADER,
    bold: true,
    fontSize: 8,
  })
  if (periodLabel) {
    doc.font('Helvetica').fontSize(6).fillColor(C_GRAY)
      .text(periodLabel, margin + tableW - 220, y + 6, { width: 214, align: 'right' })
  }
  y += titleH

  const headers = ['No', 'Tanggal', 'Sopir', 'No Pol', ...categories.map(c => `Stok ${c}`), 'Alamat Tujuan', 'No Invoice', 'No SJ']
  const headerH = 15
  headers.forEach((h, i) => drawCell(doc, xs[i], y, widths[i], headerH, h, { fontSize: 7 }))
  y += headerH

  const startY = y
  const maxY = pageH - 42
  let disbursementNo = 1

  const drawHeaderOnNewPage = () => {
    doc.addPage({ size: 'A4', layout: landscape ? 'landscape' : 'portrait', margins: { top: 28, bottom: 28, left: 28, right: 28 } })
    y = 36
    drawCell(doc, margin, y, tableW, titleH, title, { fill: C_HEADER, bold: true, fontSize: 8 })
    y += titleH
    headers.forEach((h, i) => drawCell(doc, xs[i], y, widths[i], headerH, h, { fontSize: 7 }))
    y += headerH
  }

  for (const row of data.rows || []) {
    const isReceipt = row.type === 'receipt'
    const h = isReceipt ? 42 : 12
    if (y + h > maxY) drawHeaderOnNewPage()

    if (isReceipt) {
      const catIndex = categories.indexOf(row.kategori_name || data.stock_item?.name || 'Stok')
      const descX = xs[0]
      const descW = widths[0] + widths[1] + widths[2] + widths[3]
      drawCell(doc, descX, y, descW, h, `Tambahan Stok :\n${row.sj_or_spal || row.reference_number || ''}${row.notes ? `\n${row.notes}` : ''}`, {
        fontSize: 7,
      })
      categories.forEach((_cat, idx) => {
        const col = 4 + idx
        drawCell(doc, xs[col], y, widths[col], h, idx === catIndex ? formatQty(row.qty_in) : '', {
          bold: true,
          color: C_GREEN,
          fontSize: 7.5,
        })
      })
      const destinationCol = 4 + categories.length
      drawCell(doc, xs[destinationCol], y, widths[destinationCol], h, '-')
      drawCell(doc, xs[destinationCol + 1], y, widths[destinationCol + 1], h, '-')
      drawCell(doc, xs[destinationCol + 2], y, widths[destinationCol + 2], h, '-')
      y += h
      continue
    }

    const catIndex = categories.indexOf(row.kategori_name || data.stock_item?.name || 'Stok')
    drawCell(doc, xs[0], y, widths[0], h, String(disbursementNo++), { fontSize: 6.7 })
    drawCell(doc, xs[1], y, widths[1], h, formatDate(row.date), { fontSize: 6.7 })
    drawCell(doc, xs[2], y, widths[2], h, row.supplier_or_driver || '', { fontSize: 6.7, lineBreak: false, ellipsis: true })
    drawCell(doc, xs[3], y, widths[3], h, row.vehicle_plate || '', { fontSize: 6.7, lineBreak: false, ellipsis: true })
    categories.forEach((_cat, idx) => {
      const col = 4 + idx
      drawCell(doc, xs[col], y, widths[col], h, idx === catIndex ? `-${formatQty(row.qty_out)}` : '', {
        bold: true,
        fontSize: 6.7,
      })
    })
    const destinationCol = 4 + categories.length
    drawCell(doc, xs[destinationCol], y, widths[destinationCol], h, row.destination || '', { fontSize: 6.7, lineBreak: false, ellipsis: true })
    drawCell(doc, xs[destinationCol + 1], y, widths[destinationCol + 1], h, row.invoice_number || '', { fontSize: 6.7, lineBreak: false, ellipsis: true })
    drawCell(doc, xs[destinationCol + 2], y, widths[destinationCol + 2], h, String(row.sj_or_spal || '').replace(/^SJ\s+/i, ''), { fontSize: 6.7, lineBreak: false, ellipsis: true })
    y += h
  }

  if (!data.rows || data.rows.length === 0) {
    drawCell(doc, margin, y, tableW, 32, 'Tidak ada data pada periode ini.', { color: C_GRAY })
    y += 32
  }

  if (y < startY + 20) y = startY + 20
  if (y + 22 > maxY) drawHeaderOnNewPage()

  const summary = data.totals || {}
  const summaryText = [
    `Total Masuk: ${formatQty(summary.total_in)} ${data.stock_item?.unit || ''}`,
    `Total Keluar: ${formatQty(summary.total_out)} ${data.stock_item?.unit || ''}`,
    `Saldo Akhir: ${formatQty(summary.ending_balance)} ${data.stock_item?.unit || ''}`,
  ].join('    ')
  doc.font('Helvetica-Bold').fontSize(7).fillColor(C_BLACK)
    .text(summaryText, margin, y + 8, { width: tableW, align: 'right' })
}

module.exports = { render }
