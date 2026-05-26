'use strict'

/**
 * Invoice PDF template — desain menyerupai invoice fisik PNJ.
 *
 * Layout:
 *   1. Kop perusahaan (logo kiri + info kanan, border atas-bawah)
 *   2. Bar info dokumen (No | Tanggal | "Invoice")
 *   3. Kepada + No Kontrak
 *   4. Tabel item (No | Deskripsi | Keterangan | Qty | Harga | Jumlah)
 *   5. Footer: metode pembayaran + catatan (kiri) | sub total / PPN / Netto (kanan)
 *   6. Tanda tangan (Tanda Terima | Hormat Kami)
 */

const fs   = require('fs')
const path = require('path')
const { formatIDR, formatDateShort } = require('./utils')

// ── Warna ──────────────────────────────────────────────────────────────────
const C_BLACK    = '#000000'
const C_DARK     = '#1A1A1A'
const C_GRAY     = '#888888'
const C_BORDER   = '#555555'
const C_HEAD_BG  = '#D0D0D0'   // abu-abu header tabel (sesuai gambar)
const C_LINE     = '#888888'

// ── Helper geometry ────────────────────────────────────────────────────────
function pageGeom(doc) {
  const L = doc.page.margins.left
  const R = doc.page.width - doc.page.margins.right
  const W = R - L
  return { L, R, W }
}

// ── Draw horizontal rule ───────────────────────────────────────────────────
function hRule(doc, x, y, w, color = C_BORDER, lw = 0.5) {
  doc.moveTo(x, y).lineTo(x + w, y).strokeColor(color).lineWidth(lw).stroke()
}

// ── Draw full bordered rect (no fill) ────────────────────────────────────
function borderRect(doc, x, y, w, h, color = C_BORDER, lw = 0.5) {
  doc.rect(x, y, w, h).strokeColor(color).lineWidth(lw).stroke()
}

function formatDateNumeric(input) {
  if (!input) return '-'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return String(input)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function formatQty(n) {
  const num = Number(n || 0)
  if (Number.isInteger(num)) return String(num)
  return num.toLocaleString('id-ID', { maximumFractionDigits: 2 })
}

function serviceRemark(invoice) {
  return invoice.service_type === 'rental'
    ? 'Tagihan Biaya Jasa Penyewaan.'
    : 'Tagihan Biaya Jasa Pengiriman.'
}

function findAttachedSjForItem(invoice, item) {
  const attached = invoice.attachedSJs || invoice.attached_sj || []
  if (!Array.isArray(attached) || attached.length === 0) return null
  if (item.source_sj_id) {
    const match = attached.find(sj => Number(sj.id) === Number(item.source_sj_id))
    if (match) return match
  }
  return attached.length === 1 ? attached[0] : null
}

function uniqueNonEmpty(values) {
  return [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))]
}

function buildRentalDescription(item) {
  const lines = [
    'Jenis Kendaraan :',
    item.fleet_label || item.description || '-',
  ]
  if (item.period_start || item.period_end) {
    lines.push('', 'Periode pakai :', `${formatDateNumeric(item.period_start)} - ${formatDateNumeric(item.period_end)}`)
  }
  return lines.join('\n')
}

function buildDeliveryInfoRows(invoice, items) {
  const fleets = uniqueNonEmpty(items.map(item => item.fleet_label))
  const routes = uniqueNonEmpty(items.map(item => {
    const sj = findAttachedSjForItem(invoice, item)
    if (!sj?.origin && !sj?.destination) return ''
    return `${sj.origin || '-'} - ${sj.destination || '-'}`
  }))
  const rows = []
  if (fleets.length > 0) {
    rows.push({ noText: '', descText: `Armada :\n${fleets.join(', ')}` })
  }
  if (routes.length > 0) {
    rows.push({ noText: '', descText: `Rute Pengiriman :\n${routes.join(', ')}` })
  }
  return rows
}

