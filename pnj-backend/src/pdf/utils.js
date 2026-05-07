'use strict'

/**
 * Helper format Rp + tanggal Indonesia untuk PDF templates.
 */

function formatIDR(n) {
  const num = Number(n || 0)
  return 'Rp ' + num.toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function formatDateID(input) {
  if (!input) return '-'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return String(input)
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`
}

function formatDateShort(input) {
  if (!input) return '-'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return String(input)
  const yy = String(d.getFullYear()).slice(-2)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${yy}`
}

/**
 * Helper draw header company section di doc PDFKit.
 * Return Y position setelah header.
 */
function drawCompanyHeader(doc, company, opts = {}) {
  const startY = doc.y
  const left   = doc.page.margins.left
  const right  = doc.page.width - doc.page.margins.right

  doc
    .font('Helvetica-Bold').fontSize(14)
    .text(company.name || 'PT. Pelangi Nuansa Jaya', left, startY, { width: right - left })

  doc
    .font('Helvetica').fontSize(9)
    .fillColor('#444')
  if (company.address) doc.text(company.address, { width: right - left })
  const contact = [
    company.phone   ? `Telp: ${company.phone}`     : null,
    company.email   ? `Email: ${company.email}`    : null,
    company.website ? company.website              : null,
  ].filter(Boolean).join('  ·  ')
  if (contact) doc.text(contact, { width: right - left })

  doc.moveDown(0.4)
  doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#0F8C50').lineWidth(1).stroke()
  doc.fillColor('#000').strokeColor('#000')
  doc.moveDown(0.5)
  return doc.y
}

/**
 * Helper draw signature block (3 columns: customer, driver, fleet ops).
 */
function drawSignatureBlock(doc, columns, opts = {}) {
  const left  = doc.page.margins.left
  const right = doc.page.width - doc.page.margins.right
  const totalWidth = right - left
  const colWidth   = totalWidth / columns.length
  const topY       = doc.y

  columns.forEach((col, idx) => {
    const x = left + idx * colWidth
    doc.font('Helvetica').fontSize(9).fillColor('#000')
       .text(col.label, x, topY, { width: colWidth, align: 'center' })
    // 50pt gap untuk tanda tangan
    const sigY = topY + 60
    doc.moveTo(x + 20, sigY).lineTo(x + colWidth - 20, sigY).strokeColor('#000').stroke()
    doc.font('Helvetica').fontSize(9)
       .text(col.name || '(_____________________)', x, sigY + 4, { width: colWidth, align: 'center' })
  })

  doc.y = topY + 80
}

module.exports = {
  formatIDR,
  formatDateID,
  formatDateShort,
  drawCompanyHeader,
  drawSignatureBlock,
}
