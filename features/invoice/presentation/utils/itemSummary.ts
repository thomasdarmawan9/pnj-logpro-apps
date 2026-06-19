import { Invoice, InvoiceItem } from '../../domain/entities/Invoice'
import { resolveEffectiveInvoiceServiceType } from '../../domain/services/invoiceServiceType'

/**
 * Baris ringkas rincian item untuk ditampilkan di tabel daftar invoice.
 * - `primary`  : teks utama (pengiriman → nama barang + ukuran; penyewaan → jenis kendaraan).
 * - `detail`   : baris pendukung opsional (penyewaan → unit disewa & durasi).
 */
export interface InvoiceItemSummaryLine {
  primary: string
  detail?: string
}

const DELIVERY_ADDITIONAL_CHARGE_LABEL = 'Pembiayaan Lainnya'

function formatNumber(value: number | null | undefined): string {
  const numeric = Number(value || 0)
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(numeric)
}

function hasValue(value: number | null | undefined): boolean {
  return Number(value || 0) > 0
}

function isDeliveryAdditionalCharge(item: InvoiceItem): boolean {
  return item.fleet_label === DELIVERY_ADDITIONAL_CHARGE_LABEL &&
    hasValue(item.unit_price) &&
    (item.cargo_qty === null || item.cargo_qty === undefined)
}

/** Durasi sewa ringkas, mis. "6 hari" atau "1 tahun 6 bulan". */
function rentalDurationShort(item: InvoiceItem): string | null {
  const parts = ([
    [item.rental_duration_years, 'tahun'],
    [item.rental_duration_months, 'bulan'],
    [item.rental_duration_days, 'hari'],
    [item.rental_duration_hours, 'jam'],
  ] as const)
    .filter(([value]) => hasValue(value))
    .map(([value, label]) => `${Number(value)} ${label}`)
  if (parts.length > 0) return parts.join(' ')

  if (item.period_start && item.period_end) {
    const days = Math.round(
      (new Date(item.period_end).getTime() - new Date(item.period_start).getTime()) / (1000 * 60 * 60 * 24),
    )
    if (days <= 0) return null
    const years = Math.floor(days / 365)
    const months = Math.floor((days % 365) / 30)
    const segments: string[] = []
    if (years > 0) segments.push(`${years} tahun`)
    if (months > 0) segments.push(`${months} bulan`)
    return segments.length ? segments.join(' ') : `${days} hari`
  }
  return null
}

function buildRentalLine(item: InvoiceItem): InvoiceItemSummaryLine {
  const qty = formatNumber(item.cargo_qty ?? item.qty)
  const duration = rentalDurationShort(item)
  const detailParts = [`Unit disewa: ${qty} unit`]
  if (duration) detailParts.push(`Durasi: ${duration}`)
  return {
    primary: item.fleet_label || item.description || 'Item penyewaan',
    detail: detailParts.join(' · '),
  }
}

function buildDeliveryLine(item: InvoiceItem, index: number): InvoiceItemSummaryLine | null {
  if (isDeliveryAdditionalCharge(item)) return null

  const name = (item.description?.trim() || item.fleet_label?.trim()) || `Barang ${index + 1}`

  const qty = item.cargo_qty ?? item.qty
  const unit = item.cargo_unit ?? item.unit
  const measure = hasValue(qty) ? `${formatNumber(qty)} ${unit}`.trim() : ''

  const metrics: string[] = []
  if (hasValue(item.cargo_weight)) metrics.push(`${formatNumber(item.cargo_weight)} kg`)
  if (hasValue(item.cargo_volume)) metrics.push(`${formatNumber(item.cargo_volume)} m³`)

  const primary = [name, measure, metrics.join(' dan ')].filter(Boolean).join(' - ')
  return { primary }
}

/** Bangun ringkasan rincian item dari sebuah invoice untuk tampilan tabel. */
export function buildInvoiceItemSummary(invoice: Invoice): InvoiceItemSummaryLine[] {
  const items = invoice.items ?? []
  if (items.length === 0) return []

  const effectiveType = resolveEffectiveInvoiceServiceType(invoice.service_type, invoice.custom_service_name)

  if (effectiveType === 'rental') {
    return items.map(buildRentalLine)
  }

  return items
    .map((item, index) => buildDeliveryLine(item, index))
    .filter((line): line is InvoiceItemSummaryLine => line !== null)
}
