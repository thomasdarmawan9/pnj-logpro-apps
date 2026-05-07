'use strict'

/**
 * Surat Jalan PDF template — dua salinan per halaman A4.
 *
 * Layout setiap salinan:
 *   1. Kop perusahaan (logo kiri + info perusahaan, dalam kotak border)
 *   2. Bar info dokumen  (No | Tanggal | "Surat Jalan")
 *   3. Kepada + garis bawah
 *   4. Intro teks: "Bersama dengan ini kami terima sejumlah barang berikut :"
 *   5. Tabel (No | Nama Barang | QUANTITY) + kolom kanan (Nama Sopir / No Pol)
 *   6. Tanda tangan (Tanda Terima, | Hormat Kami,)
 */

const fs   = require('fs')
const path = require('path')
const { formatDateShort } = require('./utils')

// ── Warna ──────────────────────────────────────────────────────────────────
const C_BLACK   = '#000000'
const C_DARK    = '#1A1A1A'
const C_GRAY    = '#888888'
const C_BORDER  = '#555555'
const C_HEAD_BG = '#D0D0D0'

// ── Page geometry ─────────────────────────────────────────────────────────
const PAGE_W    = 595.28
const PAGE_H    = 841.89
const MARGIN_H  = 32   // left & right margin

const COPY_W    = PAGE_W - MARGIN_H * 2          // 531.28
const COPY_H    = 390                             // tinggi setiap salinan
const TOP_COPY_Y  = 12
const BOT_COPY_Y  = TOP_COPY_Y + COPY_H + 14     // 416

// ── Helpers ────────────────────────────────────────────────────────────────
function hLine(doc, x, y, w, lw = 0.5, color = C_BORDER) {
  doc.moveTo(x, y).lineTo(x + w, y).strokeColor(color).lineWidth(lw).stroke()
}
function vLine(doc, x, y1, y2, lw = 0.5, color = C_BORDER) {
  doc.moveTo(x, y1).lineTo(x, y2).strokeColor(color).lineWidth(lw).stroke()
}

// ── Logo ───────────────────────────────────────────────────────────────────
function drawLogo(doc, company, x, y, size) {
  if (company.logoPath && fs.existsSync(company.logoPath)) {
    doc.image(company.logoPath, x, y, { width: size, height: size, fit: [size, size] })
    return
  }
  const fallbacks = [
    path.resolve(__dirname, '../../../../public/pnj-logo.png'),
    path.resolve(__dirname, '../../../public/pnj-logo.png'),
    path.resolve(__dirname, '../../public/pnj-logo.png'),
  ]
  for (const p of fallbacks) {
    if (fs.existsSync(p)) {
      doc.image(p, x, y, { width: size, height: size, fit: [size, size] })
      return
    }
  }
  // fallback teks
  doc.circle(x + size / 2, y + size / 2, size / 2).fillAndStroke('#CC1111', C_BORDER)
  doc.font('Helvetica-Bold').fontSize(size * 0.35).fillColor('#FFFFFF')
     .text('PNJ', x, y + size * 0.32, { width: size, align: 'center' })
  doc.fillColor(C_BLACK)
}

