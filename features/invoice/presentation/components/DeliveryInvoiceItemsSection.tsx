'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { InvoiceItem } from '../../domain/entities/Invoice'

type PartialItem = Omit<InvoiceItem, 'id' | 'invoice_id'>

const CARGO_UNIT_OPTIONS = ['pcs', 'unit', 'set', 'kg', 'ton', 'collie', 'liter', 'dus', 'karton', 'karung', 'roll', 'meter', 'batang', 'pallet', 'buruh']
const CARGO_UNIT_OTHER_VALUE = 'lainnya'

function isDecimalDraft(value: string): boolean {
  return /^(\d+([.,]\d{0,4})?|[.,]\d{0,4})?$/.test(value)
}

function parseDecimal(value: string): number {
  const normalized = value.replace(/,/g, '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
  return Number(normalized) || 0
}

interface Props {
  items: PartialItem[]
  onAdd: () => void
  onChange: (uuid: string, field: string, value: unknown) => void
  onRemove: (uuid: string) => void
  errors?: Record<string, string>
  readOnlyStructure?: boolean
}

export default function DeliveryInvoiceItemsSection({
  items,
  onAdd,
  onChange,
  onRemove,
  errors = {},
  readOnlyStructure = false,
}: Props) {
  const [decimalDrafts, setDecimalDrafts] = useState<Record<string, string>>({})

  const decimalInputValue = (key: string, value: number | null | undefined) => {
    if (Object.prototype.hasOwnProperty.call(decimalDrafts, key)) return decimalDrafts[key]
    if (value === null || value === undefined || isNaN(Number(value))) return ''
    return Number(value).toFixed(4)
  }

  const changeDecimalInput = (key: string, raw: string, onParsed: (n: number | null) => void) => {
    if (!isDecimalDraft(raw)) return
    setDecimalDrafts(prev => ({ ...prev, [key]: raw }))
    onParsed(raw === '' ? null : parseDecimal(raw))
  }

  const commitDecimalInput = (key: string) => {
    setDecimalDrafts(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  return (
    <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold">Rincian Item / Muatan</h2>
        {!readOnlyStructure && (
          <button onClick={onAdd} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border font-medium" style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}>
            <Plus size={14} />
            Tambah Item
          </button>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">Rincian muatan untuk invoice pengiriman. Harga diinput pada section Set Harga Pengiriman.</p>
      {errors.items && <p className="text-xs text-red-500 mb-3">{errors.items}</p>}

      {items.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl py-12 text-center" style={{ borderColor: 'var(--border-card)' }}>
          <p className="text-gray-500 font-medium">Belum ada item</p>
          {!readOnlyStructure && <p className="text-xs text-gray-400 mt-1">Klik &ldquo;Tambah Item&rdquo; untuk menambahkan rincian muatan</p>}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-sm border-collapse">
            <thead>
              <tr className="border-b text-[11px] font-medium text-gray-500" style={{ borderColor: 'var(--border-card)' }}>
                <th className="text-left pb-2 w-7">No</th>
                <th className="text-left pb-2 px-2 min-w-[360px]">Deskripsi / Nama Barang *</th>
                <th className="text-center pb-2 px-2 w-36">Jumlah Muatan *</th>
                <th className="text-center pb-2 px-2 w-28">Satuan Muatan *</th>
                <th className="text-center pb-2 px-2 w-24">Berat/kg</th>
                <th className="text-center pb-2 px-2 w-24">Volume/m3</th>
                <th className="text-left pb-2 px-2 min-w-[240px]">Keterangan</th>
                {!readOnlyStructure && <th className="w-8" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const errPrefix = `items.${idx}`
                return (
                  <tr key={item.uuid} className="align-top border-b last:border-b-0" style={{ borderColor: 'var(--border-card)' }}>
                    <td className="py-2 pr-1 text-xs text-gray-400">{idx + 1}</td>
                    <td className="py-2 px-2">
                      <input
                        className={`form-input w-full text-sm ${errors[`${errPrefix}.description`] ? 'border-red-400' : ''}`}
                        placeholder="contoh: Besi beton 10mm"
                        value={item.description ?? ''}
                        onChange={event => onChange(item.uuid, 'description', event.target.value)}
                      />
                      {item.source_sj_id && <div className="text-[11px] text-blue-600 mt-1">Sumber SJ</div>}
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className="form-input w-full text-sm text-center"
                        value={item.cargo_qty ?? item.qty}
                        onChange={event => {
                          const value = event.target.value
                          onChange(item.uuid, 'cargo_qty', value === '' ? 0 : Math.max(0, Math.floor(Number(value))))
                        }}
                      />
                    </td>
                    <td className="py-2 px-1">
                      {(() => {
                        const cargoUnit = item.cargo_unit ?? item.unit ?? ''
                        const matchedUnit = CARGO_UNIT_OPTIONS.find(u => u.toLowerCase() === cargoUnit.toLowerCase())
                        const isCustomUnit = !matchedUnit
                        return (
                          <>
                            <select
                              className="form-input w-full text-sm"
                              value={isCustomUnit ? CARGO_UNIT_OTHER_VALUE : matchedUnit}
                              onChange={event => onChange(item.uuid, 'cargo_unit', event.target.value === CARGO_UNIT_OTHER_VALUE ? '' : event.target.value)}
                            >
                              {CARGO_UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                              <option value={CARGO_UNIT_OTHER_VALUE}>{CARGO_UNIT_OTHER_VALUE}</option>
                            </select>
                            {isCustomUnit && (
                              <input
                                className="form-input w-full text-sm mt-2"
                                value={cargoUnit}
                                onChange={event => onChange(item.uuid, 'cargo_unit', event.target.value)}
                                placeholder="Tulis satuan..."
                              />
                            )}
                          </>
                        )
                      })()}
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="form-input w-full text-sm text-center"
                        value={decimalInputValue(`${item.uuid}-weight`, item.cargo_weight)}
                        placeholder="0.0000"
                        onChange={event => changeDecimalInput(`${item.uuid}-weight`, event.target.value, val => onChange(item.uuid, 'cargo_weight', val))}
                        onBlur={() => commitDecimalInput(`${item.uuid}-weight`)}
                      />
                    </td>
                    <td className="py-2 px-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        className="form-input w-full text-sm text-center"
                        value={decimalInputValue(`${item.uuid}-volume`, item.cargo_volume)}
                        placeholder="0.0000"
                        onChange={event => changeDecimalInput(`${item.uuid}-volume`, event.target.value, val => onChange(item.uuid, 'cargo_volume', val))}
                        onBlur={() => commitDecimalInput(`${item.uuid}-volume`)}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <input
                        className="form-input w-full text-sm"
                        placeholder="Opsional"
                        value={item.cargo_notes ?? ''}
                        onChange={event => onChange(item.uuid, 'cargo_notes', event.target.value)}
                      />
                    </td>
                    {!readOnlyStructure && (
                      <td className="py-2 pl-1">
                        <button
                          type="button"
                          onClick={() => onRemove(item.uuid)}
                          className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Hapus item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