function buildInvoiceTableRows(invoice, items) {
  if (invoice.service_type === 'rental') {
    return items.map((item, idx) => ({
      noText:  String(idx + 1),
      descText: buildRentalDescription(item),
      qtyText: `${formatQty(item.qty || 1)} ${item.unit || 'Unit'}`,
      hrgText: formatIDR(item.unit_price),
      jmlText: formatIDR(item.subtotal),
    }))
  }

  const itemRows = items.map((item, idx) => ({
    noText:  String(idx + 1),
    descText: item.description || '-',
    qtyText: `${formatQty(item.qty || 1)} ${item.unit || 'Unit'}`,
    hrgText: formatIDR(item.unit_price),
    jmlText: formatIDR(item.subtotal),
  }))
  return [...itemRows, ...buildDeliveryInfoRows(invoice, items)]
}

// ── Draw logo (fallback: teks "PNJ" dalam kotak) ──────────────────────────
function drawLogo(doc, company, x, y, size) {
  // Coba logo dari company settings
  if (company.logoPath && fs.existsSync(company.logoPath)) {
    doc.image(company.logoPath, x, y, { width: size, height: size, fit: [size, size] })
    return
  }
  // Coba logo dari folder public Next.js
  const fallbackPaths = [
    path.resolve(__dirname, '../../../../public/pnj-logo.png'),
    path.resolve(__dirname, '../../../public/pnj-logo.png'),
    path.resolve(__dirname, '../../public/pnj-logo.png'),
  ]
  for (const p of fallbackPaths) {
    if (fs.existsSync(p)) {
      doc.image(p, x, y, { width: size, height: size, fit: [size, size] })
      return
    }
  }
  // Fallback: teks PNJ dalam lingkaran
  doc.circle(x + size / 2, y + size / 2, size / 2)
     .fillAndStroke('#CC1111', C_BORDER)
  doc.font('Helvetica-Bold').fontSize(size * 0.35).fillColor('#FFFFFF')
     .text('PNJ', x, y + size * 0.32, { width: size, align: 'center' })
  doc.fillColor(C_BLACK)
}

// ── 1. Kop Perusahaan ─────────────────────────────────────────────────────
function drawHeader(doc, company, options) {
  const { L, R, W } = pageGeom(doc)
  const topY = doc.page.margins.top

  const LOGO_SIZE = 64
  const INFO_X    = L + LOGO_SIZE + 10
  const INFO_W    = W - LOGO_SIZE - 10

  // Border atas
  hRule(doc, L, topY, W, C_BORDER, 1.2)

  if (options.includeLogo !== false) {
    drawLogo(doc, company, L, topY + 4, LOGO_SIZE)
  }

  // Info perusahaan
  const infoStartY = topY + 2
  doc.font('Helvetica-Bold').fontSize(16).fillColor(C_DARK)
     .text(company.name || 'PT. PELANGI NUANSA JAYA', INFO_X, infoStartY, { width: INFO_W })

  doc.font('Helvetica').fontSize(8).fillColor(C_DARK)
  if (company.address) {
    doc.text(company.address, INFO_X, doc.y + 1, { width: INFO_W })
  }
  if (company.website) {
    doc.font('Helvetica-Oblique').fontSize(8)
       .text(`Website : ${company.website}`, INFO_X, doc.y + 1, { width: INFO_W })
    doc.font('Helvetica')
  }
  const contactParts = []
  if (company.phone) contactParts.push(`Phone : ${company.phone}`)
  if (company.email) contactParts.push(`email : ${company.email}`)
  if (contactParts.length) {
    doc.font('Helvetica').fontSize(8)
       .text(contactParts.join(' - '), INFO_X, doc.y + 1, { width: INFO_W })
  }

  const headerBottom = Math.max(topY + LOGO_SIZE + 6, doc.y + 4)

  // Border bawah kop
  hRule(doc, L, headerBottom, W, C_BORDER, 1.2)

  return headerBottom + 6
}

// ── 2. Bar Info Dokumen ────────────────────────────────────────────────────
function drawDocInfoBar(doc, invoice, startY) {
  const { L, R, W } = pageGeom(doc)

  const noText      = `No : ${invoice.invoice_number || '-'}`
  const tglText     = `Tanggal :${formatDateShort(invoice.invoice_date)}`
  const labelText   = 'Invoice'
  const barH        = 22

  // Background putih, border bawah
  hRule(doc, L, startY + barH, W, C_BORDER, 0.8)

  // "No :"
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C_DARK)
     .text(noText, L, startY + 5, { width: W / 3, align: 'left' })

  // "Tanggal :"
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C_DARK)
     .text(tglText, L + W / 3, startY + 5, { width: W / 3, align: 'center' })

  // "Invoice" label besar kanan
  doc.font('Helvetica-Bold').fontSize(16).fillColor(C_DARK)
     .text(labelText, L + (W * 2 / 3), startY + 2, { width: W / 3, align: 'right' })

  return startY + barH + 8
}

