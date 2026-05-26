'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Pencil, ToggleLeft, X, Filter, RotateCcw, ChevronDown } from 'lucide-react'
import { useDriver } from '../hooks/useDriver'
import DriverFormModal from '../components/DriverFormModal'
import FleetLampiranModal from '../components/FleetLampiranModal'
import SIMStatusBadge from '@/components/ui/SIMStatusBadge'
import { useToast } from '@/components/toast/useToast'
import { Driver, SIMStatus } from '@/features/master/domain/entities/Driver'
import { formatDate } from '@/lib/formatters'
import { PendingFleetLampiran } from '../components/FleetLampiranUploadZone'
import { downloadDriverLampiran, uploadDriverLampiran } from '../../infrastructure/repositories/MockMasterRepository'
import TablePagination from '../components/TablePagination'

const ROWS_PER_PAGE = 10

export default function DriverListPage() {
  const { drivers, isLoading, modal, openForm, closeForm, create, update, toggle, refresh } = useDriver()
  const { push: pushToast } = useToast()

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterSIM, setFilterSIM] = useState<SIMStatus | 'all'>('all')
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lampiranDriver, setLampiranDriver] = useState<Driver | null>(null)
  const [page, setPage] = useState(1)

  const resetFilters = () => { setSearch(''); setFilterStatus('all'); setFilterSIM('all'); setPage(1) }

  const attentionDrivers = useMemo(() =>
    drivers.filter(d => d.status === 'active' && (d.sim_status === 'expired' || d.sim_status === 'expiring_soon')),
    [drivers]
  )

  const filtered = useMemo(() => drivers.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || d.name.toLowerCase().includes(q) || (d.sim_number?.toLowerCase().includes(q))
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    const matchSIM = filterSIM === 'all' || d.sim_status === filterSIM
    return matchSearch && matchStatus && matchSIM
  }), [drivers, search, filterStatus, filterSIM])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE)

  const handleSubmit = async (data: Parameters<typeof create>[0], pendingLampiran: PendingFleetLampiran[]) => {
    setSubmitting(true)
    try {
      const action = modal.data
        ? await update(modal.data.uuid, data as Partial<Driver>)
        : await create(data)
      if ((action as { meta?: { requestStatus?: string } }).meta?.requestStatus === 'rejected') {
        pushToast({ title: 'Gagal menyimpan data supir', variant: 'error' })
        return
      }

      const savedDriver = (action as { payload?: Driver }).payload
      if (!savedDriver) {
        pushToast({ title: 'Gagal menyimpan data supir', variant: 'error' })
        return
      }

      for (const item of pendingLampiran) {
        await uploadDriverLampiran(savedDriver.uuid, item.file)
      }
      if (pendingLampiran.length > 0) await refresh()
      closeForm()
      pushToast({ title: modal.data ? 'Data supir diperbarui' : 'Supir berhasil ditambahkan', variant: 'success' })
    } catch {
      pushToast({ title: 'Gagal menyimpan data supir', variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (driver: Driver) => {
    await toggle(driver.uuid)
    pushToast({ title: `Supir ${driver.status === 'active' ? 'dinonaktifkan' : 'diaktifkan'}`, variant: 'success' })
  }

  const rowBg = (d: Driver) => {
    if (d.sim_status === 'expired') return '#FFF5F5'
    if (d.sim_status === 'expiring_soon') return '#FFFBEB'
    return undefined
  }

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const avatarColor = (d: Driver) => {
    if (d.sim_status === 'expired') return '#FEE2E2'
    if (d.sim_status === 'expiring_soon') return '#FEF3C7'
    return '#D1FAE5'
  }
  const avatarText = (d: Driver) => {
    if (d.sim_status === 'expired') return '#B91C1C'
    if (d.sim_status === 'expiring_soon') return '#92400E'
    return '#065F46'
  }

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div data-tour="supir-header" className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Dashboard</span><span>/</span><span>Master Data</span><span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Supir</span>
          </nav>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Master Supir</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{drivers.length} supir terdaftar</p>
        </div>
        <button data-tour="supir-add-btn" onClick={() => openForm(null)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
          <Plus size={15} /> Tambah Supir
        </button>
      </div>

      {/* Alert Banner */}
      {!alertDismissed && attentionDrivers.length > 0 && (
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <div className="shrink-0 mt-0.5">⚠️</div>
          <div className="flex-1">
            <div className="font-semibold text-sm" style={{ color: '#92400E' }}>Perhatian SIM Supir</div>
            <div className="text-sm mt-1" style={{ color: '#78350F' }}>
              {attentionDrivers.length} supir memerlukan perhatian:
            </div>
            <ul className="mt-1 space-y-0.5">
              {attentionDrivers.map(d => (
                <li key={d.uuid} className="text-sm" style={{ color: '#78350F' }}>
                  · {d.name} — {d.sim_status === 'expired'
                    ? `SIM sudah kadaluarsa (${formatDate(d.sim_expired_at!)})`
                    : `SIM kadaluarsa dalam ${d.days_until_sim_expiry} hari (${formatDate(d.sim_expired_at!)})`}
                </li>
              ))}
            </ul>
          </div>
          <button onClick={() => setAlertDismissed(true)} className="p-1 shrink-0">
            <X size={14} style={{ color: '#92400E' }} />
          </button>
        </div>
      )}

      {/* Filter */}
      <div className="bg-white rounded-xl border shadow-sm px-5 py-4" style={{ borderColor: 'var(--border-card)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-60">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="form-input w-full"
              placeholder="Cari nama supir, no. SIM..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
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
            <div className="text-xs text-gray-600">Status</div>
            <div className="relative mt-1">
              <select className="form-input text-sm w-full pr-8" value={filterStatus} onChange={e => { setFilterStatus(e.target.value as typeof filterStatus); setPage(1) }}>
                <option value="all">Semua</option>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600">Status SIM</div>
            <div className="relative mt-1">
              <select className="form-input text-sm w-full pr-8" value={filterSIM} onChange={e => { setFilterSIM(e.target.value as typeof filterSIM); setPage(1) }}>
                <option value="all">Semua</option>
                <option value="valid">Valid</option>
                <option value="expiring_soon">Akan Kadaluarsa</option>
                <option value="expired">Sudah Kadaluarsa</option>
                <option value="no_sim">Belum Ada SIM</option>
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div data-tour="supir-table" className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-secondary)' }}>
            <p className="text-sm">Tidak ada supir ditemukan</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-card)', backgroundColor: 'var(--bg-page)' }}>
                  {['Nama Supir', 'Telepon', 'No. SIM', 'Status SIM', 'Status', 'Trip Bulan Ini', 'Lampiran', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((d, i) => (
                <tr
                  key={d.uuid}
                  style={{
                    borderBottom: i < paginated.length - 1 ? '1px solid var(--border-card)' : 'none',
                    backgroundColor: rowBg(d),
                    opacity: d.status === 'inactive' ? 0.7 : 1,
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: avatarColor(d), color: avatarText(d) }}>
                        {initials(d.name)}
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{d.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{d.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    {d.sim_number ? (
                      <span className="font-mono text-xs" style={{ color: 'var(--text-primary)' }}>{d.sim_number}</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#4B5563' }}>Belum ada SIM</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SIMStatusBadge status={d.sim_status} daysUntilExpiry={d.days_until_sim_expiry} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: d.status === 'active' ? '#D1FAE5' : '#F1F5F9',
                        color: d.status === 'active' ? '#065F46' : '#475569',
                      }}>
                      {d.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {d.total_trips}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {(d.lampiran_paths ?? []).length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setLampiranDriver(d)}
                        className="font-medium underline underline-offset-2"
                        style={{ color: '#2563EB' }}
                      >
                        lihat
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openForm(d)} className="p-1.5 rounded-lg hover:bg-blue-50" title="Edit">
                        <Pencil size={13} className="text-blue-600" />
                      </button>
                      <button onClick={() => handleToggle(d)} className="p-1.5 rounded-lg hover:bg-amber-50" title={d.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}>
                        <ToggleLeft size={13} className="text-amber-600" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
            <TablePagination page={currentPage} perPage={ROWS_PER_PAGE} total={filtered.length} label="supir" onPageChange={setPage} />
          </>
        )}
      </div>

      <DriverFormModal
        open={modal.open}
        data={modal.data}
        isLoading={isLoading || submitting}
        onClose={closeForm}
        onSubmit={handleSubmit}
      />
      <FleetLampiranModal
        open={!!lampiranDriver}
        title="Lampiran Supir"
        subtitle={lampiranDriver?.name}
        recordUuid={lampiranDriver?.uuid ?? null}
        paths={lampiranDriver?.lampiran_paths ?? []}
        downloadLampiran={downloadDriverLampiran}
        onClose={() => setLampiranDriver(null)}
      />
    </div>
  )
}
