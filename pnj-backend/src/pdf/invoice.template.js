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
const DELIVERY_ADDITIONAL_CHARGE_LABEL = 'Pembiayaan Lainnya'
const DEFAULT_DELIVERY_FLEET_LABELS = new Set(['Pengiriman', 'Lainnya'])
const COPY_ROW_BG = [null, '#FFFDE7', '#FCE4EC']

// ── Helper geometry ────────────────────────────────────────────────────────
function pageGeom(doc, ctx) {
  if (ctx?.geom) return ctx.geom
  const L = doc.page.margins.left
  const R = doc.page.width - doc.page.margins.right
  const W = R - L
  return { L, R, W }
}

// ── Layout "2 rangkap dalam 1 lembar" (mirip Surat Jalan) ────────────────
// Dipakai ketika invoice singkat (sedikit item) — rangkap 1 & 2 dicetak
// bertumpuk dalam satu halaman A4, rangkap selanjutnya (jika ada) di
// halaman baru dengan layout normal (1 rangkap / halaman).
const COMBO_GAP = 14
const COMBO_MAX_ROWS = 4 // ambang jumlah baris item agar layout combo dipakai

function comboGeom(doc) {
  const L = doc.page.margins.left
  const R = doc.page.width - doc.page.margins.right
  const W = R - L
  return { L, R, W }
}

function comboCopyHeight(doc) {
  const usableH = doc.page.height - doc.page.margins.top - doc.page.margins.bottom
  return (usableH - COMBO_GAP) / 2
}

// Estimasi tinggi konten satu copy dalam compact mode.
// Dipakai sebelum memutuskan combo agar tidak overflow setengah halaman.
function estimateCompactContentHeight(doc, invoice) {
  const items = invoice.items || []
  if (items.length === 0) return 0
  const rows = buildInvoiceTableRows(invoice, items)
  const PAD = 6
  const MIN_ROW = 22
  const COL_QTY = 55
  let tableH = 16 // header tabel
  doc.font('Helvetica').fontSize(8.5)
  for (const row of rows) {
    let hQtyEff
    if (row.hasQtyDivider) {
      const hMain  = row.qtyMainText  ? doc.heightOfString(row.qtyMainText,  { width: COL_QTY - PAD * 2 }) : 0
      const hUsage = row.qtyUsageText ? doc.heightOfString(row.qtyUsageText, { width: COL_QTY - PAD * 2 }) : 0
      hQtyEff = hMain + hUsage + PAD * 2
    } else {
      hQtyEff = row.qtyText ? doc.heightOfString(row.qtyText, { width: COL_QTY - PAD * 2 }) : 0
    }
    tableH += Math.max(MIN_ROW, hQtyEff + PAD * 2)
  }
  tableH += 10 // spacer bawah tabel
  // 272 = perkiraan overhead kompak (aktual ~250pt + sigH 65pt) + 7pt safety margin
  return 272 + tableH
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

function formatRentalDuration(item) {
  const parts = [
    [item.rental_duration_years, 'Tahun'],
    [item.rental_duration_months, 'Bulan'],
    [item.rental_duration_days, 'Hari'],
    [item.rental_duration_hours, 'Jam'],
  ]
    .filter(([value]) => Number(value || 0) > 0)
    .map(([value, label]) => `${Number(value)} ${label}`)

  return parts.length > 0 ? parts.join(' ') : ''
}

// ── Metode Pembayaran ─────────────────────────────────────────────────────
/**
 * Format baris "Metode Pembayaran" sesuai invoice.payment_method:
 *  - 'transfer' → "Transfer Ke No Rek <bank> : <no.rek> a/n <pemilik>"
 *    (data diambil dari bank_account terkait invoice; fallback ke
 *    pengaturan rekening perusahaan jika invoice tidak punya bank_account)
 *  - 'cash'     → "Tunai"
 *  - 'check'    → "Cek / Giro"
 */
function formatPaymentMethod(invoice, company) {
  const method = invoice.payment_method || 'transfer'

  if (method === 'cash') return 'Tunai'
  if (method === 'check') return 'Cek / Giro'

  // transfer (default)
  const acc = invoice.bank_account || invoice.bank_acc || null
  const bankName   = acc?.bank_name      || company?.bank?.name   || ''
  const accNumber  = acc?.account_number || company?.bank?.account || '-'
  const accHolder  = acc?.account_holder || company?.bank?.holder || company?.name || '-'
  return `Transfer Ke No Rek ${bankName} : ${accNumber} a/n ${accHolder}`
}

function formatPricePerUnit(item) {
  if (Number(item.unit_price || 0) <= 0) return ''
  return `${formatIDR(item.unit_price)} / ${item.unit || 'Unit'}`
}

function formatLineSubtotal(item) {
  if (Number(item.subtotal || 0) <= 0) return ''
  return formatIDR(item.subtotal)
}

function deliveryPriceQty(item) {
  return Number(item.qty || 0)
}

function deliveryPriceUnit(item) {
  return item.unit || 'Unit'
}

function formatDeliveryPricePerUnit(item) {
  if (Number(item.unit_price || 0) <= 0) return ''
  return `${formatIDR(item.unit_price)} / ${deliveryPriceUnit(item)}`
}

function formatDeliveryLineSubtotal(item) {
  const calculated = deliveryPriceQty(item) * Number(item.unit_price || 0)
  const subtotal = calculated > 0 ? calculated : Number(item.subtotal || 0)
  if (subtotal <= 0) return ''
  return formatIDR(subtotal)
}

function formatAdditionalChargeLabel(item) {
  const description = String(item.description || DELIVERY_ADDITIONAL_CHARGE_LABEL)
    .trim()
    .replace(/\s*:$/, '')
    .replace(/\s+\(([^)]+)\)\s*$/, '\n($1)')
  return `${description} :`
}