// ── 3. Kepada + No Kontrak ────────────────────────────────────────────────
function drawRecipientBlock(doc, invoice, startY) {
  const { L, R, W } = pageGeom(doc)
  const colW = W / 2

  let y = startY

  // Kepada (kiri)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C_DARK)
     .text('Kepada :', L, y)
  y = doc.y
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C_DARK)
     .text(invoice.customer?.name || '-', L, y)
  y = doc.y
  doc.font('Helvetica').fontSize(9).fillColor(C_DARK)
     .text('Indonesia', L, y)

  // No Kontrak (kanan) — ditulis di baris pertama sejajar "Kepada :"
  if (invoice.project?.contract_number || invoice.project?.code) {
    const contractNo = invoice.project.contract_number || invoice.project.code
    doc.font('Helvetica').fontSize(9).fillColor(C_DARK)
       .text(`No Kontrak : ${contractNo}`, L + colW, startY, { width: colW, align: 'right' })
  }

  return doc.y + 8
}

// ── 4. Tabel Item ─────────────────────────────────────────────────────────
/**
 * Kolom: No | Deskripsi | Keterangan | Qty | Harga | Jumlah
 * Satu baris per item, tinggi baris auto-fit berdasarkan konten terpanjang.
 */
function drawItemTable(doc, invoice, startY) {
  const { L, W } = pageGeom(doc)

  // Lebar kolom
  const COL_NO    = 24
  const COL_QTY   = 55
  const COL_HARGA = 90
  const COL_JML   = 90
  const COL_KET   = 115
  const COL_DESC  = W - COL_NO - COL_QTY - COL_HARGA - COL_JML - COL_KET

  // X positions
  const X_NO   = L
  const X_DESC = X_NO   + COL_NO
  const X_KET  = X_DESC + COL_DESC
  const X_QTY  = X_KET  + COL_KET
  const X_HRG  = X_QTY  + COL_QTY
  const X_JML  = X_HRG  + COL_HARGA

  const FONT_SZ  = 8.5
  const PAD      = 4    // padding horizontal & vertical dalam sel
  const MIN_ROW  = 22   // tinggi baris minimum

  const HEADER_H = 18
  let y = startY

  // ── Header row ───────────────────────────────────────────────────────────
  doc.rect(L, y, W, HEADER_H).fillAndStroke(C_HEAD_BG, C_BORDER)
  doc.font('Helvetica-Bold').fontSize(FONT_SZ).fillColor(C_DARK)
  ;[
    { label: 'No',         x: X_NO,   w: COL_NO,    align: 'center' },
    { label: 'Deskripsi',  x: X_DESC, w: COL_DESC,  align: 'center' },
    { label: 'Keterangan', x: X_KET,  w: COL_KET,   align: 'center' },
    { label: 'Qty',        x: X_QTY,  w: COL_QTY,   align: 'center' },
    { label: 'Harga',      x: X_HRG,  w: COL_HARGA, align: 'center' },
    { label: 'Jumlah',     x: X_JML,  w: COL_JML,   align: 'center' },
  ].forEach(h => doc.text(h.label, h.x + 2, y + 5, { width: h.w - 4, align: h.align }))
  y += HEADER_H

  // ── Item rows ─────────────────────────────────────────────────────────────
  const items = invoice.items || []

  if (items.length === 0) {
    const rowH = 24
    borderRect(doc, L, y, W, rowH)
    doc.font('Helvetica').fontSize(FONT_SZ).fillColor(C_GRAY)
       .text('(tidak ada item)', L + 2, y + 7, { width: W - 4, align: 'center' })
    y += rowH
  } else {
    const ketText  = serviceRemark(invoice)
    doc.font('Helvetica').fontSize(FONT_SZ)
    const hKet  = doc.heightOfString(ketText,  { width: COL_KET  - PAD * 2, align: 'center' })
    const itemRows = buildInvoiceTableRows(invoice, items).map((row) => {
      const hNo   = doc.heightOfString(row.noText || '', { width: COL_NO - 4 })
      const hDesc = doc.heightOfString(row.descText || '', { width: COL_DESC - PAD * 2 })
      const hQty  = doc.heightOfString(row.qtyText || '', { width: COL_QTY - PAD * 2 })
      const hHrg  = doc.heightOfString(row.hrgText || '', { width: COL_HARGA - PAD * 2 })
      const hJml  = doc.heightOfString(row.jmlText || '', { width: COL_JML - PAD * 2 })
      return {
        ...row,
        heights: { no: hNo, desc: hDesc, qty: hQty, hrg: hHrg, jml: hJml },
        rowH:    Math.max(MIN_ROW, hNo + PAD * 2, hDesc + PAD * 2, hQty + PAD * 2, hHrg + PAD * 2, hJml + PAD * 2),
      }
    })
    const detailRowsH = itemRows.reduce((sum, row) => sum + row.rowH, 0)
    const blockH = Math.max(detailRowsH, hKet + PAD * 2)
    const blockStartY = y

    doc.rect(X_KET,  blockStartY, COL_KET,  blockH).strokeColor(C_BORDER).lineWidth(0.5).stroke()

    const centerY = (height) => blockStartY + Math.max(PAD, (blockH - height) / 2)
    doc.font('Helvetica-Bold').fontSize(FONT_SZ).fillColor(C_DARK)
       .text(ketText, X_KET + PAD, centerY(hKet), { width: COL_KET - PAD * 2, align: 'center' })
    doc.font('Helvetica').fillColor(C_DARK)

    let rowY = blockStartY
    itemRows.forEach((row) => {
      const textY = (height) => rowY + Math.max(PAD, (row.rowH - height) / 2)
      doc.rect(X_NO, rowY, COL_NO, row.rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_DESC, rowY, COL_DESC, row.rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_QTY, rowY, COL_QTY, row.rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_HRG, rowY, COL_HARGA, row.rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_JML, rowY, COL_JML, row.rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.text(row.noText || '', X_NO + 2, textY(row.heights.no), { width: COL_NO - 4, align: 'center', lineBreak: false })
      doc.text(row.descText || '', X_DESC + PAD, textY(row.heights.desc), { width: COL_DESC - PAD * 2 })
      doc.text(row.qtyText || '', X_QTY + PAD, textY(row.heights.qty), { width: COL_QTY - PAD * 2, align: 'center' })
      doc.text(row.hrgText || '', X_HRG + PAD, textY(row.heights.hrg), { width: COL_HARGA - PAD * 2, align: 'right' })
      doc.text(row.jmlText || '', X_JML + PAD, textY(row.heights.jml), { width: COL_JML - PAD * 2, align: 'right' })
      rowY += row.rowH
    })
    if (rowY < blockStartY + blockH) {
      const fillerH = blockStartY + blockH - rowY
      doc.rect(X_NO, rowY, COL_NO, fillerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_DESC, rowY, COL_DESC, fillerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_QTY, rowY, COL_QTY, fillerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_HRG, rowY, COL_HARGA, fillerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_JML, rowY, COL_JML, fillerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    }
    y += blockH
  }

  // Baris spacer bawah tabel
  const spacerH = 14
  doc.rect(L, y, W, spacerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
  y += spacerH

  return y
}

// ── 5. Footer: Pembayaran + Totals ────────────────────────────────────────
function drawFooter(doc, invoice, company, startY) {
  const { L, R, W } = pageGeom(doc)

  const COL_LEFT_W  = W * 0.55
  const COL_RIGHT_W = W - COL_LEFT_W
  const RIGHT_X     = L + COL_LEFT_W
  const PAD         = 4

  let leftY  = startY + PAD
  let rightY = startY + PAD

  // ── Kiri: Metode Pembayaran ──────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C_DARK)
     .text('Metode Pembayaran :', L, leftY)
  leftY = doc.y + 2
  doc.font('Helvetica').fontSize(9).fillColor(C_DARK)
  const bankLine = `Transfer Ke no Rek ${company.bank.name || ''} : ${company.bank.account || '-'} a/n ${company.bank.holder || company.name || '-'}`
  doc.text(bankLine, L, leftY, { width: COL_LEFT_W - PAD })
  leftY = doc.y + 4

  doc.font('Helvetica-Bold').fontSize(9).fillColor(C_DARK)
     .text('Note :', L, leftY)
  leftY = doc.y + 2
  const defaultNote = 'Setelah Pembayaran dilakukan, mohon kirimkan bukti transfer ke email kami atau hubungi admin kami melalui WhatsApp'
  const invoiceNote = String(invoice.notes || '').trim()
  const noteText = invoiceNote ? `${invoiceNote},\n${defaultNote}` : defaultNote
  doc.font('Helvetica').fontSize(8).fillColor(C_DARK)
     .text(noteText, L, leftY, { width: COL_LEFT_W - PAD })
  leftY = doc.y + 6

  // ── Kanan: Totals ────────────────────────────────────────────────────
  const LABEL_W = 80
  const VALUE_W = COL_RIGHT_W - LABEL_W - 20
  const ROW_H   = 16

  function totalRow(label, value, bold = false, doubleBorder = false) {
    const rowBotY = rightY + ROW_H
    // border
    doc.rect(RIGHT_X, rightY, COL_RIGHT_W, ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    if (doubleBorder) {
      doc.rect(RIGHT_X + 1, rightY + 1, COL_RIGHT_W - 2, ROW_H - 2)
         .strokeColor(C_BORDER).lineWidth(0.5).stroke()
    }
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(C_DARK)
       .text(label, RIGHT_X + PAD, rightY + 4, { width: LABEL_W, align: 'left' })
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(C_DARK)
       .text(value, RIGHT_X + LABEL_W, rightY + 4, { width: VALUE_W + 20, align: 'right' })
    rightY = rowBotY
  }

  totalRow('Sub Total', formatIDR(invoice.subtotal_amount))
  if (Number(invoice.tax_percent) > 0) {
    totalRow(`PPN (${invoice.tax_percent}%)`, formatIDR(invoice.tax_amount))
  }
  if (Number(invoice.pph_percent) > 0) {
    totalRow(`PPh (${invoice.pph_percent}%)`, `(${formatIDR(invoice.pph_amount)})`)
  }
  if (Number(invoice.insurance_amount) > 0) {
    totalRow('Asuransi', formatIDR(invoice.insurance_amount))
  }

  // DP Diterima — tampil sebelum Netto
  let dpAmount = Number(invoice.down_payment_amount || 0)
  if (!dpAmount && Array.isArray(invoice.payments)) {
    const dp = invoice.payments.find(p => p.is_down_payment === true)
    if (dp) dpAmount = Number(dp.amount || 0)
  }
  if (dpAmount > 0) {
    totalRow('Down Payment', formatIDR(dpAmount))
  }

  totalRow('Netto', formatIDR(invoice.total_amount), true, true)

  return Math.max(leftY, rightY) + 6
}

// ── 6. Tanda Tangan ───────────────────────────────────────────────────────
function drawSignatures(doc, invoice, company, startY) {
  const { L, R, W } = pageGeom(doc)
  const colW   = W / 2
  const sigH   = 70   // space untuk tanda tangan / materai

  let y = startY + 6

  // Tanda Terima (kiri)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C_DARK)
     .text('Tanda Terima', L, y, { width: colW, align: 'center' })

  // Hormat Kami (kanan)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C_DARK)
     .text('Hormat Kami,', L + colW, y, { width: colW, align: 'center' })

  y += sigH

  // Garis tanda tangan
  doc.moveTo(L + 20,         y).lineTo(L + colW - 20,   y).strokeColor(C_BORDER).lineWidth(0.8).stroke()
  doc.moveTo(L + colW + 20, y).lineTo(R - 20,            y).strokeColor(C_BORDER).lineWidth(0.8).stroke()

  // Nama
  doc.font('Helvetica').fontSize(9).fillColor(C_DARK)
     .text(invoice.customer?.name || '(___________________)', L, y + 3, { width: colW, align: 'center' })
  doc.font('Helvetica').fontSize(9).fillColor(C_DARK)
     .text(company.name || 'PT. Pelangi Nuansa Jaya', L + colW, y + 3, { width: colW, align: 'center' })
}

// ── Footer page (nomor + tanggal cetak) ─────────────────────────────────
function drawPageFooter(doc, invoice) {
  const { L, W } = pageGeom(doc)
  const footerY  = doc.page.height - doc.page.margins.bottom - 10
  doc.font('Helvetica').fontSize(7).fillColor(C_GRAY)
     .text(
       `Dicetak pada ${formatDateShort(new Date())} — ${invoice.invoice_number || ''}`,
       L, footerY, { width: W, align: 'center' },
     )
  doc.fillColor(C_BLACK)
}

// ── Lampiran SJ (halaman terakhir jika includeSJ) ─────────────────────────
function drawSJAppendix(doc, invoice, company, options) {
  const { L, R, W } = pageGeom(doc)

  doc.addPage()
  drawHeader(doc, company, options)

  const afterHeader = doc.y
  doc.font('Helvetica-Bold').fontSize(13).fillColor(C_DARK)
     .text('LAMPIRAN SURAT JALAN', L, afterHeader, { width: W, align: 'center' })
  doc.font('Helvetica').fontSize(9).fillColor(C_GRAY)
     .text(`Invoice ${invoice.invoice_number}`, L, doc.y + 2, { width: W, align: 'center' })
  doc.fillColor(C_BLACK).moveDown(0.8)

  const cols = [
    { label: 'No',      w: 28,  align: 'center' },
    { label: 'No. SJ',  w: 110, align: 'left' },
    { label: 'Tanggal', w: 80,  align: 'center' },
    { label: 'Armada',  w: W - 28 - 110 - 80, align: 'left' },
  ]

  let y = doc.y
  doc.rect(L, y, W, 18).fillAndStroke(C_HEAD_BG, C_BORDER)
  doc.fillColor(C_DARK).font('Helvetica-Bold').fontSize(9)
  let cx = L
  cols.forEach(c => {
    doc.text(c.label, cx + 2, y + 5, { width: c.w - 4, align: c.align })
    cx += c.w
  })
  y += 18

  doc.fillColor(C_DARK).font('Helvetica').fontSize(9)
  ;(invoice.attachedSJs || []).forEach((sj, idx) => {
    if (y + 18 > doc.page.height - doc.page.margins.bottom - 30) {
      doc.addPage()
      y = doc.page.margins.top
    }
    doc.rect(L, y, W, 18).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    const fleetLabel = (!sj.fleet || sj.fleet.is_tbd)
      ? 'TBD'
      : `${sj.fleet.name || ''} (${sj.fleet.plate_number || ''})`.trim()
    const cells = [String(idx + 1), sj.sj_number || '-', formatDateShort(sj.sj_date), fleetLabel]
    cx = L
    cols.forEach((c, ci) => {
      doc.text(cells[ci], cx + 2, y + 5, { width: c.w - 4, align: c.align })
      cx += c.w
    })
    y += 18
  })

  drawPageFooter(doc, invoice)
}

// ── Render satu salinan Invoice ───────────────────────────────────────────
/**
 * Render satu copy invoice penuh ke dalam doc mulai dari halaman aktif saat ini.
 * Jika konten melebihi satu halaman, fungsi ini akan memanggil doc.addPage()
 * sendiri (perilaku sama dengan sebelumnya).
 */
function renderOneCopy(doc, invoice, company, options = {}) {
  const {
    includeLogo = true,
    includeSig  = true,
  } = options

  // 1. Kop
  let y = drawHeader(doc, company, { includeLogo })

  // 2. Bar info dokumen
  y = drawDocInfoBar(doc, invoice, y)

  // 3. Kepada + No Kontrak
  y = drawRecipientBlock(doc, invoice, y)

  // 4. Tabel
  y = drawItemTable(doc, invoice, y)
  y += 4

  // 5. Footer (pembayaran + totals)
  const minFooterH = 80
  if (y + minFooterH > doc.page.height - doc.page.margins.bottom - 120) {
    doc.addPage()
    y = doc.page.margins.top
  }
  y = drawFooter(doc, invoice, company, y)

  // 6. Tanda tangan
  if (includeSig) {
    const sigH = 100
    if (y + sigH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage()
      y = doc.page.margins.top
    }
    drawSignatures(doc, invoice, company, y)
  }

  // Page footer (nomor + tanggal cetak) pada halaman terakhir copy ini
  drawPageFooter(doc, invoice)
}

// ── Lampiran foto (halaman terakhir invoice) ──────────────────────────────
function drawInvoiceLampiranPage(doc, invoice, company, options) {
  const { L, W } = pageGeom(doc)
  const GAP     = 10
  const IMG_PAD = 6

  const bufs  = (options.lampiranBuffers || []).slice(0, 3)
  if (bufs.length === 0) return

  doc.addPage()

  // Header ringkas
  let y = drawHeader(doc, company, options)

  // Judul
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C_DARK)
     .text('LAMPIRAN FOTO INVOICE', L, y, { width: W, align: 'center' })
  doc.font('Helvetica').fontSize(9).fillColor(C_GRAY)
     .text(invoice.invoice_number || '', L, y + 16, { width: W, align: 'center' })
  doc.fillColor(C_BLACK)
  hRule(doc, L, y + 30, W)
  y += 40

  // Grid gambar: 1 → full width; 2-3 → 2 kolom
  const count  = bufs.length
  const CELL_W = count === 1 ? W : (W - GAP) / 2
  const CELL_H = count === 1 ? 400 : 230

  function drawCell(buf, x, cellY) {
    doc.rect(x, cellY, CELL_W, CELL_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    try {
      doc.image(buf, x + IMG_PAD, cellY + IMG_PAD, {
        width:  CELL_W - IMG_PAD * 2,
        height: CELL_H - IMG_PAD * 2,
        fit:    [CELL_W - IMG_PAD * 2, CELL_H - IMG_PAD * 2],
        align:  'center',
        valign: 'center',
      })
    } catch (_) {
      doc.font('Helvetica').fontSize(8).fillColor(C_GRAY)
         .text('Gambar tidak dapat ditampilkan', x + 4, cellY + CELL_H / 2 - 5,
               { width: CELL_W - 8, align: 'center' })
      doc.fillColor(C_BLACK)
    }
  }

  if (count === 1) {
    drawCell(bufs[0], L, y)
  } else {
    drawCell(bufs[0], L,                    y)
    drawCell(bufs[1], L + CELL_W + GAP,     y)
    if (count === 3) {
      drawCell(bufs[2], L + (W - CELL_W) / 2, y + CELL_H + GAP)
    }
  }

  drawPageFooter(doc, invoice)
}

// ── PUBLIC: render ─────────────────────────────────────────────────────────
/**
 * Render Invoice rangkap N — tiap salinan di halaman terpisah.
 *
 * options.copies   — jumlah rangkap (default 3)
 * options.copyLabel — true → tambah watermark kecil "Lembar X / N" di sudut kanan bawah
 *
 * Lampiran SJ (jika includeSJ = true) tetap dicetak sekali di akhir dokumen,
 * setelah semua salinan invoice.
 */
function render(doc, invoice, company, options = {}) {
  const {
    includeSJ = false,
  } = options

  const copies = typeof options.copies === 'number' && options.copies > 0
    ? options.copies
    : 3

  for (let i = 0; i < copies; i++) {
    if (i > 0) doc.addPage()
    renderOneCopy(doc, invoice, company, options)

    // Opsional: label lembar di sudut kanan bawah tiap salinan
    if (options.copyLabel) {
      const { L, W } = pageGeom(doc)
      const footerY  = doc.page.height - doc.page.margins.bottom + 4
      doc.font('Helvetica').fontSize(7).fillColor('#AAAAAA')
         .text(`Lembar ${i + 1} / ${copies}`, L, footerY, { width: W, align: 'right' })
      doc.fillColor('#000000')
    }
  }

  // Lampiran SJ dicetak sekali di akhir (bukan per salinan)
  if (includeSJ && Array.isArray(invoice.attachedSJs) && invoice.attachedSJs.length > 0) {
    drawSJAppendix(doc, invoice, company, options)
  }

  // Lampiran foto invoice di halaman paling akhir
  if (options.includeLampiran !== false &&
      Array.isArray(options.lampiranBuffers) &&
      options.lampiranBuffers.length > 0) {
    drawInvoiceLampiranPage(doc, invoice, company, options)
  }
}

module.exports = { render }
