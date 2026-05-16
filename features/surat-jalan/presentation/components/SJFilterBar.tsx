import { Search, Download, Filter, ChevronDown, RotateCcw } from 'lucide-react'
import { SJFilterState, StatusLampiran, StatusOperasional } from '../../domain/entities/SuratJalan'

interface SJFilterBarProps {
  filters: SJFilterState
  onChange: (filters: Partial<SJFilterState>) => void
  onReset: () => void
  resultCount: number
}

export default function SJFilterBar({ filters, onChange, onReset }: SJFilterBarProps) {
  return (
    <div className="rounded-xl px-5 py-4 shadow-sm mb-5 bg-white border" style={{ borderColor: 'var(--border-card)' }}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-60">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="form-input w-full"
            placeholder="Search..."
            value={filters.search}
            onChange={e => onChange({ search: e.target.value })}
            style={{ paddingLeft: '38px' }}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}
          >
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
        <div>
          <div className="text-xs text-gray-600">Status Ops</div>
          <div className="relative mt-1">
            <select
              className="form-input pr-8 text-sm w-full"
              value={filters.statusOps}
              onChange={e => onChange({ statusOps: e.target.value as StatusOperasional | 'all' })}
            >
              <option value="all">Semua</option>
              <option value={StatusOperasional.DRAFT}>Draft</option>
              <option value={StatusOperasional.ASSIGNED}>Terbit</option>
              <option value={StatusOperasional.DELIVERED}>Terkirim</option>
              <option value={StatusOperasional.VOID}>Dibatalkan</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-600">Status Invoice</div>
          <div className="relative mt-1">
            <select
              className="form-input pr-8 text-sm w-full"
              value={filters.statusLampiran}
              onChange={e => onChange({ statusLampiran: e.target.value as StatusLampiran | 'all' })}
            >
              <option value="all">Semua</option>
              <option value={StatusLampiran.NO_INVOICE}>Belum Ada Invoice</option>
              <option value={StatusLampiran.ATTACHED}>Terlampir di Invoice</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-600">Proyek</div>
          <div className="relative mt-1">
            <select
              className="form-input pr-8 text-sm w-full"
              value={filters.proyek}
              onChange={e => onChange({ proyek: e.target.value })}
            >
              <option value="all">Semua</option>
              <option value="PRJ-2026-001">PRJ-2026-001</option>
              <option value="PRJ-2026-002">PRJ-2026-002</option>
              <option value="PRJ-2026-003">PRJ-2026-003</option>
              <option value="PRJ-2026-004">PRJ-2026-004</option>
              <option value="PRJ-2026-005">PRJ-2026-005</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-600">Customer</div>
          <div className="relative mt-1">
            <select
              className="form-input pr-8 text-sm w-full"
              value={filters.customer}
              onChange={e => onChange({ customer: e.target.value })}
            >
              <option value="all">Semua</option>
              <option value="PT. ATP BIO">PT. ATP BIO</option>
              <option value="PT. Borneo Maju">PT. Borneo Maju</option>
              <option value="PT. Kalbar Energi">PT. Kalbar Energi</option>
              <option value="PT. Sawit Borneo">PT. Sawit Borneo</option>
              <option value="PT. Singkawang Trans">PT. Singkawang Trans</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-600">Periode</div>
          <div className="relative mt-1">
            <select
              className="form-input pr-8 text-sm w-full"
              value={filters.periode}
              onChange={e => onChange({ periode: e.target.value as SJFilterState['periode'] })}
            >
              <option value="today">Hari Ini</option>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
              <option value="last_month">Bulan Lalu</option>
              <option value="all">Semua</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  )
}
