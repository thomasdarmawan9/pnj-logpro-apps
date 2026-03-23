'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, Truck, ToggleLeft, Filter, RotateCcw, ChevronDown } from 'lucide-react'
import { useFleet } from '../hooks/useFleet'
import FleetFormModal from '../components/FleetFormModal'
import FleetCategoryBadge from '@/components/ui/FleetCategoryBadge'
import FleetStatusBadge from '@/components/ui/FleetStatusBadge'
import { useToast } from '@/components/toast/useToast'
import { Fleet, FleetCategory, FleetStatus } from '@/features/master/domain/entities/Fleet'

export default function FleetListPage() {
  const { fleets, isLoading, modal, openForm, closeForm, create, update, toggle } = useFleet()
  const { push: pushToast } = useToast()

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<FleetCategory | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<FleetStatus | 'all'>('all')

  const resetFilters = () => { setSearch(''); setFilterCategory('all'); setFilterStatus('all') }

  const nonTBD = useMemo(() => fleets.filter(f => !f.is_tbd), [fleets])
  const activeCount = nonTBD.filter(f => f.status === 'active').length
  const inactiveCount = nonTBD.filter(f => f.status === 'inactive').length
  const soldCount = nonTBD.filter(f => f.status === 'sold').length

  const filtered = useMemo(() => fleets.filter(f => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      f.plate_number.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      (f.brand?.toLowerCase().includes(q))
    const matchCat = filterCategory === 'all' || f.category === filterCategory
    const matchStatus = filterStatus === 'all' || f.status === filterStatus
    return matchSearch && matchCat && matchStatus
  }), [fleets, search, filterCategory, filterStatus])

  const handleSubmit = async (data: Parameters<typeof create>[0]) => {
    const action = modal.data
      ? await update(modal.data.uuid, data as Partial<Fleet>)
      : await create(data)
    if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
      pushToast({ title: 'Gagal menyimpan armada', variant: 'error' })
    } else {
      pushToast({ title: modal.data ? 'Armada diperbarui' : 'Armada berhasil ditambahkan', variant: 'success' })
    }
  }

  const handleToggle = async (fleet: Fleet) => {
    await toggle(fleet.uuid)
    pushToast({ title: `Armada ${fleet.status === 'active' ? 'dinonaktifkan' : 'diaktifkan'}`, variant: 'success' })
  }

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Dashboard</span><span>/</span><span>Master Data</span><span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Armada</span>
          </nav>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Master Armada</h1>
        </div>
        <button onClick={() => openForm(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
          <Plus size={15} /> Tambah Armada
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Aktif', count: activeCount, color: '#D1FAE5', text: '#065F46' },
          { label: 'Tidak Aktif', count: inactiveCount, color: '#FEF3C7', text: '#92400E' },
          { label: 'Terjual', count: soldCount, color: '#F1F5F9', text: '#475569' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.color }}>
              <Truck size={18} style={{ color: s.text }} />
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.count}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border shadow-sm px-5 py-4" style={{ borderColor: 'var(--border-card)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-60">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="form-input w-full"
              placeholder="Cari plat, nama, merk..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            <Filter size={14} className="text-gray-500" />
            Filter
          </div>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-secondary)' }}
          >
            <RotateCcw size={14} />
            Reset Filter
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <div className="text-xs text-gray-600">Kategori</div>
            <div className="relative mt-1">
              <select className="form-input text-sm w-full pr-8" value={filterCategory} onChange={e => setFilterCategory(e.target.value as typeof filterCategory)}>
                <option value="all">Semua</option>
                <option value="truck">Truck</option>
                <option value="trailer">Trailer</option>
                <option value="family_car">Mobil Keluarga</option>
                <option value="heavy_equipment">Alat Berat</option>
                <option value="other">Lainnya</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Status</div>
            <div className="relative mt-1">
              <select className="form-input text-sm w-full pr-8" value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}>
                <option value="all">Semua</option>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
                <option value="sold">Terjual</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-card)', backgroundColor: 'var(--bg-page)' }}>
                {['Plat & Nama', 'Kategori', 'Merk & Tahun', 'Kapasitas', 'Status', 'Trip Bulan Ini', 'Aksi'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => (
                <tr
                  key={f.uuid}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border-card)' : 'none',
                    backgroundColor: f.is_tbd ? '#F8FAFC' : undefined,
                    opacity: f.is_tbd ? 0.7 : 1,
                  }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-sm" style={{ color: '#16A34A' }}>{f.plate_number}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{f.name}</div>
                  </td>
                  <td className="px-4 py-3"><FleetCategoryBadge category={f.category} /></td>
                  <td className="px-4 py-3">
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {f.brand && f.year ? `${f.brand} · ${f.year}` : f.brand ?? f.year ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {f.capacity_ton != null ? `${f.capacity_ton} ton` : '—'}
                  </td>
                  <td className="px-4 py-3"><FleetStatusBadge status={f.status} /></td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {f.is_tbd ? '—' : f.active_days_this_month}
                  </td>
                  <td className="px-4 py-3">
                    {!f.is_tbd ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openForm(f)} className="p-1.5 rounded-lg hover:bg-blue-50" title="Edit">
                          <Pencil size={13} className="text-blue-600" />
                        </button>
                        <button onClick={() => handleToggle(f)} className="p-1.5 rounded-lg hover:bg-amber-50" title={f.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}>
                          <ToggleLeft size={13} className="text-amber-600" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tidak bisa diedit</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <FleetFormModal
        open={modal.open}
        data={modal.data}
        isLoading={isLoading}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
