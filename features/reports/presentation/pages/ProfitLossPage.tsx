'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Download, RefreshCw, TrendingUp, TrendingDown, Receipt, Truck, Percent, SlidersHorizontal, Info } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { RootState } from '@/store'
import { useProfitLoss } from '../hooks/useProfitLoss'
import { useReportExport } from '../hooks/useReportExport'
import CacheStatusBadge from '../components/CacheStatusBadge'
import ProfitLossTable from '../components/ProfitLossTable'
import { formatRupiah, formatRupiahShort } from '@/lib/formatters'
import { ProfitabilityFilter } from '@/features/reports/application/dto/ProfitLossFilterDto'

const PERIOD_OPTIONS = [
  { value: 'this_month', label: 'Bulan Ini' },
  { value: 'this_quarter', label: 'Kuartal Ini' },
  { value: '6_months', label: '6 Bulan' },
  { value: 'custom', label: 'Custom' },
]

export default function ProfitLossPage() {
  const router = useRouter()
  const user = useSelector((state: RootState) => state.auth.user)
  const { data, filters, isLoading, lastRefreshed, refresh, setFilters } = useProfitLoss()
  const { isExporting, exportProfitLoss } = useReportExport()

  useEffect(() => {
    if (user && user.role !== 'super_admin') {
      router.replace('/dashboard')
    }
  }, [user, router])

  if (user && user.role !== 'super_admin') return null

  const chartData = data?.projects.map(p => ({
    name: p.project_code,
    fullName: p.project_name,
    'Revenue': p.revenue_paid,
    'Biaya Ops': p.total_operational_cost,
    'Gross Profit': p.gross_profit,
  })) ?? []

  const summaryCards = data ? [
    {
      icon: TrendingUp,
      value: formatRupiah(data.total_gross_profit),
      label: 'Total Gross Profit',
      sub: `${data.profitable_count} proyek profit · ${data.loss_count} rugi`,
      borderColor: '#16A34A',
      valueColor: '#15803D',
      bgIcon: '#F0FDF4',
      iconColor: '#16A34A',
    },
    {
      icon: Receipt,
      value: formatRupiah(data.total_revenue_paid),
      label: 'Total Revenue Terbayar',
      sub: `Dari ${data.projects.reduce((s, p) => s + p.invoice_paid_count, 0)} invoice lunas`,
      borderColor: '#1D4ED8',
      valueColor: '#1D4ED8',
      bgIcon: '#EFF6FF',
      iconColor: '#1D4ED8',
    },
    {
      icon: Truck,
      value: formatRupiah(data.total_operational_cost),
      label: 'Total Biaya Operasional',
      sub: `Dari ${data.projects.reduce((s, p) => s + p.sj_count, 0)} Surat Jalan`,
      borderColor: '#6B7280',
      valueColor: 'var(--text-primary)',
      bgIcon: '#F9FAFB',
      iconColor: '#6B7280',
    },
    {
      icon: data.average_margin !== null && data.average_margin > 0 ? Percent : TrendingDown,
      value: data.average_margin !== null ? `${data.average_margin.toFixed(1)}%` : '—',
      label: 'Rata-rata Margin',
      sub: `${data.project_count} proyek dalam periode ini`,
      borderColor: data.average_margin !== null && data.average_margin > 0 ? '#16A34A' : '#DC2626',
      valueColor: data.average_margin !== null && data.average_margin > 0 ? '#15803D' : '#DC2626',
      bgIcon: data.average_margin !== null && data.average_margin > 0 ? '#F0FDF4' : '#FEF2F2',
      iconColor: data.average_margin !== null && data.average_margin > 0 ? '#16A34A' : '#DC2626',
    },
  ] : []

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
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Profit &amp; Loss</span>
          </nav>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Laporan Profit &amp; Loss per Proyek
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Analisis profitabilitas proyek berdasarkan revenue terbayar dan biaya operasional
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => data && exportProfitLoss(data)}
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
      <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={14} style={{ color: 'var(--text-secondary)' }} />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>FILTER PERIODE & PROYEK</span>
        </div>

        {/* Period Tab Selector */}
        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: 'var(--text-secondary)' }}>Periode</label>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map(opt => {
              const isActive = filters.periodPreset === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setFilters({ periodPreset: opt.value as typeof filters.periodPreset })}
                  className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? 'var(--green-primary)' : 'var(--bg-card)',
                    color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    border: isActive ? '1px solid var(--green-primary)' : '1px solid var(--border-card)',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {filters.periodPreset === 'custom' && (
            <div className="flex items-center gap-2 mt-3">
              <input
                type="date"
                value={filters.periodFrom}
                onChange={e => setFilters({ periodFrom: e.target.value })}
                className="form-input"
                style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '13px' }}
              />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>s/d</span>
              <input
                type="date"
                value={filters.periodTo}
                onChange={e => setFilters({ periodTo: e.target.value })}
                className="form-input"
                style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '13px' }}
              />
            </div>
          )}
        </div>

        {/* Status & Profitabilitas */}
        <div className="flex flex-wrap items-end gap-3 pt-1 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Status Proyek</label>
            <select
              value={filters.projectStatus}
              onChange={e => setFilters({ projectStatus: e.target.value })}
              className="form-input"
              style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '13px', minWidth: '150px' }}
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="completed">Selesai</option>
              <option value="on_hold">Ditunda</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Profitabilitas</label>
            <select
              value={filters.profitability}
              onChange={e => setFilters({ profitability: e.target.value as ProfitabilityFilter })}
              className="form-input"
              style={{ padding: '7px 12px', borderRadius: '10px', fontSize: '13px', minWidth: '150px' }}
            >
              <option value="all">Semua</option>
              <option value="profit">Profit</option>
              <option value="loss">Rugi</option>
              <option value="no_data">Belum Ada Data</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: '#F3F4F6', border: '1px solid var(--border-light)' }} />
          ))
        ) : summaryCards.map((card, i) => {
          const Icon = card.icon
          return (
            <div
              key={i}
              className="rounded-2xl p-4"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderTop: '1px solid var(--border-light)',
                borderRight: '1px solid var(--border-light)',
                borderBottom: '1px solid var(--border-light)',
                borderLeft: `4px solid ${card.borderColor}`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: card.bgIcon }}
                >
                  <Icon size={15} style={{ color: card.iconColor }} />
                </div>
              </div>
              <div className="font-bold font-mono text-lg leading-tight mb-1" style={{ color: card.valueColor }}>
                {card.value}
              </div>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
              {card.sub && <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>{card.sub}</div>}
            </div>
          )
        })}
      </div>

      {/* Bar Chart */}
      {data && chartData.length > 0 && (
        <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Revenue vs Biaya per Proyek</h2>
            <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span>Total Revenue: <strong className="font-mono" style={{ color: '#15803D' }}>{formatRupiahShort(data.total_revenue_paid)}</strong></span>
              <span>Total Biaya: <strong className="font-mono" style={{ color: '#DC2626' }}>{formatRupiahShort(data.total_operational_cost)}</strong></span>
              <span>Avg Margin: <strong className="font-mono" style={{ color: data.average_margin && data.average_margin > 0 ? '#15803D' : '#DC2626' }}>{data.average_margin !== null ? `${data.average_margin.toFixed(1)}%` : '—'}</strong></span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                angle={-30}
                textAnchor="end"
                interval={0}
                height={55}
              />
              <YAxis
                tickFormatter={v => formatRupiahShort(v)}
                tick={{ fontSize: 10, fill: '#6B7280' }}
                width={70}
              />
              <Tooltip
                formatter={(value, name) => [typeof value === 'number' ? formatRupiah(value) : String(value), name as string]}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
                contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar dataKey="Revenue" fill="#16A34A" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Biaya Ops" fill="#EF4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Gross Profit" fill="#60A5FA" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detail Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Rincian P&amp;L per Proyek</h2>
            {data && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Periode: {data.period_from} — {data.period_to}
              </p>
            )}
          </div>
          {data && (
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
              {data.project_count} proyek
            </span>
          )}
        </div>
        <ProfitLossTable
          data={data ?? { projects: [], period_from: '', period_to: '', cached_at: null, total_revenue_paid: 0, total_operational_cost: 0, total_gross_profit: 0, average_margin: null, project_count: 0, profitable_count: 0, loss_count: 0 }}
          isLoading={isLoading}
        />
      </div>

      {/* Info Metodologi */}
      <div className="rounded-2xl p-4 flex gap-3" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <Info size={16} className="shrink-0 mt-0.5" style={{ color: '#1D4ED8' }} />
        <div>
          <h3 className="text-sm font-semibold mb-1" style={{ color: '#1E40AF' }}>Tentang Kalkulasi P&amp;L</h3>
          <div className="text-xs space-y-1" style={{ color: '#1D4ED8' }}>
            <p>Revenue yang digunakan adalah invoice berstatus <strong>LUNAS (PAID)</strong>. Invoice OUTSTANDING tidak masuk ke kalkulasi karena belum direalisasikan sebagai pendapatan.</p>
            <p>Biaya Operasional dihitung dari total biaya jalan + BBM semua Surat Jalan dalam proyek (<code>operational_cost</code> di SJ).</p>
          </div>
        </div>
      </div>

    </div>
  )
}
