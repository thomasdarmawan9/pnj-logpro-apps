import { DeliveryPricingMode, InvoiceItem, InvoiceServiceType } from '../../domain/entities/Invoice'
import { formatDateOnly } from '@/lib/dateOnly'

const DELIVERY_ADDITIONAL_CHARGE_LABEL = 'Pembiayaan Lainnya'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return formatDateOnly(d)
}

function calcDuration(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  const s = new Date(start)
  const e = new Date(end)
  const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return null
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  const parts: string[] = []
  if (years > 0) parts.push(`${years} tahun`)
  if (months > 0) parts.push(`${months} bulan`)
  return parts.length ? parts.join(' ') : `${days} hari`
}

interface Props {
  items: InvoiceItem[]
  serviceType?: InvoiceServiceType
  deliveryPricingMode?: DeliveryPricingMode
  subtotalAmount: number
  taxPercent: number
  taxAmount: number
  pphPercent: number
  pphAmount: number
  insuranceAmount: number
  totalAmount: number
}

function formatQty(value: number | null | undefined): string {
  const numeric = Number(value || 0)
  if (!Number.isFinite(numeric) || numeric <= 0) return '-'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(numeric)
}

function isDeliveryAdditionalCharge(item: InvoiceItem): boolean {
  return item.fleet_label === DELIVERY_ADDITIONAL_CHARGE_LABEL &&
    Number(item.unit_price || 0) > 0 &&
    (item.cargo_qty === null || item.cargo_qty === undefined)
}

function isShipmentPricingOnlyRow(item: InvoiceItem, deliveryPricingMode: DeliveryPricingMode): boolean {
  return deliveryPricingMode === 'shipment' &&
    Number(item.unit_price || 0) > 0 &&
    (item.cargo_qty === null || item.cargo_qty === undefined) &&
    (item.cargo_weight === null || item.cargo_weight === undefined) &&
    (item.cargo_volume === null || item.cargo_volume === undefined) &&
    !item.cargo_notes
}

function getDeliveryPriceQty(item: InvoiceItem): number {
  return Number(item.qty ?? 0)
}

function getDeliveryPriceUnit(item: InvoiceItem): string {
  return item.unit ?? '-'
}

function getDeliveryItemSubtotal(item: InvoiceItem): number {
  const calculated = getDeliveryPriceQty(item) * Number(item.unit_price || 0)
  return calculated > 0 ? calculated : Number(item.subtotal || 0)
}

function formatRentalDuration(item: InvoiceItem): string | null {
  const parts = [
    [item.rental_duration_years, 'Tahun'],
    [item.rental_duration_months, 'Bulan'],
    [item.rental_duration_days, 'Hari'],
    [item.rental_duration_hours, 'Jam'],
  ]
    .filter(([value]) => Number(value || 0) > 0)
    .map(([value, label]) => `${Number(value)} ${label}`)

  return parts.length > 0 ? `${parts.join(' ')} Pemakaian` : null
}

