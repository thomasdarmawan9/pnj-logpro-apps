'use client'

import { useEffect, useState } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { InvoiceItem } from '../../domain/entities/Invoice'
import type { InvoiceServiceType } from '../../domain/entities/Invoice'
import { apiRequestAllPages } from '@/lib/apiClient'

type PartialItem = Omit<InvoiceItem, 'id' | 'invoice_id'>

interface Props {
  item: PartialItem
  index: number
  onChange: (uuid: string, field: string, value: unknown) => void
  onRemove: (uuid: string) => void
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: () => void
  errors?: Record<string, string>
  serviceType?: InvoiceServiceType
  readOnlyStructure?: boolean
  sourceLabel?: string | null
}

const UNIT_OPTIONS = [
  'Unit',
  'Hari',
  'Bulan',
  'Trip',
  'Paket',
  'Meter Kubik',
  'Kilogram',
  'Ton',
  'Collie',
  'Karton',
  'Karung',
  'Lembar',
  'Liter',
  'Meter',
  'Pallet',
  'Buruh',
]

const UNIT_OTHER_VALUE = 'Lainnya'

interface FleetOption {
  id: number
  label: string
}

interface ApiFleetOption {
  id: number | string
  name: string
  plate_number: string
  rental_status?: 'rented' | null
}

function parseRupiah(val: string): number {
  return Number(val.replace(/\D/g, '')) || 0
}

function calcDuration(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  const s = new Date(start)
  const e = new Date(end)
  const diffMs = e.getTime() - s.getTime()
  if (diffMs <= 0) return null
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  const remDays = days % 30
  const parts: string[] = []
  if (years > 0) parts.push(`${years} tahun`)
  if (months > 0) parts.push(`${months} bulan`)
  if (remDays > 0 && years === 0) parts.push(`${remDays} hari`)
  return parts.join(' ') || null
}

function toNonNegativeInteger(value: string): number {
  if (value === '') return 0
  return Math.max(0, Math.floor(Number(value) || 0))
}

function isDecimalDraft(value: string): boolean {
  return /^(\d+([.,]\d{0,4})?|[.,]\d{0,4})?$/.test(value)
}

