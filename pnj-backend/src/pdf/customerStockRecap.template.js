'use strict'

const C_BORDER = '#222222'
const C_HEADER = '#FCE4D6'
const C_SUBHEAD = '#F3F4F6'
const C_BLACK = '#111111'
const C_GRAY = '#666666'
const C_GREEN = '#15803D'
const C_RED = '#DC2626'

function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatQty(value) {
  return Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

function drawCell(doc, x, y, w, h, text = '', options = {}) {
  const {
    fill = null,
    align = 'left',
    bold = false,
    color = C_BLACK,
    fontSize = 7,
    padding = 3,
    lineBreak = true,
    ellipsis = false,
  } = options

  doc.rect(x, y, w, h)
  if (fill) doc.fillAndStroke(fill, C_BORDER)
  else doc.strokeColor(C_BORDER).lineWidth(0.5).stroke()

  if (text !== null && text !== undefined && text !== '') {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize).fillColor(color)
    const textHeight = doc.heightOfString(String(text), {
      width: w - padding * 2,
      align,
      lineGap: 1,
    })
    const textY = y + Math.max((h - textHeight) / 2, padding)
    doc.text(String(text), x + padding, textY, {
      width: w - padding * 2,
      align,
      lineGap: 1,
      lineBreak,
      ellipsis,
    })
  }
}

function measureTextHeight(doc, text, w, options = {}) {
  if (text === null || text === undefined || text === '') return 0
  const { bold = false, fontSize = 7, padding = 3, align = 'left' } = options
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize)
  return doc.heightOfString(String(text), {
    width: w - padding * 2,
    align,
    lineGap: 1,
  }) + padding * 2
}

function rowHeight(doc, cells, minHeight) {
  const measured = cells.map(cell => measureTextHeight(doc, cell.text, cell.width, cell.options))
  return Math.max(minHeight, ...measured)
}

function drawTitle(doc, title, subtitle) {
  const pageW = doc.page.width
  const margin = 28
  const tableW = pageW - margin * 2
  drawCell(doc, margin, 34, tableW, 20, title, {
    fill: C_HEADER,
    align: 'center',
    bold: true,
    fontSize: 9,
  })
  if (subtitle) {
    doc.font('Helvetica').fontSize(6).fillColor(C_GRAY)
      .text(subtitle, margin + tableW - 260, 41, { width: 252, align: 'right' })
  }
}

