'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Search, SlidersHorizontal, ShieldCheck } from 'lucide-react'
import { RootState } from '@/store'
import { useAuditTrail } from '../hooks/useAuditTrail'
import AuditTrailTable from '../components/AuditTrailTable'
import { MODULE_LABELS, ACTION_BADGE_CONFIG } from '@/features/reports/domain/entities/AuditLog'

export default function AuditTrailPage() {
  const router = useRouter()
  const user = useSelector((state: RootState) => state.auth.user)
  const { logs, filters, pagination, isLoading, setFilters, setPage } = useAuditTrail()

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      router.replace('/dashboard')
    }
  }, [user, router])

  if (user && user.role !== 'super_admin') return null

  const moduleOptions = [
    { value: 'all', label: 'Semua Modul' },
    ...Object.entries(MODULE_LABELS).map(([value, label]) => ({ value, label })),
  ]

  const actionOptions = [
    { value: 'all', label: 'Semua Aksi' },
    ...Object.entries(ACTION_BADGE_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label })),
  ]

  const hasActiveFilter = filters.search || filters.module !== 'all' || filters.action !== 'all'

  return (
    <div className="animate-fadeIn space-y-5">

      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Dashboard</span>
            <span>/</span>
            <span>Laporan</span>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Audit Trail</span>
          </nav>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Audit Trail</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Rekaman seluruh aktivitas pengguna sistem · Read-only, tidak dapat dihapus
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl shrink-0"
          style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}
        >
          <ShieldCheck size={15} style={{ color: '#15803D' }} />
          <span className="text-xs font-medium" style={{ color: '#15803D' }}>
            {pagination.total} log tercatat
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>FILTER LOG</span>
          {hasActiveFilter && (
            <button
              onClick={() => setFilters({ search: '', module: 'all', action: 'all' })}
              className="ml-auto text-xs font-medium px-2 py-0.5 rounded-lg"
              style={{ color: '#DC2626', backgroundColor: '#FEF2F2' }}
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            value={filters.search}
            onChange={e => setFilters({ search: e.target.value })}
            placeholder="Cari aksi, nama user, atau record ID..."
            className="form-input w-full"
            style={{ paddingLeft: '38px', padding: '9px 14px 9px 38px', borderRadius: '12px', fontSize: '13px' }}
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Modul</label>
            <select
              value={filters.module}
              onChange={e => setFilters({ module: e.target.value })}
              className="form-input"
              style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '13px', minWidth: '160px' }}
            >
              {moduleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Tipe Aksi</label>
            <select
              value={filters.action}
              onChange={e => setFilters({ action: e.target.value })}
              className="form-input"
              style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '13px', minWidth: '160px' }}
            >
              {actionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="ml-auto self-end">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Menampilkan <strong style={{ color: 'var(--text-primary)' }}>{logs.length}</strong> dari <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> log
            </span>
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Daftar Log Aktivitas</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Semua aksi tersimpan otomatis dan tidak dapat dimanipulasi
          </p>
        </div>
        <AuditTrailTable
          logs={logs}
          isLoading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
        />
      </div>

    </div>
  )
}