function formatAdditionalChargeAmount(item) {
  const amount = Number(item.subtotal || item.unit_price || 0)
  return amount > 0 ? formatIDR(amount) : ''
}

function formatCargoQty(item) {
  const qty = item.cargo_qty === null || item.cargo_qty === undefined
    ? item.qty
    : item.cargo_qty
  const unit = item.cargo_unit || item.unit || 'Unit'
  return `${formatQty(qty || 0)} ${unit}`
}

function isDeliveryAdditionalCharge(item) {
  return item.fleet_label === DELIVERY_ADDITIONAL_CHARGE_LABEL &&
    Number(item.unit_price || 0) > 0 &&
    (item.cargo_qty === null || item.cargo_qty === undefined)
}

function effectiveServiceType(invoice) {
  if (invoice.service_type === 'rental') return 'rental'
  if (invoice.service_type === 'other') {
    const name = String(invoice.custom_service_name || '').toLowerCase()
    if (name.includes('penyewaan') || name.includes('sewa')) return 'rental'
    if (name.includes('pengiriman')) return 'delivery'
  }
  return 'delivery'
}

function isShipmentPricingOnlyRow(item, invoice) {
  return invoice.delivery_pricing_mode !== 'item' &&
    Number(item.unit_price || 0) > 0 &&
    (item.cargo_qty === null || item.cargo_qty === undefined) &&
    (item.cargo_weight === null || item.cargo_weight === undefined) &&
    (item.cargo_volume === null || item.cargo_volume === undefined) &&
    !item.cargo_notes
}

function serviceName(invoice) {
  if (effectiveServiceType(invoice) === 'rental' && invoice.service_type !== 'other') return 'Jasa Penyewaan'
  if (invoice.service_type === 'other') return invoice.custom_service_name || 'Jasa Lainnya'
  return 'Jasa Pengiriman'
}

function serviceRemark(invoice) {
  return `Tagihan Biaya ${serviceName(invoice)}.`
}

function isDeliveryItemPricing(invoice) {
  return effectiveServiceType(invoice) !== 'rental' && invoice.delivery_pricing_mode === 'item'
}

function findAttachedSjForItem(invoice, item) {
  const attached = getAttachedSJs(invoice)
  if (!Array.isArray(attached) || attached.length === 0) return null
  if (item.source_sj_id) {
    const match = attached.find(sj => Number(sj.id) === Number(item.source_sj_id))
    if (match) return match
  }
  return attached.length === 1 ? attached[0] : null
}

function getAttachedSJs(invoice) {
  return invoice.attachedSJs || invoice.attached_sj || []
}

function uniqueNonEmpty(values) {
  return [...new Set(values.map(v => String(v || '').trim()).filter(Boolean))]
}

function getAttachedSjNumbers(invoice) {
  const manualNumbers = String(invoice.manual_sj_numbers || '')
    .split(/[,;\n]+/)
    .map(value => value.trim())
  return uniqueNonEmpty([...getAttachedSJs(invoice).map(sj => sj.sj_number), ...manualNumbers])
}

