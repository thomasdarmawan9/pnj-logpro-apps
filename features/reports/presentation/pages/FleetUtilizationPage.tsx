'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { BarChart3, Download, Truck, Route, DollarSign, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { RootState } from '@/store'
import { useFleetUtilization } from '../hooks/useFleetUtilization'
import { formatRupiah } from '@/lib/formatters'
import FleetCategoryBadge from '@/components/ui/FleetCategoryBadge'
import { FleetCategory } from '@/features/master/domain/entities/Fleet'
import { exportFleetUtilizationReport } from '../../infrastructure/repositories/MockReportsRepository'

const barColor = (pct: number) =>
  pct >= 70 ? '#16A34A' :
  pct >= 40 ? '#D97706' :
  pct > 0   ? '#EA580C' :
  '#9CA3AF'

const UtilizationBar = ({ percent }: { percent: number }) => {
  const color = barColor(percent)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB', width: 80 }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums" style={{ color, minWidth: 40 }}>
        {percent > 0 ? `${percent.toFixed(1)}%` : '0%'}
      </span>
    </div>
  )
}

export default function FleetUtilizationPage() {
  const router = useRouter()
  const user = useSelector((s: RootState) => s.auth.user)
  const { data, filteredFleets, filters, isLoading, refresh, updateFilters } = useFleetUtilization()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await exportFleetUtilizationReport(filters)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `fleet-utilization-${new Date().toISOString().slice(0, 10)}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    if (user && user.role !== 'super_admin') router.replace('/dashboard')
  }, [user, router])

  if (user && user.role !== 'super_admin') return null

  const chartData = filteredFleets.map(f => ({
    name: `${f.plate_number}`,
    pct: f.utilization_percent,
    fleet: f,
  }))

  const totalCostPerTrip = data.total_trips > 0
    ? Math.round(data.total_operational_cost / data.total_trips)
    : 0

  return (
    <div className="animate-fadeIn space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <nav className="text-xs mb-1.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
            <span>Dashboard</span><span>/</span><span>Laporan</span><span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Utilisasi Armada</span>
          </nav>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Laporan Utilisasi Armada</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Analisis pemakaian unit kendaraan dalam periode tertentu
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-primary)' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            <Download size={14} className={isExporting ? 'animate-bounce' : ''} />
            {isExporting ? 'Mengekspor...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl p-4 flex flex-wrap gap-4 items-end" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Periode</p>
          <div className="flex gap-2">
            {[
              { value: 'this_month', label: 'Bulan Ini' },
              { value: 'last_month', label: 'Bulan Lalu' },
              { value: 'custom', label: 'Custom' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => updateFilters({ periodPreset: opt.value as typeof filters.periodPreset })}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  backgroundColor: filters.periodPreset === opt.value ? 'var(--green-primary)' : 'var(--bg-page)',
                  color: filters.periodPreset === opt.value ? '#FFF' : 'var(--text-secondary)',
                  border: `1px solid ${filters.periodPreset === opt.value ? 'var(--green-primary)' : 'var(--border-card)'}`,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {filters.periodPreset === 'custom' && (
          <div className="flex gap-2 items-end">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Dari</p>
              <input type="date" className="form-input text-sm" value={filters.periodFrom} onChange={e => updateFilters({ periodFrom: e.target.value })} />
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>s/d</p>
              <input type="date" className="form-input text-sm" value={filters.periodTo} onChange={e => updateFilters({ periodTo: e.target.value })} />
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Kategori</p>
          <select
            className="form-input"
            value={filters.category}
            onChange={e => updateFilters({ category: e.target.value as FleetCategory | 'all' })}
          >
            <option value="all">Semua</option>
            <option value="truck">Truck</option>
            <option value="trailer">Trailer</option>
            <option value="family_car">Mobil Keluarga</option>
            <option value="heavy_equipment">Alat Berat</option>
            <option value="other">Lainnya</option>
          </select>
        </div>

        <button
          onClick={refresh}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          Terapkan Filter
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            icon: Truck, borderColor: '#16A34A', iconBg: '#D1FAE5', iconColor: '#16A34A',
            value: `${data.active_fleets} dari ${data.total_fleets}`,
            label: 'Armada Aktif',
            sub: `${data.idle_fleets} unit tidak ada trip`,
          },
          {
            icon: BarChart3, borderColor: '#3B82F6', iconBg: '#DBEAFE', iconColor: '#1D4ED8',
            value: `${data.avg_utilization.toFixed(1)}%`,
            label: 'Rata-rata Utilisasi',
            sub: `${Math.round((new Date(data.period_to).getTime() - new Date(data.period_from).getTime()) / 86400000) + 1} hari periode`,
          },
          {
            icon: Route, borderColor: '#6B7280', iconBg: '#F1F5F9', iconColor: '#475569',
            value: String(data.total_trips),
            label: 'Total Trip',
            sub: 'Periode ini',
          },
          {
            icon: DollarSign, borderColor: '#D97706', iconBg: '#FEF3C7', iconColor: '#92400E',
            value: data.total_operational_cost >= 1_000_000
              ? `Rp ${(data.total_operational_cost / 1_000_000).toFixed(2)}Jt`
              : formatRupiah(data.total_operational_cost),
            label: 'Total Biaya Ops',
            sub: totalCostPerTrip > 0 ? `Rata-rata Rp ${(totalCostPerTrip / 1000).toFixed(0)}Rb/trip` : '—',
          },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-2xl p-4"
            style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${card.borderColor}22` }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: card.iconBg }}>
                <card.icon size={18} style={{ color: card.iconColor }} />
              </div>
              <div>
                <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.value}</div>
                <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>{card.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Utilisasi per Armada (%)</h3>
        <ResponsiveContainer width="100%" height={Math.max(chartData.length * 48, 200)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 16, right: 48, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={100}
              tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            />
            <Tooltip
              formatter={(value) => {
                const num = typeof value === 'number' ? value : Number(value)
                const display = Number.isFinite(num) ? `${num.toFixed(1)}%` : '—'
                return [display, 'Utilisasi']
              }}
              labelFormatter={(label) => (typeof label === 'string' ? label : '')}
            />
            <Bar
              dataKey="pct"
              radius={[0, 4, 4, 0]}
              label={{
                position: 'right',
                fontSize: 11,
                formatter: (v) => {
                  const num = typeof v === 'number' ? v : Number(v)
                  return Number.isFinite(num) && num > 0 ? `${num.toFixed(1)}%` : 'Tidak ada trip'
                },
              }}
            >
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={barColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail Table */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-card)' }}>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Detail Utilisasi per Armada</h3>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{filteredFleets.length} armada</span>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-card)', backgroundColor: 'var(--bg-page)' }}>
                {['Armada', 'Kategori', 'Total Trip', 'Hari Aktif', 'Utilisasi', 'Biaya Ops', 'Avg/Trip', 'Supir'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredFleets.map((f, i) => (
                <tr
                  key={f.fleet_uuid}
                  className="hover:bg-gray-50 transition-colors"
                  style={{
                    borderBottom: i < filteredFleets.length - 1 ? '1px solid var(--border-card)' : 'none',
                    backgroundColor: f.total_trips === 0 ? '#F8FAFC' : undefined,
                    opacity: f.total_trips === 0 ? 0.7 : 1,
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-sm" style={{ color: '#16A34A' }}>{f.plate_number}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{f.fleet_name}</div>
                  </td>
                  <td className="px-4 py-3"><FleetCategoryBadge category={f.category} /></td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{f.total_trips}</span>
                    {f.total_trips > 0 && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {f.delivered_trips} terkirim
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {f.active_days} / {f.total_days_in_period} hari
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {f.total_trips === 0 ? (
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Tidak ada trip</span>
                    ) : (
                      <UtilizationBar percent={f.utilization_percent} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {f.total_operational_cost > 0 ? formatRupiah(f.total_operational_cost) : '—'}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {f.avg_cost_per_trip > 0 ? formatRupiah(f.avg_cost_per_trip) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {f.drivers_used.length === 0 ? (
                      <span style={{ color: 'var(--text-secondary)' }}>—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {f.drivers_used.slice(0, 2).map(d => (
                          <span key={d} className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>{d}</span>
                        ))}
                        {f.drivers_used.length > 2 && (
                          <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>+{f.drivers_used.length - 2}</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
