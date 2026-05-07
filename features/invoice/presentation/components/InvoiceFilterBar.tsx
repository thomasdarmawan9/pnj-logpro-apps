'use client'

import { Search, RotateCcw, Download, Filter, ChevronDown } from 'lucide-react'
import { InvoiceFilterState } from '../../domain/entities/Invoice'

interface Props {
  filters: InvoiceFilterState
  onChange: (f: Partial<InvoiceFilterState>) => void
  onReset: () => void
  onExport?: () => void
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Terkirim' },
  { value: 'outstanding', label: 'Outstanding' },
  { value: 'paid', label: 'Lunas' },
  { value: 'void', label: 'Void' },
]

const CUSTOMER_OPTIONS = [
  { value: 'all', label: 'Semua Customer' },
  { value: 'PT. ATP BIO', label: 'PT. ATP BIO' },
  { value: 'PT. Borneo Maju', label: 'PT. Borneo Maju' },
  { value: 'PT. Sawit Borneo', label: 'PT. Sawit Borneo' },
  { value: 'PT. Kaltim Prima', label: 'PT. Kaltim Prima' },
  { value: 'PT. Anugrah Tambang', label: 'PT. Anugrah Tambang' },
]

const PROYEK_OPTIONS = [
  { value: 'all', label: 'Semua Proyek' },
  { value: 'PRJ-2026-001', label: 'Proyek Sewa Kendaraan Maret' },
  { value: 'PRJ-2026-002', label: 'Logistik Q1 2026' },
  { value: 'PRJ-2026-003', label: 'Pengiriman Batubara Februari' },
  { value: 'PRJ-2026-004', label: 'Proyek Alat Berat Q1' },
]

const PERIODE_OPTIONS = [
  { value: 'all', label: 'Semua Periode' },
  { value: 'month', label: 'Bulan Ini' },
  { value: 'last_month', label: 'Bulan Lalu' },
]

export default function InvoiceFilterBar({ filters, onChange, onReset, onExport }: Props) {
  return (
    <div className="bg-white rounded-xl border shadow-sm px-5 py-4" style={{ borderColor: 'var(--border-card)' }}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-60">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            className="form-input w-full"
            placeholder="Search..."
            value={filters.search}
            onChange={e => onChange({ search: e.target.value })}
            style={{ paddingLeft: '38px' }}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={onExport} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border text-gray-600 hover:bg-gray-50" style={{ borderColor: 'var(--border-card)' }}>
            <Download size={14} />
            Export Excel
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
          <Filter size={14} className="text-gray-500" />
          Filter
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}
        >
          <RotateCcw size={14} />
          Reset Filter
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <div>
          <div className="text-xs text-gray-600">Status</div>
          <div className="relative mt-1">
            <select className="form-input text-sm w-full pr-8" value={filters.status} onChange={e => onChange({ status: e.target.value })}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Customer</div>
          <div className="relative mt-1">
            <select className="form-input text-sm w-full pr-8" value={filters.customer} onChange={e => onChange({ customer: e.target.value })}>
              {CUSTOMER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Proyek</div>
          <div className="relative mt-1">
            <select className="form-input text-sm w-full pr-8" value={filters.proyek} onChange={e => onChange({ proyek: e.target.value })}>
              {PROYEK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600">Periode</div>
          <div className="relative mt-1">
            <select className="form-input text-sm w-full pr-8" value={filters.periode} onChange={e => onChange({ periode: e.target.value })}>
              {PERIODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  )
}