function qtyNoteText(item, invoice) {
  // Untuk invoice penyewaan, kolom Qty hanya menampilkan qty unit + durasi
  // pemakaian — teks catatan/keterangan tidak ditampilkan di sini.
  if (effectiveServiceType(invoice) === 'rental') return ''
  return String(item.cargo_notes || '').trim()
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

function deliveryRouteText(invoice, items) {
  if (invoice.origin || invoice.destination) {
    return `Rute Pengiriman :\n${invoice.origin || '-'} - ${invoice.destination || '-'}`
  }
  const deliveryItems = items
    .filter(item => !isDeliveryAdditionalCharge(item))
    .filter(item => !isShipmentPricingOnlyRow(item, invoice))
  const routes = uniqueNonEmpty(deliveryItems.map(item => {
    const sj = findAttachedSjForItem(invoice, item)
    if (!sj?.origin && !sj?.destination) return ''
    return `${sj.origin || '-'} - ${sj.destination || '-'}`
  }))
  return routes.length > 0 ? `Rute Pengiriman :\n${routes.join(', ')}` : ''
}

// Nama supir untuk item — utamakan master supir (item.driver.name), fallback ke
// nama manual (driver_name_manual). Dipakai untuk menempel nama supir di
// belakang label armada, mis. "B 9219 SFA ( Pahrudin )".
function driverNameForItem(item) {
  return String(item.driver?.name || item.driver_name_manual || '').trim()
}

// Bangun entri armada unik dalam bentuk "fleet_label ( nama supir )". Jika item
// tidak punya supir, hanya label armada yang ditampilkan. Dedup memperhitungkan
// pasangan armada+supir sehingga satu armada dengan dua supir berbeda tetap
// muncul dua baris.
function meaningfulFleetLabels(items, invoice) {
  const ignoredLabels = new Set([...DEFAULT_DELIVERY_FLEET_LABELS, invoice.custom_service_name].filter(Boolean))
  return uniqueNonEmpty(items
    .filter(item => item.fleet_label && !ignoredLabels.has(item.fleet_label))
    .map(item => {
      const driver = driverNameForItem(item)
      return driver ? `${item.fleet_label} ( ${driver} )` : item.fleet_label
    }))
}

function buildDeliveryInfoRows(invoice, items) {
  const deliveryItems = items
    .filter(item => !isDeliveryAdditionalCharge(item))
    .filter(item => !isShipmentPricingOnlyRow(item, invoice))
  const manualItems = deliveryItems.filter(item => !item.source_sj_id)
  const manualFleetLabels = meaningfulFleetLabels(manualItems, invoice)
  const fleets = manualFleetLabels.length > 0
    ? manualFleetLabels
    : meaningfulFleetLabels(deliveryItems, invoice)
  const rows = []
  if (fleets.length > 0) {
    rows.push({ noText: '', descText: `Armada :\n${fleets.join(', ')}`, isInfoRow: true })
  }
  return rows
}

function buildInvoiceTableRows(invoice, items) {
  if (effectiveServiceType(invoice) === 'rental') {
    return items.map((item, idx) => {
      const durationText = formatRentalDuration(item)
      const noteText = qtyNoteText(item, invoice)
      const rentedUnitQty = item.cargo_qty === null || item.cargo_qty === undefined
        ? item.qty || 1
        : item.cargo_qty
      const qtyMainText = `${formatQty(rentedUnitQty)} unit`
      const qtyUsageText = [durationText ? `${durationText}\nPemakaian` : '', noteText].filter(Boolean).join('\n\n')
      return {
        noText:  String(idx + 1),
        descText: buildRentalDescription(item),
        qtyText: [qtyMainText, qtyUsageText].filter(Boolean).join('\n'),
        qtyMainText,
        qtyUsageText,
        hasQtyDivider: Boolean(qtyUsageText),
        hrgText: formatPricePerUnit(item),
        jmlText: formatLineSubtotal(item),
      }
    })
  }

  const deliveryItems = items.filter(item => !isDeliveryAdditionalCharge(item))
  const shipmentPricingItem = !isDeliveryItemPricing(invoice)
    ? deliveryItems.find(item => Number(item.subtotal || 0) > 0 || Number(item.unit_price || 0) > 0)
    : null
  const cargoItems = isDeliveryItemPricing(invoice)
    ? deliveryItems
    : deliveryItems.filter(item => !isShipmentPricingOnlyRow(item, invoice))
  const additionalChargeRows = items
    .filter(isDeliveryAdditionalCharge)
    .map(item => ({
      noText: '',
      descText: '',
      qtyText: '',
      hrgText: formatAdditionalChargeLabel(item),
      jmlText: formatAdditionalChargeAmount(item),
      isAdditionalChargeRow: true,
    }))
  const itemRows = cargoItems.map((item, idx) => {
    const noteText = qtyNoteText(item, invoice)
    const qtyMainText = [formatCargoQty(item), noteText].filter(Boolean).join('\n\n')
    const weightParts = []
    if (Number(item.cargo_weight || 0) > 0) weightParts.push(`${formatQty(item.cargo_weight)} kg`)
    if (Number(item.cargo_volume || 0) > 0) weightParts.push(`${formatQty(item.cargo_volume)} m3`)
    const qtySubText = weightParts.join('\n\n')
    const hasQtyDivider = Boolean(qtySubText)
    return {
      noText:  String(idx + 1),
      descText: item.description || item.cargo_notes || '-',
      qtyText: hasQtyDivider ? [qtyMainText, qtySubText].filter(Boolean).join('\n') : qtyMainText,
      qtyMainText: hasQtyDivider ? qtyMainText : undefined,
      qtyUsageText: hasQtyDivider ? qtySubText : undefined,
      hasQtyDivider,
      hrgText: isDeliveryItemPricing(invoice)
        ? formatDeliveryPricePerUnit(item)
        : idx === 0 && shipmentPricingItem ? formatPricePerUnit(shipmentPricingItem) : '',
      jmlText: isDeliveryItemPricing(invoice)
        ? formatDeliveryLineSubtotal(item)
        : idx === 0 && shipmentPricingItem ? formatLineSubtotal(shipmentPricingItem) : '',
    }
  })
  if (!isDeliveryItemPricing(invoice) && itemRows.length === 0 && shipmentPricingItem) {
    itemRows.push({
      noText: '1',
      descText: '',
      qtyText: '',
      hrgText: formatPricePerUnit(shipmentPricingItem),
      jmlText: formatLineSubtotal(shipmentPricingItem),
    })
  }
  return [...itemRows, ...additionalChargeRows, ...buildDeliveryInfoRows(invoice, items)]
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
function drawHeader(doc, company, options, ctx = null) {
  const { L, R, W } = pageGeom(doc, ctx)
  const topY = ctx?.startY ?? doc.page.margins.top
  const compact = !!ctx?.compact

  const LOGO_SIZE  = compact ? 48 : 64
  const NAME_FSZ   = compact ? 13 : 16
  const DETAIL_FSZ = compact ? 7 : 8
  const INFO_X    = L + LOGO_SIZE + 10
  const INFO_W    = W - LOGO_SIZE - 10

  // Border atas
  hRule(doc, L, topY, W, C_BORDER, compact ? 1 : 1.2)

  if (options.includeLogo !== false) {
    drawLogo(doc, company, L, topY + 4, LOGO_SIZE)
  }

  // Info perusahaan
  const infoStartY = topY + 2
  doc.font('Helvetica-Bold').fontSize(NAME_FSZ).fillColor(C_DARK)
     .text(company.name || 'PT. PELANGI NUANSA JAYA', INFO_X, infoStartY, { width: INFO_W })

  doc.font('Helvetica').fontSize(DETAIL_FSZ).fillColor(C_DARK)
  if (company.address) {
    doc.text(company.address, INFO_X, doc.y + 1, { width: INFO_W })
  }
  if (company.website) {
    doc.font('Helvetica-Oblique').fontSize(DETAIL_FSZ)
       .text(`Website : ${company.website}`, INFO_X, doc.y + 1, { width: INFO_W })
    doc.font('Helvetica')
  }
  const contactParts = []
  if (company.phone) contactParts.push(`Phone : ${company.phone}`)
  if (company.email) contactParts.push(`email : ${company.email}`)
  if (contactParts.length) {
    doc.font('Helvetica').fontSize(DETAIL_FSZ)
       .text(contactParts.join(' - '), INFO_X, doc.y + 1, { width: INFO_W })
  }

  const headerBottom = Math.max(topY + LOGO_SIZE + 6, doc.y + 4)

  // Border bawah kop
  hRule(doc, L, headerBottom, W, C_BORDER, compact ? 1 : 1.2)

  return headerBottom + (compact ? 5 : 6)
}

// ── 2. Bar Info Dokumen ────────────────────────────────────────────────────
function drawDocInfoBar(doc, invoice, startY, ctx = null) {
  const { L, W } = pageGeom(doc, ctx)
  const compact = !!ctx?.compact

  const noText      = `No : ${invoice.invoice_number || '-'}`
  const tglText     = `Tanggal :${formatDateShort(invoice.invoice_date)}`
  const labelText   = 'Invoice'
  const barH        = compact ? 18 : 22

  // Background putih, border bawah
  hRule(doc, L, startY + barH, W, C_BORDER, 0.8)

  // "No :"
  doc.font('Helvetica-Bold').fontSize(compact ? 9 : 10).fillColor(C_DARK)
     .text(noText, L, startY + (compact ? 4 : 5), { width: W / 3, align: 'left' })

  // "Tanggal :"
  doc.font('Helvetica-Bold').fontSize(compact ? 9 : 10).fillColor(C_DARK)
     .text(tglText, L + W / 3, startY + (compact ? 4 : 5), { width: W / 3, align: 'center' })

  // "Invoice" label besar kanan
  doc.font('Helvetica-Bold').fontSize(compact ? 14 : 16).fillColor(C_DARK)
     .text(labelText, L + (W * 2 / 3), startY + (compact ? 1 : 2), { width: W / 3, align: 'right' })

  return startY + barH + (compact ? 6 : 8)
}

// ── 3. Kepada + No Kontrak ────────────────────────────────────────────────
function drawRecipientBlock(doc, invoice, startY, ctx = null) {
  const { L, W } = pageGeom(doc, ctx)
  const compact = !!ctx?.compact
  const fsz = compact ? 8.5 : 9
  const colW = W / 2
  const rightX = L + colW
  const sjNumbers = getAttachedSjNumbers(invoice)
  const sjText = sjNumbers.length > 0 ? `No SJ : ${sjNumbers.join(', ')}` : ''

  let y = startY

  // Kepada (kiri)
  doc.font('Helvetica-Bold').fontSize(fsz).fillColor(C_DARK)
     .text('Kepada :', L, y)
  y = doc.y
  doc.font('Helvetica-Bold').fontSize(fsz).fillColor(C_DARK)
     .text(invoice.customer?.name || '-', L, y)
  const customerNameY = y
  y = doc.y

  if (sjText) {
    doc.font('Helvetica').fontSize(fsz).fillColor(C_DARK)
       .text(sjText, rightX, customerNameY, { width: colW, align: 'right' })
  }

  // No Kontrak (kanan) — ditulis di baris pertama sejajar "Kepada :"
  if (invoice.project?.contract_number || invoice.project?.code) {
    const contractNo = invoice.project.contract_number || invoice.project.code
    doc.font('Helvetica').fontSize(fsz).fillColor(C_DARK)
       .text(`No Kontrak : ${contractNo}`, rightX, startY, { width: colW, align: 'right' })
  }

  return Math.max(doc.y, y) + (compact ? 6 : 8)
}

// ── 4. Tabel Item ─────────────────────────────────────────────────────────
/**
 * Kolom: No | Deskripsi | Keterangan | Qty | Harga | Jumlah
 * Satu baris per item, tinggi baris auto-fit berdasarkan konten terpanjang.
 */
function drawItemTable(doc, invoice, startY, copyIndex = 0, ctx = null) {
  const { L, W } = pageGeom(doc, ctx)
  const compact = !!ctx?.compact
  const rowBg = COPY_ROW_BG[copyIndex] || null

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
  const KET_FONT_SZ = 7.2
  const PAD      = 6    // padding horizontal & vertical dalam sel
  const MIN_ROW  = 22   // tinggi baris minimum

  const HEADER_H = compact ? 16 : 18
  let y = startY

  function drawTableHeader(headerY) {
    doc.rect(L, headerY, W, HEADER_H).fillAndStroke(rowBg || C_HEAD_BG, C_BORDER)
    doc.font('Helvetica-Bold').fontSize(FONT_SZ).fillColor(C_DARK)
    ;[
      { label: 'No',         x: X_NO,   w: COL_NO,    align: 'center' },
      { label: 'Deskripsi',  x: X_DESC, w: COL_DESC,  align: 'center' },
      { label: 'Keterangan', x: X_KET,  w: COL_KET,   align: 'center' },
      { label: 'Qty',        x: X_QTY,  w: COL_QTY,   align: 'center' },
      { label: 'Harga',      x: X_HRG,  w: COL_HARGA, align: 'center' },
      { label: 'Jumlah',     x: X_JML,  w: COL_JML,   align: 'center' },
    ].forEach(h => doc.text(h.label, h.x + 2, headerY + 5, { width: h.w - 4, align: h.align }))
    return headerY + HEADER_H
  }

  function drawPageContinuationHeader() {
    doc.addPage()
    return drawTableHeader(doc.page.margins.top)
  }

  y = drawTableHeader(y)

  // ── Item rows ─────────────────────────────────────────────────────────────
  const items = invoice.items || []

  if (items.length === 0) {
    const rowH = 24
    if (rowBg) {
      doc.rect(L, y, W, rowH).fillAndStroke(rowBg, C_BORDER)
    } else {
      borderRect(doc, L, y, W, rowH)
    }
    doc.font('Helvetica').fontSize(FONT_SZ).fillColor(C_GRAY)
       .text('(tidak ada item)', L + 2, y + 7, { width: W - 4, align: 'center' })
    y += rowH
  } else {
    const routeText = effectiveServiceType(invoice) === 'rental' ? '' : deliveryRouteText(invoice, items)
    const ketParts = [serviceRemark(invoice), routeText].filter(Boolean)
    const ketText = ketParts.join('\n\n')
    doc.font('Helvetica').fontSize(KET_FONT_SZ)
    const ketContentW = COL_KET - PAD * 2
    const ketPartHeights = ketParts.map(part => doc.heightOfString(part, { width: ketContentW, align: 'center' }))
    const hKet = ketParts.length > 1
      ? ketPartHeights.reduce((sum, h) => sum + h, 0) + PAD * 3
      : doc.heightOfString(ketText, { width: ketContentW, align: 'center' })
    doc.font('Helvetica').fontSize(FONT_SZ)
    const itemRows = buildInvoiceTableRows(invoice, items).map((row) => {
      const hNo   = doc.heightOfString(row.noText || '', { width: COL_NO - 4 })
      const hDesc = doc.heightOfString(row.descText || '', { width: COL_DESC - PAD * 2 })
      const hQty  = doc.heightOfString(row.qtyText || '', { width: COL_QTY - PAD * 2 })
      const hHrg  = doc.heightOfString(row.hrgText || '', { width: COL_HARGA - PAD * 2 })
      const hJml  = doc.heightOfString(row.jmlText || '', { width: COL_JML - PAD * 2 })
      // Untuk divider rows, ruang yang dibutuhkan = PAD + hMain + PAD + PAD + hUsage + PAD
      // (PAD ekstra untuk gap di atas dan bawah garis divider)
      const hQtyEff = row.hasQtyDivider
        ? doc.heightOfString(row.qtyMainText || '', { width: COL_QTY - PAD * 2 }) +
          doc.heightOfString(row.qtyUsageText || '', { width: COL_QTY - PAD * 2 }) +
          PAD * 2
        : hQty
      return {
        ...row,
        heights: { no: hNo, desc: hDesc, qty: hQty, hrg: hHrg, jml: hJml },
        rowH:    Math.max(MIN_ROW, hNo + PAD * 2, hDesc + PAD * 2, hQtyEff + PAD * 2, hHrg + PAD * 2, hJml + PAD * 2),
      }
    })
    const mergePriceColumns = effectiveServiceType(invoice) !== 'rental' && !isDeliveryItemPricing(invoice)

    function drawRowsBlock(rows, blockStartY) {
      const detailRowsH = rows.reduce((sum, row) => sum + row.rowH, 0)
      const blockH = Math.max(detailRowsH, hKet + PAD * 2)
      const ketSplit = ketParts.length > 1
        ? (() => {
            const halfH = blockH / 2
            return { upperBoxH: halfH, lowerBoxH: halfH }
          })()
        : null

      if (ketSplit) {
        if (rowBg) {
          doc.rect(X_KET, blockStartY, COL_KET, blockH).fill(rowBg)
        }
      } else if (rowBg) {
        doc.rect(X_KET, blockStartY, COL_KET, blockH).fill(rowBg)
      }
      if (mergePriceColumns) {
        const mergeRowsH = rows.reduce((sum, row) => row.isInfoRow || row.isAdditionalChargeRow ? sum : sum + row.rowH, 0)
        const hasNonMergedRows = rows.some(row => row.isInfoRow || row.isAdditionalChargeRow)
        const mergedBlockH = hasNonMergedRows ? mergeRowsH : blockH
        const mergedHrgText = rows.find(row => row.hrgText && !row.isAdditionalChargeRow)?.hrgText || ''
        const mergedJmlText = rows.find(row => row.jmlText && !row.isAdditionalChargeRow)?.jmlText || ''
        const hMergedHrg = doc.heightOfString(mergedHrgText, { width: COL_HARGA - PAD * 2 })
        const hMergedJml = doc.heightOfString(mergedJmlText, { width: COL_JML - PAD * 2 })

        if (mergedBlockH > 0) {
          if (rowBg) {
            doc.rect(X_HRG, blockStartY, COL_HARGA, mergedBlockH).fillAndStroke(rowBg, C_BORDER)
            doc.rect(X_JML, blockStartY, COL_JML, mergedBlockH).fillAndStroke(rowBg, C_BORDER)
          } else {
            doc.rect(X_HRG, blockStartY, COL_HARGA, mergedBlockH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
            doc.rect(X_JML, blockStartY, COL_JML, mergedBlockH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
          }
          doc.font('Helvetica').fillColor(C_DARK)
          doc.text(mergedHrgText, X_HRG + PAD, blockStartY + Math.max(PAD, (mergedBlockH - hMergedHrg) / 2), { width: COL_HARGA - PAD * 2, align: 'right' })
          doc.text(mergedJmlText, X_JML + PAD, blockStartY + Math.max(PAD, (mergedBlockH - hMergedJml) / 2), { width: COL_JML - PAD * 2, align: 'right' })
        }
      }

      const centerY = (height) => blockStartY + Math.max(PAD, (blockH - height) / 2)
      doc.font('Helvetica').fontSize(KET_FONT_SZ).fillColor(C_DARK)
      if (ketSplit) {
        const dividerY = blockStartY + ketSplit.upperBoxH
        const upperTextY = blockStartY + Math.max(PAD, (ketSplit.upperBoxH - ketPartHeights[0]) / 2)
        const lowerTextY = dividerY + Math.max(PAD, (ketSplit.lowerBoxH - ketPartHeights[1]) / 2)
        doc.text(ketParts[0], X_KET + PAD, upperTextY, { width: ketContentW, align: 'center' })
        doc.font('Helvetica').fontSize(KET_FONT_SZ).fillColor(C_DARK)
        doc.text(ketParts[1], X_KET + PAD, lowerTextY, { width: ketContentW, align: 'center' })
      } else {
        doc.text(ketText, X_KET + PAD, centerY(hKet), { width: ketContentW, align: 'center' })
      }
      doc.font('Helvetica').fontSize(FONT_SZ).fillColor(C_DARK)

      let rowY = blockStartY
      rows.forEach((row) => {
        const textY = (height) => rowY + Math.max(PAD, (row.rowH - height) / 2)
        const drawQtyCellText = () => {
          doc.font('Helvetica').fontSize(FONT_SZ).fillColor(C_DARK)
          if (!row.hasQtyDivider) {
            doc.text(row.qtyText || '', X_QTY + PAD, textY(row.heights.qty), { width: COL_QTY - PAD * 2, align: 'center' })
            return
          }

          const qtyWidth = COL_QTY - PAD * 2
          const hMain = doc.heightOfString(row.qtyMainText || '', { width: qtyWidth, align: 'center' })
          const hUsage = doc.heightOfString(row.qtyUsageText || '', { width: qtyWidth, align: 'center' })
          const minDividerY = rowY + PAD + hMain + 2
          const preferredDividerY = rowY + PAD + hMain + PAD
          const maxDividerY = rowY + row.rowH - PAD - hUsage - PAD
          const dividerY = Math.max(minDividerY, Math.min(maxDividerY, preferredDividerY))
          const lowerY = dividerY + PAD
          doc.text(row.qtyMainText || '', X_QTY + PAD, rowY + PAD, { width: qtyWidth, align: 'center' })
          doc.moveTo(X_QTY, dividerY).lineTo(X_QTY + COL_QTY, dividerY).strokeColor(C_BORDER).lineWidth(0.5).stroke()
          doc.font('Helvetica').fontSize(FONT_SZ).fillColor(C_DARK)
          doc.text(row.qtyUsageText || '', X_QTY + PAD, lowerY, { width: qtyWidth, align: 'center' })
        }
        if (rowBg) {
          doc.rect(X_NO, rowY, COL_NO, row.rowH).fillAndStroke(rowBg, C_BORDER)
          doc.rect(X_DESC, rowY, COL_DESC, row.rowH).fillAndStroke(rowBg, C_BORDER)
          doc.rect(X_QTY, rowY, COL_QTY, row.rowH).fillAndStroke(rowBg, C_BORDER)
        } else {
          doc.rect(X_NO, rowY, COL_NO, row.rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
          doc.rect(X_DESC, rowY, COL_DESC, row.rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
          doc.rect(X_QTY, rowY, COL_QTY, row.rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
        }
        if (!mergePriceColumns || row.isInfoRow || row.isAdditionalChargeRow) {
          if (rowBg) {
            doc.rect(X_HRG, rowY, COL_HARGA, row.rowH).fillAndStroke(rowBg, C_BORDER)
            doc.rect(X_JML, rowY, COL_JML, row.rowH).fillAndStroke(rowBg, C_BORDER)
          } else {
            doc.rect(X_HRG, rowY, COL_HARGA, row.rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
            doc.rect(X_JML, rowY, COL_JML, row.rowH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
          }
        }
        doc.font('Helvetica').fontSize(FONT_SZ).fillColor(C_DARK)
        doc.text(row.noText || '', X_NO + 2, textY(row.heights.no), { width: COL_NO - 4, align: 'center', lineBreak: false })
        doc.text(row.descText || '', X_DESC + PAD, textY(row.heights.desc), { width: COL_DESC - PAD * 2 })
        drawQtyCellText()
        doc.font('Helvetica').fontSize(FONT_SZ).fillColor(C_DARK)
        if (!mergePriceColumns || row.isInfoRow || row.isAdditionalChargeRow) {
          doc.text(row.hrgText || '', X_HRG + PAD, textY(row.heights.hrg), { width: COL_HARGA - PAD * 2, align: 'right' })
          doc.text(row.jmlText || '', X_JML + PAD, textY(row.heights.jml), { width: COL_JML - PAD * 2, align: 'right' })
        }
        rowY += row.rowH
      })
      if (rowY < blockStartY + blockH) {
        const fillerH = blockStartY + blockH - rowY
        if (rowBg) {
          doc.rect(X_NO, rowY, COL_NO, fillerH).fillAndStroke(rowBg, C_BORDER)
          doc.rect(X_DESC, rowY, COL_DESC, fillerH).fillAndStroke(rowBg, C_BORDER)
          doc.rect(X_QTY, rowY, COL_QTY, fillerH).fillAndStroke(rowBg, C_BORDER)
        } else {
          doc.rect(X_NO, rowY, COL_NO, fillerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
          doc.rect(X_DESC, rowY, COL_DESC, fillerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
          doc.rect(X_QTY, rowY, COL_QTY, fillerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
        }
        if (!mergePriceColumns || rows.some(row => row.isInfoRow || row.isAdditionalChargeRow)) {
          if (rowBg) {
            doc.rect(X_HRG, rowY, COL_HARGA, fillerH).fillAndStroke(rowBg, C_BORDER)
            doc.rect(X_JML, rowY, COL_JML, fillerH).fillAndStroke(rowBg, C_BORDER)
          } else {
            doc.rect(X_HRG, rowY, COL_HARGA, fillerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
            doc.rect(X_JML, rowY, COL_JML, fillerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
          }
        }
      }
      if (ketSplit) {
        const dividerY = blockStartY + ketSplit.upperBoxH
        doc.rect(X_KET, blockStartY, COL_KET, blockH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
        doc.moveTo(X_KET, dividerY).lineTo(X_KET + COL_KET, dividerY).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      } else {
        doc.rect(X_KET, blockStartY, COL_KET, blockH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
      }
      return blockStartY + blockH
    }

    const pageBottom = () => compact && ctx?.maxY != null
      ? ctx.maxY
      : doc.page.height - doc.page.margins.bottom - 18
    let pageRows = []
    let pageRowsH = 0

    for (const row of itemRows) {
      const nextRowsH = pageRowsH + row.rowH
      const nextBlockH = Math.max(nextRowsH, hKet + PAD * 2)
      if (pageRows.length > 0 && y + nextBlockH > pageBottom()) {
        y = drawRowsBlock(pageRows, y)
        y = drawPageContinuationHeader()
        pageRows = []
        pageRowsH = 0
      }
      pageRows.push(row)
      pageRowsH += row.rowH
    }

    if (pageRows.length > 0) {
      y = drawRowsBlock(pageRows, y)
    }
  }

  // Baris spacer bawah tabel
  const spacerH = compact ? 10 : 14
  if (!compact && y + spacerH > doc.page.height - doc.page.margins.bottom) {
    y = drawPageContinuationHeader()
  }
  if (rowBg) {
    doc.rect(L, y, W, spacerH).fillAndStroke(rowBg, C_BORDER)
  } else {
    doc.rect(L, y, W, spacerH).strokeColor(C_BORDER).lineWidth(0.5).stroke()
  }
  y += spacerH

  return y
}

// ── 5. Footer: Pembayaran + Totals ────────────────────────────────────────
function drawFooter(doc, invoice, company, startY, ctx = null) {
  const { L, R, W } = pageGeom(doc, ctx)
  const compact = !!ctx?.compact

  const COL_LEFT_W  = W * 0.55
  const COL_RIGHT_W = W - COL_LEFT_W
  const RIGHT_X     = L + COL_LEFT_W
  const PAD         = compact ? 3 : 4

  let leftY  = startY + PAD
  let rightY = startY + PAD

  const FSZ = compact ? 8.5 : 9

  // ── Kiri: Metode Pembayaran ──────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(FSZ).fillColor(C_DARK)
     .text('Metode Pembayaran :', L, leftY)
  leftY = doc.y + 2
  doc.font('Helvetica').fontSize(FSZ).fillColor(C_DARK)
  doc.text(formatPaymentMethod(invoice, company), L, leftY, { width: COL_LEFT_W - PAD })
  leftY = doc.y + (compact ? 3 : 4)

  doc.font('Helvetica-Bold').fontSize(FSZ).fillColor(C_DARK)
     .text('Note :', L, leftY)
  leftY = doc.y + 2
  // Catatan internal (invoice.notes) tidak ditampilkan di PDF — hanya pesan
  // standar pembayaran.
  const noteText = 'Setelah Pembayaran dilakukan, mohon kirimkan bukti transfer ke email kami atau hubungi admin kami melalui WhatsApp'
  doc.font('Helvetica').fontSize(compact ? 7.5 : 8).fillColor(C_DARK)
     .text(noteText, L, leftY, { width: COL_LEFT_W - PAD })
  leftY = doc.y + (compact ? 5 : 6)

  // ── Kanan: Totals ────────────────────────────────────────────────────
  const LABEL_W = 80
  const VALUE_W = COL_RIGHT_W - LABEL_W - 20
  const ROW_H   = compact ? 14 : 16

  function totalRow(label, value, bold = false, doubleBorder = false) {
    const rowBotY = rightY + ROW_H
    // border
    doc.rect(RIGHT_X, rightY, COL_RIGHT_W, ROW_H).strokeColor(C_BORDER).lineWidth(0.5).stroke()
    if (doubleBorder) {
      doc.rect(RIGHT_X + 1, rightY + 1, COL_RIGHT_W - 2, ROW_H - 2)
         .strokeColor(C_BORDER).lineWidth(0.5).stroke()
    }
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(FSZ).fillColor(C_DARK)
       .text(label, RIGHT_X + PAD, rightY + (compact ? 3 : 4), { width: LABEL_W, align: 'left' })
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(FSZ).fillColor(C_DARK)
       .text(value, RIGHT_X + LABEL_W, rightY + (compact ? 3 : 4), { width: VALUE_W + 20, align: 'right' })
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
function drawSignatures(doc, invoice, company, startY, ctx = null) {
  const { L, R, W } = pageGeom(doc, ctx)
  const compact = !!ctx?.compact
  const colW   = W / 2
  const sigH   = compact ? 65 : 85   // space untuk tanda tangan / materai
  const fsz    = compact ? 8.5 : 9

  let y = startY + (compact ? 5 : 6)

  // Tanda Terima (kiri)
  doc.font('Helvetica-Bold').fontSize(fsz).fillColor(C_DARK)
     .text('Tanda Terima', L, y, { width: colW, align: 'center' })

  // Hormat Kami (kanan)
  doc.font('Helvetica-Bold').fontSize(fsz).fillColor(C_DARK)
     .text('Hormat Kami,', L + colW, y, { width: colW, align: 'center' })

  y += sigH

  // Garis tanda tangan
  doc.moveTo(L + 20,         y).lineTo(L + colW - 20,   y).strokeColor(C_BORDER).lineWidth(0.8).stroke()
  doc.moveTo(L + colW + 20, y).lineTo(R - 20,            y).strokeColor(C_BORDER).lineWidth(0.8).stroke()

  // Nama
  doc.font('Helvetica').fontSize(fsz).fillColor(C_DARK)
     .text(invoice.customer?.name || '(___________________)', L, y + 3, { width: colW, align: 'center' })
  doc.font('Helvetica').fontSize(fsz).fillColor(C_DARK)
     .text(company.name || 'PT. Pelangi Nuansa Jaya', L + colW, y + 3, { width: colW, align: 'center' })

  // y posisi setelah baris nama (untuk penempatan footer "Dicetak pada")
  return y + (compact ? 14 : 16)
}

// ── Footer page (nomor + tanggal cetak) ─────────────────────────────────
// contentY: posisi Y setelah konten terakhir (mis. tanda tangan). Footer
// diletakkan tepat di bawah konten tersebut, tapi tidak melewati batas
// bawah halaman.
function drawPageFooter(doc, invoice, contentY = null, ctx = null) {
  const { L, W } = pageGeom(doc, ctx)
  const compact = !!ctx?.compact
  const maxFooterY = compact && ctx?.maxY != null
    ? ctx.maxY - 8
    : doc.page.height - doc.page.margins.bottom - 10
  const footerY = contentY != null
    ? Math.min(contentY + (compact ? 6 : 10), maxFooterY)
    : maxFooterY
  doc.font('Helvetica').fontSize(compact ? 6.5 : 7).fillColor(C_GRAY)
     .text(
       `Dicetak pada ${formatDateShort(new Date())} — ${invoice.invoice_number || ''}`,
       L, footerY, { width: W, align: 'center' },
     )
  doc.fillColor(C_BLACK)
}

// ── Lampiran SJ (halaman terakhir jika includeSJ) ─────────────────────────
function drawSJAppendix(doc, invoice, company, options) {
  const { L, R, W } = pageGeom(doc)
  const attachedSJs = getAttachedSJs(invoice)

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
  attachedSJs.forEach((sj, idx) => {
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

  drawPageFooter(doc, invoice, y + 4)
}

// ── Render satu salinan Invoice ───────────────────────────────────────────
/**
 * Render satu copy invoice penuh ke dalam doc mulai dari halaman aktif saat ini.
 * Jika konten melebihi satu halaman, fungsi ini akan memanggil doc.addPage()
 * sendiri (perilaku sama dengan sebelumnya).
 */
function renderOneCopy(doc, invoice, company, options = {}, copyIndex = 0, ctx = null) {
  const {
    includeLogo = true,
    includeSig  = true,
  } = options
  const compact = !!ctx?.compact

  // 1. Kop
  let y = drawHeader(doc, company, { includeLogo }, ctx)

  // 2. Bar info dokumen
  y = drawDocInfoBar(doc, invoice, y, ctx)

  // 3. Kepada + No Kontrak
  y = drawRecipientBlock(doc, invoice, y, ctx)

  // 4. Tabel
  y = drawItemTable(doc, invoice, y, copyIndex, ctx)
  y += compact ? 2 : 4

  // 5. Footer (pembayaran + totals)
  if (!compact) {
    const minFooterH = 80
    if (y + minFooterH > doc.page.height - doc.page.margins.bottom - 120) {
      doc.addPage()
      y = doc.page.margins.top
    }
  }
  y = drawFooter(doc, invoice, company, y, ctx)

  // 6. Tanda tangan
  let contentEndY = y
  if (includeSig) {
    if (!compact) {
      const sigH = 100
      if (y + sigH > doc.page.height - doc.page.margins.bottom) {
        doc.addPage()
        y = doc.page.margins.top
      }
    }
    contentEndY = drawSignatures(doc, invoice, company, y, ctx)
  }

  // Page footer (nomor + tanggal cetak) pada halaman terakhir copy ini —
  // diletakkan tepat di bawah konten terakhir (tanda tangan / footer totals).
  drawPageFooter(doc, invoice, contentEndY, ctx)

  return contentEndY
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
     .text('LAMPIRAN INVOICE', L, y, { width: W, align: 'center' })
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

  // ── Cek apakah rangkap 1 & 2 bisa digabung ke 1 halaman (mirip SJ) ──────
  const items = invoice.items || []
  const rowCount = items.length === 0 ? 0 : buildInvoiceTableRows(invoice, items).length
  const canCombo = copies >= 2 && rowCount > 0 && rowCount <= COMBO_MAX_ROWS &&
    estimateCompactContentHeight(doc, invoice) <= comboCopyHeight(doc)

  let comboTopY = null
  let comboBotY = null
  if (canCombo) {
    comboTopY = doc.page.margins.top
    comboBotY = comboTopY + comboCopyHeight(doc) + COMBO_GAP
  }

  for (let i = 0; i < copies; i++) {
    const isSecondOfCombo = canCombo && i === 1
    if (i > 0 && !isSecondOfCombo) doc.addPage()

    const ctx = canCombo && i < 2
      ? { compact: true, startY: i === 0 ? comboTopY : comboBotY, maxY: i === 0 ? comboBotY - COMBO_GAP : (doc.page.height - doc.page.margins.bottom) }
      : null

    renderOneCopy(doc, invoice, company, options, i, ctx)

    // Opsional: label lembar di sudut kanan bawah tiap salinan
    if (options.copyLabel) {
      const { L, W } = pageGeom(doc)
      const footerY = ctx && i === 0
        ? comboBotY - COMBO_GAP - 9
        : doc.page.height - doc.page.margins.bottom - 9
      doc.font('Helvetica').fontSize(7).fillColor('#AAAAAA')
         .text(`Lembar ${i + 1} / ${copies}`, L, footerY, { width: W, align: 'right', lineBreak: false })
      doc.fillColor('#000000')
    }
  }

  // Lampiran SJ dicetak sekali di akhir (bukan per salinan)
  const attachedSJs = getAttachedSJs(invoice)
  if (includeSJ && Array.isArray(attachedSJs) && attachedSJs.length > 0) {
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