export default function InvoiceItemsTable({ items, serviceType = 'rental', deliveryPricingMode = 'shipment', subtotalAmount, taxPercent, taxAmount, pphPercent, pphAmount, insuranceAmount, totalAmount }: Props) {
  const isDelivery = serviceType !== 'rental'
  const deliveryItems = isDelivery ? items.filter(item => !isDeliveryAdditionalCharge(item)) : items
  const cargoItems = isDelivery
    ? deliveryItems.filter(item => !isShipmentPricingOnlyRow(item, deliveryPricingMode))
    : deliveryItems
  const additionalCharges = isDelivery ? items.filter(isDeliveryAdditionalCharge) : []
  const additionalChargesTotal = additionalCharges.reduce((sum, item) => sum + Number(item.subtotal || item.unit_price || 0), 0)
  const pricedItem = deliveryItems.find(item => Number(item.subtotal || 0) > 0 || Number(item.unit_price || 0) > 0) ?? deliveryItems[0]
  const deliverySubtotal = Math.max(0, subtotalAmount - additionalChargesTotal)

  if (isDelivery) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
          <div className="px-4 py-3 border-b bg-gray-50" style={{ borderColor: 'var(--border-card)' }}>
            <h3 className="text-sm font-semibold">Rincian Item / Muatan</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left w-12">No</th>
                  <th className="px-4 py-3 text-left">Deskripsi / Nama Barang</th>
                  <th className="px-4 py-3 text-right">Jumlah Muatan</th>
                  <th className="px-4 py-3 text-right">Berat/kg</th>
                  <th className="px-4 py-3 text-right">Volume/m3</th>
                  <th className="px-4 py-3 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {cargoItems.length > 0 ? cargoItems.map((item, idx) => (
                  <tr key={item.uuid} className="border-t align-top" style={{ borderColor: 'var(--border-card)' }}>
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{item.description || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatQty(item.cargo_qty ?? item.qty)}
                      <span className="ml-1 text-xs font-normal text-gray-400">{item.cargo_unit ?? item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatQty(item.cargo_weight)}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{formatQty(item.cargo_volume)}</td>
                    <td className="px-4 py-3 text-gray-600">{item.cargo_notes || '-'}</td>
                  </tr>
                )) : (
                  <tr className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400">
                      Belum ada rincian item/muatan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
          <div className="px-4 py-3 border-b bg-gray-50" style={{ borderColor: 'var(--border-card)' }}>
            <h3 className="text-sm font-semibold">
              Harga Jasa {deliveryPricingMode === 'item' ? 'per Barang' : 'per Pengiriman'}
            </h3>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                {deliveryPricingMode === 'item' && <th className="px-4 py-3 text-left">Barang / Muatan</th>}
                <th className="px-4 py-3 text-right">Jumlah</th>
                <th className="px-4 py-3 text-left">Satuan</th>
                <th className="px-4 py-3 text-right">Harga Satuan</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {deliveryPricingMode === 'item' ? deliveryItems.map((item, idx) => (
                <tr key={item.uuid} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.description || `Barang ${idx + 1}`}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatQty(getDeliveryPriceQty(item))}</td>
                  <td className="px-4 py-3 text-gray-600">{getDeliveryPriceUnit(item)}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(item.unit_price || 0)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(getDeliveryItemSubtotal(item))}</td>
                </tr>
              )) : (
                <tr className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                  <td className="px-4 py-3 text-right font-semibold">{formatQty(pricedItem?.qty)}</td>
                  <td className="px-4 py-3 text-gray-600">{pricedItem?.unit || '-'}</td>
                  <td className="px-4 py-3 text-right font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(pricedItem?.unit_price || 0)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(deliverySubtotal)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {additionalCharges.length > 0 && (
            <div className="border-t" style={{ borderColor: 'var(--border-card)' }}>
              <div className="px-4 py-3 bg-gray-50 border-b" style={{ borderColor: 'var(--border-card)' }}>
                <h4 className="text-sm font-semibold">Biaya Lainnya</h4>
              </div>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Nama Pembiayaan</th>
                    <th className="px-4 py-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {additionalCharges.map(charge => (
                    <tr key={charge.uuid} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                      <td className="px-4 py-3 font-medium text-gray-800">{charge.description || '-'}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                        {formatRupiah(charge.subtotal || charge.unit_price || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {renderTotals(subtotalAmount, taxPercent, taxAmount, pphPercent, pphAmount, insuranceAmount, totalAmount)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left w-8">No</th>
            <th className="px-4 py-3 text-left">Deskripsi & Armada</th>
            <th className="px-4 py-3 text-left">Periode Pakai</th>
            <th className="px-4 py-3 text-center w-16">Jumlah</th>
            <th className="px-4 py-3 text-center w-20">Satuan</th>
            <th className="px-4 py-3 text-right">Harga/Unit</th>
            <th className="px-4 py-3 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const duration = calcDuration(item.period_start, item.period_end)
            return (
              <tr key={item.uuid} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                <td className="px-4 py-3 text-gray-500 align-top">{idx + 1}</td>
                <td className="px-4 py-3 align-top">
                  <div className="font-medium">{item.description}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.fleet_label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Unit disewa: {formatQty(item.cargo_qty ?? item.qty)} unit
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-xs text-gray-600">
                  {item.period_start || item.period_end ? (
                    <>
                      <div>{formatDate(item.period_start)} –</div>
                      <div>{formatDate(item.period_end)}</div>
                      {duration && <div className="text-gray-400 mt-0.5">({duration})</div>}
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center align-top">
                  <div>{item.qty}</div>
                  {formatRentalDuration(item) && (
                    <div className="text-[11px] text-gray-500 mt-1 leading-snug">{formatRentalDuration(item)}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-center align-top text-gray-500">{item.unit}</td>
                <td className="px-4 py-3 text-right align-top font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(item.unit_price)}</td>
                <td className="px-4 py-3 text-right align-top font-mono font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(item.subtotal)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>{renderTotalRows(subtotalAmount, taxPercent, taxAmount, pphPercent, pphAmount, insuranceAmount, totalAmount, 5)}</tfoot>
      </table>
    </div>
  )
}

function renderTotalRows(
  subtotalAmount: number,
  taxPercent: number,
  taxAmount: number,
  pphPercent: number,
  pphAmount: number,
  insuranceAmount: number,
  totalAmount: number,
  spacerColSpan: number,
) {
  return (
    <>
      <tr className="border-t" style={{ borderColor: 'var(--border-card)' }}>
        <td colSpan={spacerColSpan} />
        <td className="px-4 py-2 text-right text-sm text-gray-500">Sub Total</td>
        <td className="px-4 py-2 text-right font-mono text-sm" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(subtotalAmount)}</td>
      </tr>
      {taxPercent > 0 && (
        <tr>
          <td colSpan={spacerColSpan} />
          <td className="px-4 py-1 text-right text-sm text-gray-500 italic">+ PPN {taxPercent}%</td>
          <td className="px-4 py-1 text-right font-mono text-sm text-gray-500 italic" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(taxAmount)}</td>
        </tr>
      )}
      {pphPercent > 0 && (
        <tr>
          <td colSpan={spacerColSpan} />
          <td className="px-4 py-1 text-right text-sm italic" style={{ color: '#DC2626' }}>− PPh 23 {pphPercent}%</td>
          <td className="px-4 py-1 text-right font-mono text-sm italic" style={{ fontFamily: 'var(--font-mono)', color: '#DC2626' }}>({formatRupiah(pphAmount)})</td>
        </tr>
      )}
      {insuranceAmount > 0 && (
        <tr>
          <td colSpan={spacerColSpan} />
          <td className="px-4 py-1 text-right text-sm text-gray-500 italic">+ Asuransi</td>
          <td className="px-4 py-1 text-right font-mono text-sm text-gray-500 italic" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(insuranceAmount)}</td>
        </tr>
      )}
      <tr className="border-t-2 border-double" style={{ borderColor: '#9CA3AF' }}>
        <td colSpan={spacerColSpan} />
        <td className="px-4 py-3 text-right font-bold text-base">NETTO</td>
        <td className="px-4 py-3 text-right font-bold font-mono text-base" style={{ fontFamily: 'var(--font-mono)', color: '#166534' }}>
          {formatRupiah(totalAmount)}
        </td>
      </tr>
    </>
  )
}

function renderTotals(
  subtotalAmount: number,
  taxPercent: number,
  taxAmount: number,
  pphPercent: number,
  pphAmount: number,
  insuranceAmount: number,
  totalAmount: number,
) {
  return (
    <table className="min-w-full text-sm">
      <tfoot>{renderTotalRows(subtotalAmount, taxPercent, taxAmount, pphPercent, pphAmount, insuranceAmount, totalAmount, 2)}</tfoot>
    </table>
  )
}
