'use client'

import { GripVertical, Trash2 } from 'lucide-react'
import { InvoiceItem } from '../../domain/entities/Invoice'
import { MOCK_FLEETS_INVOICE } from '@/lib/mockData/invoice'

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
}

const UNIT_OPTIONS = ['Unit', 'Hari', 'Bulan', 'Trip', 'Paket']

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

export default function InvoiceItemRow({ item, index, onChange, onRemove, onDragStart, onDragOver, onDrop, errors = {} }: Props) {
  const duration = calcDuration(item.period_start, item.period_end)
  const subtotalFormatted = item.subtotal > 0 ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.subtotal) : '—'
  const errPrefix = `items.${index}`

  return (
    <div
      className="border rounded-xl p-4 bg-white invoice-item-enter"
      style={{ borderColor: 'var(--border-card)' }}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index) }}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button className="text-gray-400 cursor-grab hover:text-gray-600">
            <GripVertical size={16} />
          </button>
          <span className="text-sm font-semibold text-gray-600">Baris {index + 1}</span>
        </div>
        <button onClick={() => onRemove(item.uuid)} className="text-red-400 hover:text-red-600 p-1 rounded">
          <Trash2 size={16} />
        </button>
      </div>

      {/* Armada */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 mb-1 block">Armada</label>
        <select
          className="form-input w-full text-sm mb-2"
          onChange={e => {
            const fleetId = Number(e.target.value)
            if (fleetId === 0) return
            const fleet = MOCK_FLEETS_INVOICE.find(f => f.id === fleetId)
            if (fleet) {
              onChange(item.uuid, 'fleet_id', fleet.id)
              onChange(item.uuid, 'fleet_label', fleet.label)
            }
          }}
        >
          <option value={0}>Pilih armada atau input manual...</option>
          {MOCK_FLEETS_INVOICE.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <label className="text-xs text-gray-500 mb-1 block">Label di invoice *</label>
        <input
          className={`form-input w-full text-sm ${errors[`${errPrefix}.fleet_label`] ? 'border-red-400' : ''}`}
          value={item.fleet_label}
          onChange={e => onChange(item.uuid, 'fleet_label', e.target.value)}
          placeholder="Contoh: Toyota Zenix KB 1561 HX"
        />
        {errors[`${errPrefix}.fleet_label`] && <p className="text-xs text-red-500 mt-1">{errors[`${errPrefix}.fleet_label`]}</p>}
      </div>

      {/* Keterangan */}
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 mb-1 block">Keterangan</label>
        <input
          className="form-input w-full text-sm"
          value={item.description ?? ''}
          onChange={e => onChange(item.uuid, 'description', e.target.value)}
          placeholder="Tagihan Biaya Jasa Sewa Kendaraan"
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

      {/* Qty, Satuan, Harga, Subtotal */}
      <div className="grid grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Qty *</label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className={`form-input w-full text-sm ${errors[`${errPrefix}.qty`] ? 'border-red-400' : ''}`}
            value={item.qty}
            onChange={e => onChange(item.uuid, 'qty', Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Satuan</label>
          <select
            className="form-input w-full text-sm"
            value={item.unit}
            onChange={e => onChange(item.uuid, 'unit', e.target.value)}
          >
            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">Harga/Unit *</label>
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