// ── Render satu salinan SJ ─────────────────────────────────────────────────
function renderCopy(doc, sj, company, options, Y0) {
  const L  = MARGIN_H
  const W  = COPY_W
  const R  = L + W

  const {
    includeHeader = true,
    includeSign   = true,
    includeNotes  = false,
  } = options

  // ── 1. Kop Perusahaan (kotak border) ────────────────────────────────────
  const KOP_H  = 62
  const LOGO_S = 50
  doc.rect(L, Y0, W, KOP_H).strokeColor(C_BORDER).lineWidth(0.8).stroke()

  if (includeHeader) {
    drawLogo(doc, company, L + 4, Y0 + 6, LOGO_S)
  }

  const infoX = L + LOGO_S + 8
  const infoW = W - LOGO_S - 12

  doc.font('Helvetica-Bold').fontSize(14).fillColor(C_DARK)
     .text(company.name || 'PT. PELANGI NUANSA JAYA', infoX, Y0 + 4, { width: infoW })

  // underline nama
  const nameW = doc.widthOfString(company.name || 'PT. PELANGI NUANSA JAYA', { fontSize: 14 })
  hLine(doc, infoX, Y0 + 19, Math.min(nameW, infoW), 0.6, C_DARK)

  doc.font('Helvetica').fontSize(7.5).fillColor(C_DARK)
  const addr = company.address || ''
  if (addr) doc.text(addr, infoX, Y0 + 22, { width: infoW })
  if (company.website) {
    doc.font('Helvetica-Oblique').fontSize(7.5)
       .text(`Website : ${company.website}`, infoX, doc.y + 1, { width: infoW })
    doc.font('Helvetica')
  }
  const contactLine = [
    company.phone ? `Phone : ${company.phone}` : '',
    company.email ? `email : ${company.email}` : '',
  ].filter(Boolean).join(' - ')
  if (contactLine) {
    doc.font('Helvetica').fontSize(7.5).fillColor(C_DARK)
       .text(contactLine, infoX, doc.y + 1, { width: infoW })
  }

  // ── 2. Bar info dokumen ──────────────────────────────────────────────────
  const BAR_Y = Y0 + KOP_H
  const BAR_H = 20

  hLine(doc, L, BAR_Y + BAR_H, W, 0.8)

  // No :
  const noLabel  = 'No :'
  const noValue  = `  ${sj.sj_number || '/SJ/PNJ/'}`
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C_DARK)
     .text(noLabel, L + 2, BAR_Y + 5, { continued: true })
     .text(noValue)

  // Tanggal : (center)
  const tglLabel = 'Tanggal :'
  const tglValue = `  ${formatDateShort(sj.sj_date)}`
  const tglFull  = tglLabel + tglValue
  const tglW     = doc.widthOfString(tglFull, { fontSize: 11 })
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C_DARK)
     .text(tglLabel, L + W / 2 - tglW / 2, BAR_Y + 5, { continued: true })
     .text(tglValue)

  // "Surat Jalan" (kanan)
  doc.font('Helvetica-Bold').fontSize(18).fillColor(C_DARK)
     .text('Surat Jalan', L + W * 0.62, BAR_Y + 1, { width: W * 0.38, align: 'right' })

  // ── 3. Kepada ────────────────────────────────────────────────────────────
  const KEP_Y = BAR_Y + BAR_H + 4
  const KEP_H = 32

  doc.font('Helvetica-Bold').fontSize(9).fillColor(C_DARK)
     .text('Kepada :', L + 2, KEP_Y)

  const customerName = sj.customer?.name || ''
  doc.font('Helvetica').fontSize(9).fillColor(C_DARK)
     .text(customerName, L + 2, KEP_Y + 12, { width: W * 0.6 })

  // Garis bawah nama
  hLine(doc, L + 2, KEP_Y + 24, W * 0.5, 0.5)

  // Project / keterangan di sebelah kanan Kepada (opsional)
  if (sj.project?.name || sj.project?.code) {
    const projLabel = sj.project.contract_number
      ? `No Kontrak : ${sj.project.contract_number}`
      : `Proyek : ${sj.project.code || sj.project.name}`
    doc.font('Helvetica').fontSize(8).fillColor(C_DARK)
       .text(projLabel, L + W * 0.62, KEP_Y + 12, { width: W * 0.38, align: 'right' })
  }

  // ── 4. Intro teks ────────────────────────────────────────────────────────
  const INTRO_Y = KEP_Y + KEP_H
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C_DARK)
     .text('Bersama dengan ini kami terima sejumlah barang berikut :', L + 2, INTRO_Y)

  // ── 5. Tabel ─────────────────────────────────────────────────────────────
  const TABLE_Y = INTRO_Y + 13
  const ROW_H   = 14

  // Lebar kolom main table (75%) + kolom kanan (25%)
  const COL_NO   = 26
  const COL_QTY  = 72
  const RIGHT_W  = 130
  const COL_NAMA = W - COL_NO - COL_QTY - RIGHT_W

  const TABLE_ROWS = 11
  const TABLE_BODY_H = (TABLE_ROWS + 1) * ROW_H   // +1 header row
  const EXTRA_ROWS   = 3                            // Nama Sopir, No Pol, spare
  const TABLE_TOTAL_H = TABLE_BODY_H + EXTRA_ROWS * ROW_H

  // X positions
  const X_NO   = L
  const X_NAMA = X_NO + COL_NO
  const X_QTY  = X_NAMA + COL_NAMA
  const X_RGT  = X_QTY + COL_QTY   // start kolom kanan

  // --- Header row ---
  doc.rect(X_NO, TABLE_Y, COL_NO + COL_NAMA + COL_QTY, ROW_H)
     .fillAndStroke(C_HEAD_BG, C_BORDER)
  // Header kanan — biarkan putih
  doc.rect(X_RGT, TABLE_Y, RIGHT_W, ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C_DARK)
  doc.text('No',         X_NO   + 2, TABLE_Y + 3, { width: COL_NO   - 4, align: 'center' })
  doc.text('Nama Barang', X_NAMA + 2, TABLE_Y + 3, { width: COL_NAMA - 4, align: 'center' })
  doc.text('QUANTITY',   X_QTY  + 2, TABLE_Y + 3, { width: COL_QTY  - 4, align: 'center' })

  // --- Data rows 1–11 ---
  // Cargo: pakai cargo_description baris pertama, sisanya kosong
  const cargoLines = (sj.cargo_description || '').split('\n').filter(Boolean)

  for (let i = 0; i < TABLE_ROWS; i++) {
    const rowY = TABLE_Y + ROW_H + i * ROW_H
    // Borders main table
    doc.rect(X_NO,   rowY, COL_NO,   ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    doc.rect(X_NAMA, rowY, COL_NAMA, ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    doc.rect(X_QTY,  rowY, COL_QTY,  ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    // Border kolom kanan (data rows span seperti di gambar — biarkan kosong)
    doc.rect(X_RGT, rowY, RIGHT_W, ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()

    // No
    doc.font('Helvetica').fontSize(8).fillColor(C_DARK)
       .text(String(i + 1), X_NO + 2, rowY + 3, { width: COL_NO - 4, align: 'center' })

    // Nama Barang — isi baris pertama saja dengan cargo
    if (i < cargoLines.length) {
      doc.font('Helvetica').fontSize(8).fillColor(C_DARK)
         .text(cargoLines[i], X_NAMA + 3, rowY + 3, { width: COL_NAMA - 6, lineBreak: false })
    }
  }

  // --- Extra rows kanan bawah (Nama Sopir / No Pol) ---
  const fleetIsTbd = !sj.fleet || sj.fleet.is_tbd
  const platNomor  = fleetIsTbd ? '-' : (sj.fleet.plate_number || '-')
  const namaSopir  = sj.driver?.name || sj.driver_name_manual || '-'

  const EXTRA_START = TABLE_Y + ROW_H + TABLE_ROWS * ROW_H
  const PAD_V   = 5    // padding atas + bawah teks dalam sel
  const FONT_SZ = 8.5

  // Sub-kolom dalam RIGHT_W: label fixed 62pt | divider | nilai sisa
  const LBL_W = 62
  const VAL_W = RIGHT_W - LBL_W - 1   // -1 untuk garis pembatas
  const LEFT_W = COL_NO + COL_NAMA + COL_QTY

  // Hitung tinggi sel otomatis berdasarkan konten nilai terpanjang
  function cellHeight(value) {
    doc.font('Helvetica').fontSize(FONT_SZ)
    const textH = doc.heightOfString(value, { width: VAL_W - 8 })
    return Math.max(18, textH + PAD_V * 2)
  }

  // Helper: render satu baris extra dengan tinggi auto
  function extraRow(y, label, value, h) {
    const divX = X_RGT + LBL_W
    const textY = y + PAD_V

    // Sel kiri (kosong)
    doc.rect(X_NO, y, LEFT_W, h).strokeColor(C_BORDER).lineWidth(0.5).stroke()

    // Sel kanan — kotak luar
    doc.rect(X_RGT, y, RIGHT_W, h).strokeColor(C_BORDER).lineWidth(0.5).stroke()

    // Garis vertikal pemisah label | nilai
    vLine(doc, divX, y, y + h, 0.5)

    // Label — selalu satu baris, vertikal center
    const labelY = y + (h - FONT_SZ) / 2
    doc.font('Helvetica-Bold').fontSize(FONT_SZ).fillColor(C_DARK)
       .text(label, X_RGT + 4, labelY, { width: LBL_W - 8, lineBreak: false, ellipsis: true })

    // Nilai — bisa wrap, dibatasi lebar sel
    doc.font('Helvetica').fontSize(FONT_SZ).fillColor(C_DARK)
       .text(value, divX + 4, textY, { width: VAL_W - 8 })
  }

  // Hitung tinggi masing-masing baris sebelum render
  const hNamaSopir = cellHeight(namaSopir)
  const hNoPol     = cellHeight(platNomor)
  const hSpare     = 18

  const rNamaSopir = EXTRA_START
  const rNoPol     = rNamaSopir + hNamaSopir
  const rSpare     = rNoPol + hNoPol

  extraRow(rNamaSopir, 'Nama Sopir :', namaSopir, hNamaSopir)
  extraRow(rNoPol,     'No Pol :',     platNomor, hNoPol)

  // Baris spare kosong
  doc.rect(X_NO,  rSpare, LEFT_W,   hSpare).strokeColor(C_BORDER).lineWidth(0.5).stroke()
  doc.rect(X_RGT, rSpare, RIGHT_W,  hSpare).strokeColor(C_BORDER).lineWidth(0.5).stroke()
  vLine(doc, X_RGT + LBL_W, rSpare, rSpare + hSpare, 0.5)

  if (includeNotes && sj.internal_notes) {
    doc.font('Helvetica').fontSize(7).fillColor(C_GRAY)
       .text(sj.internal_notes, X_NO + 3, rSpare + 5,
             { width: LEFT_W - 6, lineBreak: false, ellipsis: true })
  }

  // ── 6. Tanda tangan ──────────────────────────────────────────────────────
  if (includeSign) {
    const SIG_Y = rSpare + hSpare + 6
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C_DARK)
       .text('Tanda Terima,', L + 4, SIG_Y, { width: W / 2, align: 'left' })
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C_DARK)
       .text('Hormat Kami,', L + W / 2, SIG_Y, { width: W / 2, align: 'right' })
  }
}

// ── PUBLIC: render ─────────────────────────────────────────────────────────
function render(doc, sj, company, options = {}) {
  // Salinan 1 — halaman pertama
  renderCopy(doc, sj, company, options, TOP_COPY_Y)

  // Salinan 2 — halaman baru
  doc.addPage()
  renderCopy(doc, sj, company, options, TOP_COPY_Y)
}

module.exports = { render }
