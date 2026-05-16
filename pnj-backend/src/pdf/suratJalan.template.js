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
const { formatDateShort, formatIDR } = require('./utils')

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
const COPY_H    = 410                             // tinggi setiap salinan (naik dari 390 untuk accommodate baris total)
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

// Warna background baris data tabel per salinan (index 0-based)
const COPY_ROW_BG = [null, '#FFFDE7', '#FCE4EC']   // copy1: putih, copy2: cream, copy3: pink

// ── Render satu salinan SJ ─────────────────────────────────────────────────
function renderCopy(doc, sj, company, options, Y0, copyIndex = 0) {
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

  // Kolom: No | Nama Barang | Qty & Satuan | Harga Satuan | Subtotal | [kanan: Sopir/Pol]
  const COL_NO       = 20
  const COL_NAMA     = 185
  const COL_QTY      = 55
  const COL_PRICE    = 72
  const COL_SUBTOTAL = 74
  const RIGHT_W      = W - COL_NO - COL_NAMA - COL_QTY - COL_PRICE - COL_SUBTOTAL  // ~93.28

  const TABLE_ROWS = 11

  // X positions
  const X_NO       = L
  const X_NAMA     = X_NO       + COL_NO
  const X_QTY      = X_NAMA     + COL_NAMA
  const X_PRICE    = X_QTY      + COL_QTY
  const X_SUBTOTAL = X_PRICE    + COL_PRICE
  const X_RGT      = X_SUBTOTAL + COL_SUBTOTAL   // start kolom kanan

  // --- Header row ---
  const MAIN_W = COL_NO + COL_NAMA + COL_QTY + COL_PRICE + COL_SUBTOTAL
  const rowBg  = COPY_ROW_BG[copyIndex] || null
  doc.rect(X_NO, TABLE_Y, MAIN_W, ROW_H).fillAndStroke(rowBg || C_HEAD_BG, C_BORDER)
  doc.rect(X_RGT, TABLE_Y, RIGHT_W, ROW_H).fillAndStroke(rowBg || C_HEAD_BG, C_BORDER)

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C_DARK)
  doc.text('No',           X_NO       + 2, TABLE_Y + 3, { width: COL_NO       - 4, align: 'center' })
  doc.text('Nama Barang',  X_NAMA     + 2, TABLE_Y + 3, { width: COL_NAMA     - 4, align: 'center' })
  doc.text('Qty & Satuan', X_QTY      + 2, TABLE_Y + 3, { width: COL_QTY      - 4, align: 'center' })
  doc.text('Harga Satuan', X_PRICE    + 2, TABLE_Y + 3, { width: COL_PRICE    - 4, align: 'right'  })
  doc.text('Subtotal',     X_SUBTOTAL + 2, TABLE_Y + 3, { width: COL_SUBTOTAL - 4, align: 'right'  })

  // --- Build row data ---
  // Pakai sj.items (array) kalau ada, fallback ke cargo_description split baris
  let rowData = []
  const hasItems = Array.isArray(sj.items) && sj.items.length > 0
  if (hasItems) {
    rowData = sj.items.map(item => ({
      nama:      item.description || '',
      qty:       item.qty ? `${item.qty} ${item.unit || ''}`.trim() : '',
      unitPrice: Number(item.unit_price) || 0,
      subtotal:  (Number(item.qty) || 0) * (Number(item.unit_price) || 0),
    }))
  } else {
    rowData = (sj.cargo_description || '').split('\n').filter(Boolean)
      .map(line => ({ nama: line, qty: '', unitPrice: 0, subtotal: 0 }))
  }

  const grandTotal = rowData.reduce((s, r) => s + r.subtotal, 0)

  for (let i = 0; i < TABLE_ROWS; i++) {
    const rowY = TABLE_Y + ROW_H + i * ROW_H
    if (rowBg) {
      doc.rect(X_NO, rowY, COL_NO + COL_NAMA + COL_QTY + COL_PRICE + COL_SUBTOTAL, ROW_H)
         .fillAndStroke(rowBg, C_BORDER)
      doc.rect(X_RGT, rowY, RIGHT_W, ROW_H).fillAndStroke(rowBg, C_BORDER)
      // vertical dividers kembali setelah fill
      ;[X_NAMA, X_QTY, X_PRICE, X_SUBTOTAL].forEach(x =>
        vLine(doc, x, rowY, rowY + ROW_H))
    } else {
      doc.rect(X_NO,       rowY, COL_NO,       ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_NAMA,     rowY, COL_NAMA,     ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_QTY,      rowY, COL_QTY,      ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_PRICE,    rowY, COL_PRICE,    ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_SUBTOTAL, rowY, COL_SUBTOTAL, ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_RGT,      rowY, RIGHT_W,      ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    }

    doc.font('Helvetica').fontSize(7.5).fillColor(C_DARK)
       .text(String(i + 1), X_NO + 2, rowY + 3, { width: COL_NO - 4, align: 'center' })

    if (i < rowData.length) {
      const r = rowData[i]
      doc.font('Helvetica').fontSize(7.5).fillColor(C_DARK)
         .text(r.nama, X_NAMA + 3, rowY + 3, { width: COL_NAMA - 6, lineBreak: false, ellipsis: true })
      if (r.qty) {
        doc.text(r.qty, X_QTY + 2, rowY + 3, { width: COL_QTY - 4, align: 'center', lineBreak: false })
      }
      if (r.unitPrice > 0) {
        doc.text(formatIDR(r.unitPrice), X_PRICE + 2, rowY + 3, { width: COL_PRICE - 4, align: 'right', lineBreak: false })
        doc.font('Helvetica-Bold')
           .text(formatIDR(r.subtotal), X_SUBTOTAL + 2, rowY + 3, { width: COL_SUBTOTAL - 4, align: 'right', lineBreak: false })
        doc.font('Helvetica')
      }
    }
  }

  // --- Baris total (di bawah data rows, sebelum extra rows) ---
  const TOTAL_ROW_Y = TABLE_Y + ROW_H + TABLE_ROWS * ROW_H
  doc.rect(X_NO,       TOTAL_ROW_Y, COL_NO + COL_NAMA + COL_QTY + COL_PRICE, ROW_H)
     .fillAndStroke(rowBg || C_HEAD_BG, C_BORDER)
  doc.rect(X_SUBTOTAL, TOTAL_ROW_Y, COL_SUBTOTAL, ROW_H)
     .fillAndStroke(rowBg || C_HEAD_BG, C_BORDER)
  doc.rect(X_RGT,      TOTAL_ROW_Y, RIGHT_W, ROW_H)
     .fillAndStroke(rowBg || C_HEAD_BG, C_BORDER)

  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C_DARK)
     .text('TOTAL', X_NO + 2, TOTAL_ROW_Y + 3, { width: COL_NO + COL_NAMA + COL_QTY + COL_PRICE - 4, align: 'right' })
  if (grandTotal > 0) {
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C_DARK)
       .text(formatIDR(grandTotal), X_SUBTOTAL + 2, TOTAL_ROW_Y + 3, { width: COL_SUBTOTAL - 4, align: 'right', lineBreak: false })
  }

  // --- Extra rows kanan bawah (Nama Sopir / No Pol) — stacked layout ---
  const fleetIsTbd = !sj.fleet || sj.fleet.is_tbd
  const platNomor  = fleetIsTbd ? '-' : (sj.fleet.plate_number || '-')
  const namaSopir  = sj.driver?.name || sj.driver_name_manual || '-'

  // +1 ROW_H untuk baris total yang baru ditambahkan
  const EXTRA_START = TABLE_Y + ROW_H + TABLE_ROWS * ROW_H + ROW_H
  const FONT_SZ = 8.5
  const LBL_H  = 14   // tinggi baris label
  const VAL_PAD = 4   // padding vertikal dalam value row
  const LEFT_W = COL_NO + COL_NAMA + COL_QTY + COL_PRICE + COL_SUBTOTAL

  // Render satu field stacked: [label row] + [value row], return total height
  function stackedRow(y, label, value) {
    doc.font('Helvetica').fontSize(FONT_SZ)
    const textH = doc.heightOfString(value, { width: RIGHT_W - 8 })
    const valH  = Math.max(LBL_H, textH + VAL_PAD * 2)

    // Baris label
    if (rowBg) {
      doc.rect(X_NO,  y, LEFT_W,  LBL_H).fillAndStroke(rowBg, C_BORDER)
      doc.rect(X_RGT, y, RIGHT_W, LBL_H).fillAndStroke(rowBg, C_BORDER)
    } else {
      doc.rect(X_NO,  y, LEFT_W,  LBL_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_RGT, y, RIGHT_W, LBL_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    }
    doc.font('Helvetica-Bold').fontSize(FONT_SZ).fillColor(C_DARK)
       .text(label, X_RGT + 4, y + (LBL_H - FONT_SZ) / 2, { width: RIGHT_W - 8, lineBreak: false })

    // Baris nilai
    const vY = y + LBL_H
    if (rowBg) {
      doc.rect(X_NO,  vY, LEFT_W,  valH).fillAndStroke(rowBg, C_BORDER)
      doc.rect(X_RGT, vY, RIGHT_W, valH).fillAndStroke(rowBg, C_BORDER)
    } else {
      doc.rect(X_NO,  vY, LEFT_W,  valH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      doc.rect(X_RGT, vY, RIGHT_W, valH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    }
    doc.font('Helvetica').fontSize(FONT_SZ).fillColor(C_DARK)
       .text(value, X_RGT + 4, vY + VAL_PAD, { width: RIGHT_W - 8 })

    return LBL_H + valH
  }

  const hNamaSopir = stackedRow(EXTRA_START, 'Nama Sopir :', namaSopir)
  const rNoPol     = EXTRA_START + hNamaSopir
  const hNoPol     = stackedRow(rNoPol, 'No Pol :', platNomor)
  const rSpare     = rNoPol + hNoPol
  const hSpare     = 18

  // Baris spare kosong
  if (rowBg) {
    doc.rect(X_NO,  rSpare, LEFT_W,  hSpare).fillAndStroke(rowBg, C_BORDER)
    doc.rect(X_RGT, rSpare, RIGHT_W, hSpare).fillAndStroke(rowBg, C_BORDER)
  } else {
    doc.rect(X_NO,  rSpare, LEFT_W,  hSpare).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    doc.rect(X_RGT, rSpare, RIGHT_W, hSpare).strokeColor(C_BORDER).lineWidth(0.5).stroke()
  }

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

// ── Lampiran foto + Foto Pengiriman (halaman terakhir) ───────────────────
function drawLampiranPage(doc, sj, company, options) {
  const L       = MARGIN_H
  const W       = COPY_W
  const GAP     = 10
  const IMG_PAD = 6

  const podBuffer      = options.podBuffer || null
  const lampiranBuffers = (options.lampiranBuffers || []).slice(0, 3)
  const hasAny = podBuffer || lampiranBuffers.length > 0
  if (!hasAny) return

  doc.addPage()

  // ── Header ringkas ────────────────────────────────────────────────────────
  const KOP_H  = 62
  const LOGO_S = 50
  doc.rect(L, TOP_COPY_Y, W, KOP_H).strokeColor(C_BORDER).lineWidth(0.8).stroke()
  drawLogo(doc, company, L + 4, TOP_COPY_Y + 6, LOGO_S)

  const infoX = L + LOGO_S + 8
  const infoW = W - LOGO_S - 12
  doc.font('Helvetica-Bold').fontSize(14).fillColor(C_DARK)
     .text(company.name || 'PT. PELANGI NUANSA JAYA', infoX, TOP_COPY_Y + 4, { width: infoW })
  const nameW = doc.widthOfString(company.name || 'PT. PELANGI NUANSA JAYA', { fontSize: 14 })
  hLine(doc, infoX, TOP_COPY_Y + 19, Math.min(nameW, infoW), 0.6, C_DARK)
  doc.font('Helvetica').fontSize(7.5).fillColor(C_DARK)
  if (company.address) doc.text(company.address, infoX, TOP_COPY_Y + 22, { width: infoW })

  // ── Judul ─────────────────────────────────────────────────────────────────
  const TITLE_Y = TOP_COPY_Y + KOP_H + 8
  doc.font('Helvetica-Bold').fontSize(12).fillColor(C_DARK)
     .text('LAMPIRAN FOTO SURAT JALAN', L, TITLE_Y, { width: W, align: 'center' })
  doc.font('Helvetica').fontSize(9).fillColor(C_GRAY)
     .text(sj.sj_number || '', L, TITLE_Y + 16, { width: W, align: 'center' })
  doc.fillColor(C_BLACK)
  hLine(doc, L, TITLE_Y + 30, W, 0.8)

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Gambar tinggi saat keduanya ada: lebih kompak
  const hasBoth  = podBuffer && lampiranBuffers.length > 0
  const IMG_H_LG = hasBoth ? 200 : 320  // tinggi gambar POD (solo: lebih besar)
  const IMG_H_SM = hasBoth ? 160 : 210  // tinggi gambar lampiran (solo: lebih besar)

  function sectionLabel(y, text) {
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C_GRAY)
       .text(text.toUpperCase(), L, y, { width: W })
    hLine(doc, L, y + 13, W, 0.4, C_GRAY)
    doc.fillColor(C_BLACK)
    return y + 20
  }

  function drawImageCell(buf, x, y, cw, ch) {
    doc.rect(x, y, cw, ch).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    try {
      doc.image(buf, x + IMG_PAD, y + IMG_PAD, {
        width:  cw - IMG_PAD * 2,
        height: ch - IMG_PAD * 2,
        fit:    [cw - IMG_PAD * 2, ch - IMG_PAD * 2],
        align:  'center',
        valign: 'center',
      })
    } catch (_) {
      doc.font('Helvetica').fontSize(8).fillColor(C_GRAY)
         .text('Gambar tidak dapat ditampilkan', x + 4, y + ch / 2 - 5,
               { width: cw - 8, align: 'center' })
      doc.fillColor(C_BLACK)
    }
  }

  let curY = TITLE_Y + 40

  // ── Section: Foto Pengiriman ──────────────────────────────────────────────
  if (podBuffer) {
    curY = sectionLabel(curY, 'Foto Pengiriman (Bukti Tiba)')
    const podW = hasBoth ? W * 0.55 : W
    const podX = L + (W - podW) / 2
    drawImageCell(podBuffer, podX, curY, podW, IMG_H_LG)
    curY += IMG_H_LG + (hasBoth ? 16 : 0)
  }

  // ── Section: Foto Lampiran ────────────────────────────────────────────────
  if (lampiranBuffers.length > 0) {
    curY = sectionLabel(curY, `Foto Lampiran (${lampiranBuffers.length} foto)`)

    const count  = lampiranBuffers.length
    const CELL_W = count === 1 ? W : (W - GAP) / 2
    const CELL_H = IMG_H_SM

    if (count === 1) {
      drawImageCell(lampiranBuffers[0], L, curY, CELL_W, CELL_H)
    } else {
      drawImageCell(lampiranBuffers[0], L,                curY, CELL_W, CELL_H)
      drawImageCell(lampiranBuffers[1], L + CELL_W + GAP, curY, CELL_W, CELL_H)
      if (count === 3) {
        const centerX = L + (W - CELL_W) / 2
        drawImageCell(lampiranBuffers[2], centerX, curY + CELL_H + GAP, CELL_W, CELL_H)
      }
    }
  }
}

// ── PUBLIC: render ─────────────────────────────────────────────────────────
/**
 * Render SJ rangkap N — tiap salinan di halaman terpisah (1 page = 1 table).
 *
 * options.copies        — jumlah rangkap (default 3)
 * options.copyLabel     — true → tambah watermark "Lembar X / N" tiap salinan
 * options.includeLampiran — true → tambah halaman lampiran foto di akhir (default true)
 * options.lampiranBuffers — array JPEG Buffer dari render.js (diisi otomatis)
 */
function render(doc, sj, company, options = {}) {
  const copies    = typeof options.copies === 'number' && options.copies > 0
    ? options.copies
    : 3

  for (let i = 0; i < copies; i++) {
    if (i > 0) doc.addPage()
    renderCopy(doc, sj, company, options, TOP_COPY_Y, i)

    // Opsional: label lembar di sudut kanan bawah
    if (options.copyLabel) {
      const labelText = `Lembar ${i + 1} / ${copies}`
      doc.font('Helvetica').fontSize(7).fillColor('#AAAAAA')
         .text(labelText, 0, PAGE_H - 18, { width: PAGE_W - MARGIN_H, align: 'right' })
      doc.fillColor(C_BLACK)
    }
  }

  // Halaman foto (POD + lampiran) di akhir dokumen, jika ada
  if (options.includeLampiran !== false &&
      (options.podBuffer || (Array.isArray(options.lampiranBuffers) && options.lampiranBuffers.length > 0))) {
    drawLampiranPage(doc, sj, company, options)
  }
}

module.exports = { render }