function buildCategorySummaryRows(data) {
  const itemByCode = new Map((data.itemRows || []).map(row => [row.code, row]))
  const map = new Map()

  for (const transaction of data.transactions || []) {
    const category = transaction.category || 'Tanpa Kategori'
    const itemCode = transaction.itemCode || ''
    const key = `${itemCode}::${transaction.itemName || ''}::${category}`
    const baseItem = itemByCode.get(itemCode)

    if (!map.has(key)) {
      map.set(key, {
        code:       itemCode || baseItem?.code || '-',
        name:       transaction.itemName || baseItem?.name || '-',
        category,
        unit:       transaction.unit || baseItem?.unit || '',
        totalIn:    0,
        totalOut:   0,
        balance:    0,
      })
    }

    const row = map.get(key)
    if (transaction.type === 'masuk') row.totalIn += Number(transaction.qty || 0)
    else row.totalOut += Number(transaction.qty || 0)
    row.balance = row.totalIn - row.totalOut
  }

  if (map.size === 0) {
    for (const item of data.itemRows || []) {
      const categories = item.categories && item.categories.length > 0 ? item.categories : ['Tanpa Kategori']
      for (const category of categories) {
        map.set(`${item.code}::${item.name}::${category}`, {
          code:     item.code || '-',
          name:     item.name || '-',
          category,
          unit:     item.unit || '',
          totalIn:  Number(item.totalIn || 0),
          totalOut: Number(item.totalOut || 0),
          balance:  Number(item.balance || 0),
        })
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    const byName = a.name.localeCompare(b.name)
    if (byName !== 0) return byName
    return a.category.localeCompare(b.category)
  })
}

function renderSummary(doc, data, y) {
  const margin = 28
  const pageW = doc.page.width
  const tableW = pageW - margin * 2
  const widths = [90, 240, 120, 95, 95, 95]
  const xs = [margin]
  for (let i = 0; i < widths.length - 1; i++) xs.push(xs[i] + widths[i])
  widths[widths.length - 1] += tableW - widths.reduce((s, w) => s + w, 0)

  const summaryRows = buildCategorySummaryRows(data)

  drawCell(doc, margin, y, tableW, 16, 'Ringkasan Stok per Barang dan Kategori', { fill: C_SUBHEAD, bold: true, align: 'left' })
  y += 16
  ;['Kode', 'Barang', 'Kategori', 'Masuk', 'Keluar', 'Saldo'].forEach((h, i) => {
    drawCell(doc, xs[i], y, widths[i], 15, h, { fill: C_SUBHEAD, bold: true, align: i >= 3 ? 'right' : 'left' })
  })
  y += 15

  for (const row of summaryRows) {
    const cells = [
      { text: row.code || '', width: widths[0], options: { fontSize: 6.7 } },
      { text: row.name || '', width: widths[1], options: { fontSize: 6.7 } },
      { text: row.category || 'Tanpa Kategori', width: widths[2], options: { fontSize: 6.7 } },
      { text: formatQty(row.totalIn), width: widths[3], options: { align: 'right', bold: true, fontSize: 6.7 } },
      { text: formatQty(row.totalOut), width: widths[4], options: { align: 'right', bold: true, fontSize: 6.7 } },
      { text: `${formatQty(row.balance)} ${row.unit || ''}`.trim(), width: widths[5], options: { align: 'right', bold: true, fontSize: 6.7 } },
    ]
    const h = rowHeight(doc, cells, 16)

    if (y + h > doc.page.height - 34) {
      doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 28, bottom: 28, left: 28, right: 28 } })
      drawTitle(doc, `Rekap Stok Customer - ${data.customerName}`, 'lanjutan')
      y = 66
    }
    drawCell(doc, xs[0], y, widths[0], h, row.code || '', { fontSize: 6.7 })
    drawCell(doc, xs[1], y, widths[1], h, row.name || '', { fontSize: 6.7 })
    drawCell(doc, xs[2], y, widths[2], h, row.category || 'Tanpa Kategori', { fontSize: 6.7 })
    drawCell(doc, xs[3], y, widths[3], h, formatQty(row.totalIn), { align: 'right', color: C_GREEN, bold: true, fontSize: 6.7 })
    drawCell(doc, xs[4], y, widths[4], h, formatQty(row.totalOut), { align: 'right', color: C_RED, bold: true, fontSize: 6.7 })
    drawCell(doc, xs[5], y, widths[5], h, `${formatQty(row.balance)} ${row.unit || ''}`.trim(), { align: 'right', bold: true, fontSize: 6.7 })
    y += h
  }

  if (summaryRows.length === 0) {
    drawCell(doc, margin, y, tableW, 22, 'Tidak ada stok customer.', { align: 'center', color: C_GRAY })
    y += 22
  }

  y += 10
  const summary = [
    `Total Masuk: ${formatQty(data.totalIn)}`,
    `Total Keluar: ${formatQty(data.totalOut)}`,
    `Saldo: ${formatQty(data.totalAsset)}`,
  ].join('    ')
  doc.font('Helvetica-Bold').fontSize(7).fillColor(C_BLACK).text(summary, margin, y, { width: tableW, align: 'right' })
  return y + 20
}

