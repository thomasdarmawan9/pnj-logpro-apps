'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { DeliveryPricingMode, InvoiceItem } from '../../domain/entities/Invoice'

type PartialItem = Omit<InvoiceItem, 'id' | 'invoice_id'>

export interface AdditionalDeliveryCharge {
  uuid: string
  name: string
  amount: number
}

const BILLING_UNIT_OPTIONS = ['unit', 'kg', 'volume', 'collie', 'batang', 'pengiriman']

function parseRupiah(value: string): number {
  return Number(value.replace(/\D/g, '')) || 0
}

function parseDecimal(value: string): number {
  const normalized = value
    .replace(/,/g, '.')
    .replace(/[^0-9.]/g, '')
    .replace(/(\..*)\./g, '$1')
  return Number(normalized) || 0
}

function isDecimalDraft(value: string): boolean {
  return /^(\d+([.,]\d{0,2})?|[.,]\d{0,2})?$/.test(value)
}

function formatRupiah(amount: number): string {
  if (!amount) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

interface Props {
  items: PartialItem[]
  onChange: (uuid: string, field: string, value: unknown) => void
  pricingMode?: DeliveryPricingMode
  onChangePricingMode?: (mode: DeliveryPricingMode) => void
  shipmentQty?: number
  shipmentUnit?: string
  shipmentUnitPrice?: number
  onChangeShipmentPricing?: (field: 'qty' | 'unit' | 'unit_price', value: string | number) => void
  additionalCharges?: AdditionalDeliveryCharge[]
  onAddAdditionalCharge?: () => void
  onChangeAdditionalCharge?: (uuid: string, field: keyof Omit<AdditionalDeliveryCharge, 'uuid'>, value: string | number) => void
  onRemoveAdditionalCharge?: (uuid: string) => void
  errors?: Record<string, string>
}

export default function DeliveryPricingSection({
  items,
  onChange,
  pricingMode = 'shipment',
  onChangePricingMode,
  shipmentQty,
  shipmentUnit,
  shipmentUnitPrice,
  onChangeShipmentPricing,
  additionalCharges,
  onAddAdditionalCharge,
  onChangeAdditionalCharge,
  onRemoveAdditionalCharge,
  errors = {},
}: Props) {
  const [decimalDrafts, setDecimalDrafts] = useState<Record<string, string>>({})
  const pricingItem = items[0] ?? null
  const effectiveShipmentQty = shipmentQty ?? pricingItem?.qty ?? 1
  const effectiveShipmentUnit = shipmentUnit ?? pricingItem?.unit ?? 'pengiriman'
  const effectiveShipmentUnitPrice = shipmentUnitPrice ?? pricingItem?.unit_price ?? 0
  const shipmentSubtotal = Math.round(Number(effectiveShipmentQty || 0) * Number(effectiveShipmentUnitPrice || 0))
  const changeShipmentPricing = (field: 'qty' | 'unit' | 'unit_price', value: string | number) => {
    if (onChangeShipmentPricing) {
      onChangeShipmentPricing(field, value)
      return
    }
    if (pricingItem) onChange(pricingItem.uuid, field, value)
  }
  const additionalTotal = (additionalCharges ?? []).reduce((sum, charge) => sum + Number(charge.amount || 0), 0)
  const deliveryTotal = pricingMode === 'item'
    ? items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)
    : shipmentSubtotal
  const total = deliveryTotal + additionalTotal
  const canManageAdditionalCharges = Boolean(additionalCharges && onAddAdditionalCharge && onChangeAdditionalCharge && onRemoveAdditionalCharge)
  const decimalInputValue = (key: string, value: number | string | null | undefined) =>
    Object.prototype.hasOwnProperty.call(decimalDrafts, key) ? decimalDrafts[key] : String(value ?? '')
  const changeDecimalInput = (key: string, value: string, onParsed: (parsed: number) => void) => {
    if (!isDecimalDraft(value)) return
    setDecimalDrafts(prev => ({ ...prev, [key]: value }))
    onParsed(parseDecimal(value))
  }
  const commitDecimalInput = (key: string) => {
    setDecimalDrafts(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  return (
    <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold mb-1">Set Harga Pengiriman</h2>
          <p className="text-xs text-gray-500">
            Pilih harga per pengiriman untuk satu tagihan global, atau per barang untuk harga berbeda di setiap row.
          </p>
        </div>
        <div className="inline-flex rounded-lg border overflow-hidden shrink-0" style={{ borderColor: 'var(--border-card)' }}>
          {([
            { value: 'shipment', label: 'Per Pengiriman' },
            { value: 'item', label: 'Per Barang' },
          ] as const).map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChangePricingMode?.(option.value)}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: pricingMode === option.value ? 'var(--green-primary)' : 'white',
                color: pricingMode === option.value ? 'white' : '#374151',
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {pricingMode === 'item' && !pricingItem ? (
        <div className="border-2 border-dashed rounded-xl py-8 text-center text-sm text-gray-400" style={{ borderColor: 'var(--border-card)' }}>
          Tambahkan rincian item terlebih dahulu untuk set harga per barang.
        </div>
      ) : pricingMode === 'shipment' ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[580px] text-sm border-collapse">
            <thead>
              <tr className="border-b text-[11px] font-medium text-gray-500" style={{ borderColor: 'var(--border-card)' }}>
                <th className="text-center pb-2 px-2 w-28">Jumlah *</th>
                <th className="text-center pb-2 px-2 w-28">Satuan *</th>
                <th className="text-right pb-2 px-2 w-40">Harga Satuan *</th>
                <th className="text-right pb-2 px-2 w-40">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b last:border-b-0" style={{ borderColor: 'var(--border-card)' }}>
                <td className="py-2 px-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    className={`form-input w-full text-sm text-center ${errors['items.0.qty'] ? 'border-red-400' : ''}`}
                    value={decimalInputValue('shipment-qty', effectiveShipmentQty)}
                    onChange={event => changeDecimalInput('shipment-qty', event.target.value, parsed => changeShipmentPricing('qty', parsed))}
                    onBlur={() => commitDecimalInput('shipment-qty')}
                  />
                </td>
                <td className="py-2 px-1">
                  <select
                    className="form-input w-full text-sm"
                    value={effectiveShipmentUnit}
                    onChange={event => changeShipmentPricing('unit', event.target.value)}
                  >
                    {BILLING_UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                </td>
                <td className="py-2 px-2">
                  <input
                    className={`form-input w-full text-sm text-right font-mono ${errors['items.0.unit_price'] ? 'border-red-400' : ''}`}
                    style={{ fontFamily: 'var(--font-mono)' }}
                    value={effectiveShipmentUnitPrice > 0 ? effectiveShipmentUnitPrice.toLocaleString('id-ID') : ''}
                    placeholder="0"
                    onChange={event => changeShipmentPricing('unit_price', parseRupiah(event.target.value))}
                  />
                </td>
                <td className="py-2 px-2">
                  <div
                    className="form-input w-full text-sm text-right bg-gray-50 select-none font-mono whitespace-nowrap"
                    style={{ color: shipmentSubtotal > 0 ? '#166534' : '#9CA3AF', fontFamily: 'var(--font-mono)' }}
                  >
                    {formatRupiah(shipmentSubtotal)}
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                <td colSpan={3} className="pt-3 px-2 text-right text-xs font-semibold text-gray-600">Total Harga Pengiriman</td>
                <td className="pt-3 px-2 text-right text-sm font-bold" style={{ color: total > 0 ? '#166534' : '#9CA3AF' }}>
                  {formatRupiah(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-sm border-collapse">
            <thead>
              <tr className="border-b text-[11px] font-medium text-gray-500" style={{ borderColor: 'var(--border-card)' }}>
                <th className="text-left pb-2 px-2">Barang / Muatan</th>
                <th className="text-center pb-2 px-2 w-28">Jumlah</th>
                <th className="text-center pb-2 px-2 w-28">Satuan Harga</th>
                <th className="text-right pb-2 px-2 w-40">Harga Satuan *</th>
                <th className="text-right pb-2 px-2 w-40">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.uuid} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-card)' }}>
                  <td className="py-2 px-2">
                    <div className="text-sm font-medium text-gray-800">{item.description || `Barang ${idx + 1}`}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      Muatan: {item.cargo_qty ?? item.qty} {item.cargo_unit ?? item.unit}
                    </div>
                  </td>
                  <td className="py-2 px-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      className={`form-input w-full text-sm text-center ${errors[`items.${idx}.qty`] ? 'border-red-400' : ''}`}
                      value={decimalInputValue(`item-${item.uuid}-qty`, item.qty)}
                      onChange={event => changeDecimalInput(`item-${item.uuid}-qty`, event.target.value, parsed => onChange(item.uuid, 'qty', parsed))}
                      onBlur={() => commitDecimalInput(`item-${item.uuid}-qty`)}
                    />
                  </td>
                  <td className="py-2 px-1">
                    <select
                      className="form-input w-full text-sm"
                      value={item.unit}
                      onChange={event => onChange(item.uuid, 'unit', event.target.value)}
                    >
                      {BILLING_UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      className={`form-input w-full text-sm text-right font-mono ${errors[`items.${idx}.unit_price`] ? 'border-red-400' : ''}`}
                      style={{ fontFamily: 'var(--font-mono)' }}
                      value={item.unit_price > 0 ? item.unit_price.toLocaleString('id-ID') : ''}
                      placeholder="0"
                      onChange={event => onChange(item.uuid, 'unit_price', parseRupiah(event.target.value))}
                    />
                  </td>
                  <td className="py-2 px-2">
                    <div
                      className="form-input w-full text-sm text-right bg-gray-50 select-none font-mono whitespace-nowrap"
                      style={{ color: item.subtotal > 0 ? '#166534' : '#9CA3AF', fontFamily: 'var(--font-mono)' }}
                    >
                      {formatRupiah(item.subtotal)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                <td colSpan={4} className="pt-3 px-2 text-right text-xs font-semibold text-gray-600">Total Harga Barang</td>
                <td className="pt-3 px-2 text-right text-sm font-bold" style={{ color: deliveryTotal > 0 ? '#166534' : '#9CA3AF' }}>
                  {formatRupiah(deliveryTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {canManageAdditionalCharges && (
        <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-card)' }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold">Set Harga Lainnya</h3>
            <button
              type="button"
              onClick={onAddAdditionalCharge}
              className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border font-medium"
              style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
            >
              <Plus size={14} />
              Tambah
            </button>
          </div>

          {(additionalCharges ?? []).length === 0 ? (
            <div className="border-2 border-dashed rounded-xl py-5 text-center text-sm text-gray-400" style={{ borderColor: 'var(--border-card)' }}>
              Belum ada pembiayaan lainnya.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm border-collapse">
                <thead>
                  <tr className="border-b text-[11px] font-medium text-gray-500" style={{ borderColor: 'var(--border-card)' }}>
                    <th className="text-left pb-2 px-2">Nama Pembiayaan *</th>
                    <th className="text-right pb-2 px-2 w-44">Nominal *</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {(additionalCharges ?? []).map((charge, idx) => (
                    <tr key={charge.uuid} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-card)' }}>
                      <td className="py-2 px-2">
                        <input
                          className={`form-input w-full text-sm ${errors[`additional_charges.${idx}.name`] ? 'border-red-400' : ''}`}
                          value={charge.name}
                          placeholder="contoh: Biaya bongkar"
                          onChange={event => onChangeAdditionalCharge?.(charge.uuid, 'name', event.target.value)}
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          className={`form-input w-full text-sm text-right font-mono ${errors[`additional_charges.${idx}.amount`] ? 'border-red-400' : ''}`}
                          style={{ fontFamily: 'var(--font-mono)' }}
                          value={charge.amount > 0 ? charge.amount.toLocaleString('id-ID') : ''}
                          placeholder="0"
                          onChange={event => onChangeAdditionalCharge?.(charge.uuid, 'amount', parseRupiah(event.target.value))}
                        />
                      </td>
                      <td className="py-2 pl-1">
                        <button
                          type="button"
                          onClick={() => onRemoveAdditionalCharge?.(charge.uuid)}
                          className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus pembiayaan"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
