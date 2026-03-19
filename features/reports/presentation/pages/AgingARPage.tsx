'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Download, RefreshCw, DollarSign, Clock, AlertCircle, Search, SlidersHorizontal } from 'lucide-react'
import { RootState } from '@/store'
import { useAgingAR } from '../hooks/useAgingAR'
import { useReportExport } from '../hooks/useReportExport'
import CacheStatusBadge from '../components/CacheStatusBadge'
import AgingBucketBar from '../components/AgingBucketBar'
import AgingARTable from '../components/AgingARTable'
import { AgingBucket, AGING_BUCKET_CONFIG, ALL_BUCKETS } from '@/features/reports/domain/value-objects/AgingBucket'
import { formatRupiah, formatRupiahShort } from '@/lib/formatters'

export default function AgingARPage() {
  const router = useRouter()
  const user = useSelector((state: RootState) => state.auth.user)
  const { data, filters, isLoading, lastRefreshed, refresh, setFilters } = useAgingAR()
  const { isExporting, exportAgingAR } = useReportExport()

  useEffect(() => {
    if (user && !['super_admin', 'admin_finance'].includes(user.role)) {
      router.replace('/dashboard')
    }
  }, [user, router])

  if (user && !['super_admin', 'admin_finance'].includes(user.role)) return null

  const customerOptions = data?.customers.map(c => ({ value: c.customer_id, label: c.customer_name })) ?? []

  const hasActiveFilter = filters.customerId !== 'all' || filters.bucket !== 'all' || filters.search

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
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Aging AR</span>
          </nav>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Laporan Aging Piutang (AR)
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Analisis umur tagihan per customer berdasarkan bucket overdue
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => data && exportAgingAR(data)}
            disabled={isExporting || !data}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-primary)' }}
          >
            {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            Export Excel
          </button>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--green-primary)', color: '#FFFFFF' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Cache Status */}
      <CacheStatusBadge lastRefreshed={lastRefreshed} onRefresh={refresh} isRefreshing={isLoading} />

      {/* Filter Bar */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal size={14} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>FILTER</span>
          {hasActiveFilter && (
            <button
              onClick={() => setFilters({ customerId: 'all', bucket: 'all', search: '' })}
              className="ml-auto text-xs font-medium px-2 py-0.5 rounded-lg"
              style={{ color: '#DC2626', backgroundColor: '#FEF2F2' }}
            >
              Reset Filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Customer */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Customer</label>
            <select
              value={filters.customerId}
              onChange={e => setFilters({ customerId: e.target.value === 'all' ? 'all' : parseInt(e.target.value) })}
              className="form-input"
              style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '13px', minWidth: '160px' }}
            >
              <option value="all">Semua Customer</option>
              {customerOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {/* Bucket */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Aging Bucket</label>
            <select
              value={filters.bucket}
              onChange={e => setFilters({ bucket: e.target.value as AgingBucket | 'all' })}
              className="form-input"
              style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '13px', minWidth: '160px' }}
            >
              <option value="all">Semua Bucket</option>
              {ALL_BUCKETS.map(b => <option key={b} value={b}>{AGING_BUCKET_CONFIG[b].label}</option>)}
            </select>
          </div>
          {/* Search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Pencarian</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                value={filters.search}
                onChange={e => setFilters({ search: e.target.value })}
                placeholder="Cari nama customer / no. invoice..."
                className="form-input w-full"
                style={{ paddingLeft: '34px', padding: '7px 12px 7px 34px', borderRadius: '10px', fontSize: '13px' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Total Outstanding Card */}
      {isLoading ? (
        <div className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: '#F3F4F6', border: '1px solid var(--border-light)' }} />
      ) : data && (
        <div
          className="rounded-2xl p-5 flex items-center gap-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderTop: '1px solid var(--border-card)',
            borderRight: '1px solid var(--border-card)',
            borderBottom: '1px solid var(--border-card)',
            borderLeft: '4px solid #1E3A1E',
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#F0FDF4' }}
          >
            <DollarSign size={22} style={{ color: '#15803D' }} />
          </div>
          <div className="flex-1">
            <div className="text-2xl font-bold font-mono" style={{ color: 'var(--text-primary)' }}>
              {formatRupiah(data.total_outstanding)}
            </div>
            <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-secondary)' }}>Total Piutang Aktif</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              {data.customer_count} customer · {data.invoice_count} invoice outstanding · Per tanggal: {data.as_of_date}
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6 shrink-0 pr-2">
            <div className="text-center">
              <div className="text-xl font-bold font-mono" style={{ color: '#DC2626' }}>
                {formatRupiahShort(data.bucket_totals[AgingBucket.OVER_90] + data.bucket_totals[AgingBucket.DAYS_61_90])}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#DC2626' }}>Kritis (&gt;60 hari)</div>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: 'var(--border-light)' }} />
            <div className="text-center">
              <div className="text-xl font-bold font-mono" style={{ color: '#D97706' }}>
                {formatRupiahShort(data.bucket_totals[AgingBucket.DAYS_1_30] + data.bucket_totals[AgingBucket.DAYS_31_60])}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#D97706' }}>Perhatian (1–60 hari)</div>
            </div>
          </div>
        </div>
      )}

      {/* Bucket Cards (5 kolom) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: '#F3F4F6', border: '1px solid var(--border-light)' }} />
          ))
        ) : data && ALL_BUCKETS.map(bucket => {
          const cfg = AGING_BUCKET_CONFIG[bucket]
          const val = data.bucket_totals[bucket]
          const invCount = data.customers.reduce((s, c) =>
            s + c.invoices.filter(inv => inv.aging_bucket === bucket).length, 0)
          const isEmpty = val === 0

          return (
            <div
              key={bucket}
              className="rounded-2xl p-4"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderTop: '1px solid var(--border-light)',
                borderRight: '1px solid var(--border-light)',
                borderBottom: '1px solid var(--border-light)',
                borderLeft: `4px solid ${isEmpty ? '#E5E7EB' : cfg.border}`,
                opacity: isEmpty ? 0.55 : 1,
              }}
            >
              <Clock size={13} className="mb-2" style={{ color: isEmpty ? '#D1D5DB' : cfg.color }} />
              <div
                className="font-bold font-mono text-base leading-tight mb-1"
                style={{ color: isEmpty ? '#D1D5DB' : cfg.color }}
              >
                {isEmpty ? '—' : formatRupiahShort(val)}
              </div>
              <div className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{cfg.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {isEmpty ? 'Tidak ada piutang' : `${invCount} invoice`}
              </div>
            </div>
          )
        })}
      </div>

      {/* Aging Bucket Bar */}
      {data && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Distribusi Aging Piutang</h2>
          <AgingBucketBar bucketTotals={data.bucket_totals} totalAmount={data.total_outstanding} animated />
        </div>
      )}

      {/* Detail Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Rincian Piutang per Customer</h2>
            {data && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Klik baris customer untuk melihat detail invoice
              </p>
            )}
          </div>
          {data && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
              {data.customer_count} customer
            </span>
          )}
        </div>
        <AgingARTable
          data={data ?? { customers: [], bucket_totals: { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '>90': 0 }, total_outstanding: 0, customer_count: 0, invoice_count: 0, as_of_date: '', cached_at: null }}
          isLoading={isLoading}
        />
      </div>

    </div>
  )
}