function parseDecimal(value: string): number {
  const normalized = value.replace(/,/g, '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
  return Number(normalized) || 0
}

export default function InvoiceItemRow({
  item,
  index,
  onChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  errors = {},
  serviceType = 'delivery',
  readOnlyStructure = false,
  sourceLabel = null,
}: Props) {
  const [fleetOptions, setFleetOptions] = useState<FleetOption[]>([])
  const [qtyDraft, setQtyDraft] = useState<string | null>(null)
  const duration = calcDuration(item.period_start, item.period_end)
  const subtotalFormatted = item.subtotal > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.subtotal) : '—'
  const errPrefix = `items.${index}`
  const matchedUnit = UNIT_OPTIONS.find(u => u.toLowerCase() === (item.unit ?? '').toLowerCase())
  const isCustomUnit = !matchedUnit

  useEffect(() => {
    let alive = true
    apiRequestAllPages<ApiFleetOption>('/fleets?status=active', { method: 'GET' })
      .then(data => {
        if (!alive) return
        setFleetOptions(data
          .filter(fleet => fleet.plate_number !== 'TBD' && fleet.rental_status !== 'rented')
          .map(fleet => ({
            id: Number(fleet.id),
            label: `${fleet.name} ${fleet.plate_number}`,
          })))
      })
      .catch(() => {
        if (alive) setFleetOptions([])
      })
    return () => { alive = false }
  }, [])

  return (
    <div
      className="border rounded-xl p-4 bg-white invoice-item-enter"
      style={{ borderColor: 'var(--border-card)' }}
      draggable={!readOnlyStructure}
      onDragStart={() => onDragStart(index)}
      onDragOver={e => {
        if (readOnlyStructure) return
        e.preventDefault()
        onDragOver(index)
      }}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {!readOnlyStructure && (
            <button className="text-gray-400 cursor-grab hover:text-gray-600">
              <GripVertical size={16} />
            </button>
          )}
          <span className="text-sm font-semibold text-gray-600">Baris {index + 1}</span>
          {sourceLabel && (
            <span className="text-[11px] px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {sourceLabel}
            </span>
          )}
        </div>
        {!readOnlyStructure && (
          <button onClick={() => onRemove(item.uuid)} className="text-red-400 hover:text-red-600 p-1 rounded">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Armada */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 mb-1 block">Armada</label>
        <select
          className={`form-input w-full text-sm mb-2 ${errors[`${errPrefix}.fleet_id`] ? 'border-red-400' : ''}`}
          value={item.fleet_id ?? 0}
          onChange={e => {
            const fleetId = Number(e.target.value)
            if (fleetId === 0) return
            const fleet = fleetOptions.find(f => f.id === fleetId)
            if (fleet) {
              onChange(item.uuid, 'fleet_id', fleet.id)
              onChange(item.uuid, 'fleet_label', fleet.label)
            }
          }}
        >
          <option value={0}>Pilih armada atau input manual...</option>
          {fleetOptions.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <label className="text-xs text-gray-500 mb-1 block">{serviceType === 'rental' ? 'Jenis kendaraan di invoice *' : 'Armada di invoice *'}</label>
        <input
          className={`form-input w-full text-sm ${errors[`${errPrefix}.fleet_label`] ? 'border-red-400' : ''}`}
          value={item.fleet_label}
          onChange={e => onChange(item.uuid, 'fleet_label', e.target.value)}
          placeholder="Contoh: Toyota Zenix KB 1561 HX"
        />
        {errors[`${errPrefix}.fleet_id`] && <p className="text-xs text-red-500 mt-1">{errors[`${errPrefix}.fleet_id`]}</p>}
        {errors[`${errPrefix}.fleet_label`] && <p className="text-xs text-red-500 mt-1">{errors[`${errPrefix}.fleet_label`]}</p>}
      </div>

      {/* Deskripsi barang/catatan */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 mb-1 block">{serviceType === 'rental' ? 'Catatan Item' : 'Barang Kiriman'}</label>
        <input
          className="form-input w-full text-sm"
          value={item.description ?? ''}
          onChange={e => onChange(item.uuid, 'description', e.target.value)}
          placeholder={serviceType === 'rental' ? 'Opsional' : 'Contoh: Pipa, semen, material proyek'}
        />
      </div>

      {/* Periode */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 mb-1 block">Periode Pakai</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="form-input flex-1 text-sm"
            value={item.period_start ?? ''}
            onChange={e => onChange(item.uuid, 'period_start', e.target.value || null)}
          />
          <span className="text-gray-400 text-sm">s/d</span>
          <input
            type="date"
            className="form-input flex-1 text-sm"
            value={item.period_end ?? ''}
            onChange={e => onChange(item.uuid, 'period_end', e.target.value || null)}
          />
        </div>
        {duration && <p className="text-xs text-gray-500 mt-1">Durasi: {duration}</p>}
      </div>

      {serviceType === 'rental' && (
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Durasi Pemakaian</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              ['rental_duration_years', 'Tahun'],
              ['rental_duration_months', 'Bulan'],
              ['rental_duration_days', 'Hari'],
              ['rental_duration_hours', 'Jam'],
            ] as const).map(([field, label]) => (
              <div key={field}>
                <label className="text-[11px] text-gray-500 mb-1 block">{label}</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  className="form-input w-full text-sm text-center"
                  value={item[field] ?? 0}
                  onChange={event => onChange(item.uuid, field, toNonNegativeInteger(event.target.value))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jumlah tagihan, unit sewa, harga, subtotal */}
      {serviceType === 'rental' && (
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-600 mb-1 block">Qty Unit</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              className="form-input w-32 text-sm"
              value={item.cargo_qty ?? 1}
              onChange={e => onChange(item.uuid, 'cargo_qty', Math.max(1, Math.floor(Number(e.target.value) || 1)))}
            />
            <span className="text-sm text-gray-600">unit</span>
          </div>
        </div>
      )}
      <div className="grid grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Jumlah *</label>
          <input
            type="text"
            inputMode="decimal"
            className={`form-input w-full text-sm ${errors[`${errPrefix}.qty`] ? 'border-red-400' : ''}`}
            value={qtyDraft !== null ? qtyDraft : Number(item.qty).toFixed(4)}
            onChange={e => {
              if (!isDecimalDraft(e.target.value)) return
              setQtyDraft(e.target.value)
              onChange(item.uuid, 'qty', parseDecimal(e.target.value))
            }}
            onBlur={() => setQtyDraft(null)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Satuan</label>
          <select
            className="form-input w-full text-sm"
            value={isCustomUnit ? UNIT_OTHER_VALUE : matchedUnit}
            onChange={e => onChange(item.uuid, 'unit', e.target.value === UNIT_OTHER_VALUE ? '' : e.target.value)}
          >
            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
            <option value={UNIT_OTHER_VALUE}>{UNIT_OTHER_VALUE}</option>
          </select>
          {isCustomUnit && (
            <input
              className="form-input w-full text-sm mt-2"
              value={item.unit}
              onChange={e => onChange(item.uuid, 'unit', e.target.value)}
              placeholder="Tulis satuan..."
            />
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Harga/{item.unit} *</label>
          <input
            className={`form-input w-full text-sm ${errors[`${errPrefix}.unit_price`] ? 'border-red-400' : ''}`}
            value={item.unit_price > 0 ? item.unit_price.toLocaleString('id-ID') : ''}
            onChange={e => onChange(item.uuid, 'unit_price', parseRupiah(e.target.value))}
            placeholder="0"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Subtotal</label>
          <div
            className="px-3 py-2 rounded-xl border text-sm font-bold text-right"
            style={{ fontFamily: 'var(--font-mono)', color: '#166534', borderColor: 'var(--border-card)', backgroundColor: '#F0FDF4' }}
          >
            {subtotalFormatted}
          </div>
        </div>
      </div>
    </div>
  )
}