function renderTransactions(doc, data, y) {
  const margin = 28
  const pageW = doc.page.width
  const tableW = pageW - margin * 2
  const widths = [50, 36, 56, 96, 58, 50, 92, 62, 58, 46, 48, 36]
  const xs = [margin]
  for (let i = 0; i < widths.length - 1; i++) xs.push(xs[i] + widths[i])
  widths[widths.length - 1] += tableW - widths.reduce((s, w) => s + w, 0)

  if (y + 40 > doc.page.height - 34) {
    doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 28, bottom: 28, left: 28, right: 28 } })
    drawTitle(doc, `Rekap Stok Customer - ${data.customerName}`, 'lanjutan')
    y = 66
  }

  drawCell(doc, margin, y, tableW, 16, 'Detail Transaksi', { fill: C_SUBHEAD, bold: true, align: 'left' })
  y += 16
  ;['Tanggal', 'Tipe', 'Nomor', 'Barang', 'Kategori', 'Qty', 'Alamat Tujuan', 'Partner', 'Sopir', 'No Pol', 'Invoice', 'SJ'].forEach((h, i) => {
    drawCell(doc, xs[i], y, widths[i], 15, h, { fill: C_SUBHEAD, bold: true, align: i === 5 ? 'right' : 'left' })
  })
  y += 15

  for (const row of data.transactions || []) {
    const qty = `${row.type === 'keluar' ? '-' : '+'}${formatQty(row.qty)} ${row.unit || ''}`.trim()
    const typeLabel = row.type === 'keluar' ? 'Keluar' : 'Masuk'
    const destinationLabel = row.destination || '-'
    const partnerLabel = row.partner || '-'
    const driverLabel = row.driverName || (row.type === 'keluar' ? row.partner : null) || '-'
    const vehiclePlateLabel = row.vehiclePlate || '-'
    const cells = [
      { text: formatDate(row.date), width: widths[0], options: { fontSize: 6.5 } },
      { text: typeLabel, width: widths[1], options: { fontSize: 6.5, bold: true } },
      { text: row.number || '', width: widths[2], options: { fontSize: 6.5 } },
      { text: row.itemName || '', width: widths[3], options: { fontSize: 6.5 } },
      { text: row.category || '-', width: widths[4], options: { fontSize: 6.5 } },
      { text: qty, width: widths[5], options: { align: 'right', fontSize: 6.5, bold: true } },
      { text: destinationLabel, width: widths[6], options: { fontSize: 6.5 } },
      { text: partnerLabel, width: widths[7], options: { fontSize: 6.5 } },
      { text: driverLabel, width: widths[8], options: { fontSize: 6.5 } },
      { text: vehiclePlateLabel, width: widths[9], options: { fontSize: 6.5 } },
      { text: row.invoiceNumber || '-', width: widths[10], options: { fontSize: 6.5 } },
      { text: row.sjNumber || '-', width: widths[11], options: { fontSize: 6.5 } },
    ]
    const h = rowHeight(doc, cells, 16)

    if (y + h > doc.page.height - 34) {
      doc.addPage({ size: 'A4', layout: 'landscape', margins: { top: 28, bottom: 28, left: 28, right: 28 } })
      drawTitle(doc, `Rekap Stok Customer - ${data.customerName}`, 'lanjutan')
      y = 66
    }
    drawCell(doc, xs[0], y, widths[0], h, formatDate(row.date), { fontSize: 6.5 })
    drawCell(doc, xs[1], y, widths[1], h, typeLabel, { fontSize: 6.5, color: row.type === 'keluar' ? C_RED : C_GREEN, bold: true })
    drawCell(doc, xs[2], y, widths[2], h, row.number || '', { fontSize: 6.5 })
    drawCell(doc, xs[3], y, widths[3], h, row.itemName || '', { fontSize: 6.5 })
    drawCell(doc, xs[4], y, widths[4], h, row.category || '-', { fontSize: 6.5 })
    drawCell(doc, xs[5], y, widths[5], h, qty, { align: 'right', fontSize: 6.5, bold: true })
    drawCell(doc, xs[6], y, widths[6], h, destinationLabel, { fontSize: 6.5 })
    drawCell(doc, xs[7], y, widths[7], h, partnerLabel, { fontSize: 6.5 })
    drawCell(doc, xs[8], y, widths[8], h, driverLabel, { fontSize: 6.5 })
    drawCell(doc, xs[9], y, widths[9], h, vehiclePlateLabel, { fontSize: 6.5 })
    drawCell(doc, xs[10], y, widths[10], h, row.invoiceNumber || '-', { fontSize: 6.5 })
    drawCell(doc, xs[11], y, widths[11], h, row.sjNumber || '-', { fontSize: 6.5 })
    y += h
  }
}

function render(doc, data, options = {}) {
  const title = options.title || `Rekap Stok Customer - ${data.customerName || ''}`
  const subtitle = options.subtitle || `Dicetak ${formatDate(new Date())}`
  drawTitle(doc, title, subtitle)

  let y = 68
  y = renderSummary(doc, data, y)
  renderTransactions(doc, data, y)
}

module.exports = { render }
