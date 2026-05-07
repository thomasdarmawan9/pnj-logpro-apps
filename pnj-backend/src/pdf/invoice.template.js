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
 * Sesuai desain gambar fisik.
 */
function drawItemTable(doc, invoice, startY) {
  const { L, R, W } = pageGeom(doc)

  // Lebar kolom
  const COL_NO    = 24
  const COL_QTY   = 72
  const COL_HARGA = 88
  const COL_JML   = 88
  const COL_KET   = 120
  const COL_DESC  = W - COL_NO - COL_QTY - COL_HARGA - COL_JML - COL_KET

  const cols = [
    { label: 'No',          w: COL_NO,   align: 'center' },
    { label: 'Deskripsi',   w: COL_DESC, align: 'center' },
    { label: 'Keterangan',  w: COL_KET,  align: 'center' },
    { label: 'Qty',         w: COL_QTY,  align: 'center' },
    { label: 'Harga',       w: COL_HARGA, align: 'center' },
    { label: 'Jumlah',      w: COL_JML,  align: 'center' },
  ]

  const HEADER_H = 18
  let y = startY

  // Header row
  doc.rect(L, y, W, HEADER_H).fillAndStroke(C_HEAD_BG, C_BORDER)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C_DARK)
  let cx = L
  cols.forEach(c => {
    doc.text(c.label, cx + 2, y + 5, { width: c.w - 4, align: 'center' })
    cx += c.w
  })
  y += HEADER_H

  // ── Item rows ──────────────────────────────────────────────────────────
  const items = invoice.items || []
  doc.font('Helvetica').fontSize(9).fillColor(C_DARK)

  // Kita group item-item dan render sebagai satu blok besar seperti pada gambar:
  // - Kolom Deskripsi: list kendaraan + periode
  // - Kolom Keterangan: "Tagihan Biaya Jasa Sewa Kendaraan" (satu teks untuk semua)
  // - Tiap item mendapat baris Qty / Harga / Jumlah tersendiri

  if (items.length === 0) {
    const rowH = 24
    borderRect(doc, L, y, W, rowH)
    doc.font('Helvetica').fontSize(9).fillColor(C_GRAY)
       .text('(tidak ada item)', L + 2, y + 7, { width: W - 4, align: 'center' })
    y += rowH
  } else {
    // Hitung tinggi blok deskripsi (kolom kiri) → tinggi total per item ≈ 18pt minimum
    const ROW_MIN_H = 20
    const PAD       = 3

    // Deskripsi bersama untuk semua item (jenis kendaraan list + periode)
    // Gabungkan semua label kendaraan
    const vehicleLines = items.map((it, i) => `${i + 1}. ${it.fleet_label || it.description || '-'}`)
    const periodSet = new Set(
      items
        .filter(it => it.period_start || it.period_end)
        .map(it => `${formatDateShort(it.period_start)} - ${formatDateShort(it.period_end)}`)
    )
    const periodLine = periodSet.size > 0 ? `Periode Pakai : ${[...periodSet].join(', ')}` : null

    // Keterangan bersama
    const keteranganText = items
      .map(it => it.description)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)  // unique
      .join('\n') || 'Tagihan Biaya Jasa Sewa Kendaraan.'

    // Render satu blok besar untuk semua item
    // Tinggi blok: max(tinggi desc, tinggi ket, sum(item rows))
    const totalItemsH = Math.max(items.length, 1) * ROW_MIN_H

    // Gambar border luar blok
    const blockStartY = y

    // Kolom No — centered, span semua item
    doc.rect(L, y, COL_NO, totalItemsH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    doc.font('Helvetica').fontSize(9).fillColor(C_DARK)
       .text('1', L + 2, y + (totalItemsH / 2) - 5, { width: COL_NO - 4, align: 'center' })

    // Kolom Deskripsi — kendaraan list + periode
    const descX = L + COL_NO
    doc.rect(descX, y, COL_DESC, totalItemsH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    let descY = y + PAD
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C_DARK)
       .text('Jenis Kendaraan :', descX + 3, descY, { width: COL_DESC - 6 })
    descY = doc.y + 1
    doc.font('Helvetica').fontSize(8.5).fillColor(C_DARK)
    vehicleLines.forEach(line => {
      doc.text(line, descX + 3, descY, { width: COL_DESC - 6 })
      descY = doc.y + 1
    })
    if (periodLine) {
      descY += 3
      doc.font('Helvetica').fontSize(8.5).fillColor(C_DARK)
         .text(periodLine, descX + 3, descY, { width: COL_DESC - 6 })
    }

    // Kolom Keterangan — satu teks, vertikal tengah
    const ketX = descX + COL_DESC
    doc.rect(ketX, y, COL_KET, totalItemsH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    const ketTextH = doc.heightOfString(keteranganText, { width: COL_KET - 6, align: 'center' })
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C_DARK)
       .text(keteranganText, ketX + 3, y + Math.max(PAD, (totalItemsH - ketTextH) / 2), { width: COL_KET - 6, align: 'center' })

    // Kolom Qty / Harga / Jumlah — satu baris per item
    const qtyX  = ketX + COL_KET
    const hrgX  = qtyX + COL_QTY
    const jmlX  = hrgX + COL_HARGA

    items.forEach((it, idx) => {
      const rowY = y + idx * ROW_MIN_H
      // border row
      doc.rect(qtyX, rowY, COL_QTY,   ROW_MIN_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(hrgX, rowY, COL_HARGA, ROW_MIN_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(jmlX, rowY, COL_JML,   ROW_MIN_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()

      const qtyLabel = `${Number(it.qty || 1)} ${it.unit || 'Unit'}\n${it.fleet_label || ''}`
      doc.font('Helvetica').fontSize(8).fillColor(C_DARK)
         .text(qtyLabel, qtyX + 2, rowY + 3, { width: COL_QTY - 4, align: 'center' })

      doc.font('Helvetica').fontSize(8.5).fillColor(C_DARK)
         .text(formatIDR(it.unit_price), hrgX + 2, rowY + 6, { width: COL_HARGA - 4, align: 'right' })

      doc.font('Helvetica').fontSize(8.5).fillColor(C_DARK)
         .text(formatIDR(it.subtotal), jmlX + 2, rowY + 6, { width: COL_JML - 4, align: 'right' })
    })

    y += totalItemsH
  }

  // Baris kosong bawah tabel (optional spacer)
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
  leftY = doc.y + 6

  if (invoice.notes) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C_DARK)
       .text('Note :', L, leftY)
    leftY = doc.y + 2
    doc.font('Helvetica').fontSize(9).fillColor(C_DARK)
       .text(invoice.notes, L, leftY, { width: COL_LEFT_W - PAD })
    leftY = doc.y
  }

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
  totalRow('Netto', formatIDR(invoice.total_amount), true, true)

  // DP Diterima — pisahkan dari pembayaran reguler kalau ada.
  // `decorate()` di service sudah menyediakan down_payment_amount.
  // Untuk safety, hitung manual dari payments[] kalau decorate belum dipanggil.
  let dpAmount = Number(invoice.down_payment_amount || 0)
  if (!dpAmount && Array.isArray(invoice.payments)) {
    const dp = invoice.payments.find(p => p.is_down_payment === true)
    if (dp) dpAmount = Number(dp.amount || 0)
  }
  const totalPaid    = Number(invoice.paid_amount || 0)
  const regularPaid  = Math.max(0, totalPaid - dpAmount)
  const remaining    = Math.max(0, Number(invoice.total_amount) - totalPaid)

  if (dpAmount > 0) {
    totalRow('DP Diterima', formatIDR(dpAmount))
  }
  if (regularPaid > 0) {
    totalRow('Pembayaran', formatIDR(regularPaid))
  }
  if (totalPaid > 0) {
    totalRow('Sisa Tagihan', formatIDR(remaining), true)
  }

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

// ── PUBLIC: render ─────────────────────────────────────────────────────────
function render(doc, invoice, company, options = {}) {
  const {
    includeLogo = true,
    includeSig  = true,
    includeSJ   = false,
  } = options

  const { L, R, W } = pageGeom(doc)

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

  // Page footer
  drawPageFooter(doc, invoice)

  // Lampiran SJ
  if (includeSJ && Array.isArray(invoice.attachedSJs) && invoice.attachedSJs.length > 0) {
    drawSJAppendix(doc, invoice, company, options)
  }
}

module.exports = { render }
