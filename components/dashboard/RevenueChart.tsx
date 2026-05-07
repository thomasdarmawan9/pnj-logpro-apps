'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import type { RevenueMonthEntry, RevenueSummary } from '@/lib/dashboardApi'

function formatRupiahJuta(raw: number) {
  const juta = Math.round(raw / 1_000_000)
  if (juta >= 1000) return `Rp ${(juta / 1000).toFixed(2)}M`
  return `Rp ${juta}Jt`
}

interface RevenueChartProps {
  data: RevenueMonthEntry[]
  summary: RevenueSummary
}

export default function RevenueChart({ data, summary }: RevenueChartProps) {
  const analysisRows = [
    {
      label: 'Revenue Tertinggi',
      value: summary.highest_revenue
        ? `${summary.highest_revenue.bulan} (${formatRupiahJuta(summary.highest_revenue.value)})`
        : '—',
    },
    {
      label: 'Biaya Tertinggi',
      value: summary.highest_biaya
        ? `${summary.highest_biaya.bulan} (${formatRupiahJuta(summary.highest_biaya.value)})`
        : '—',
    },
    {
      label: 'Margin Terbaik',
      value: summary.best_margin
        ? `${summary.best_margin.bulan} (${summary.best_margin.percent}%)`
        : '—',
    },
  ]

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      <div>
        <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
          Revenue vs Biaya Operasional
        </h3>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Perbandingan per bulan (6 bulan terakhir)
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mt-4 mb-4">
        <div>
          <div className="text-base font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>
            {formatRupiahJuta(summary.avg_revenue)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Avg Revenue</div>
        </div>
        <div>
          <div className="text-base font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>
            {formatRupiahJuta(summary.total_biaya)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Biaya</div>
        </div>
        <div>
          <div className="text-base font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}>
            {summary.avg_margin !== null ? `${summary.avg_margin}%` : '—'}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Margin Rata-rata</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '180px' }}>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis
              dataKey="bulan"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(val, name) => [
                `Rp ${val}Jt`,
                name === 'revenue' ? 'Revenue' : 'Biaya Ops'
              ]}
              contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3A8C4A"
              strokeWidth={2}
              dot={{ fill: '#3A8C4A', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="biaya"
              stroke="#DC2626"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#DC2626', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-2">
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="w-6 h-0.5 bg-green-700" />
          Revenue
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="w-6 h-0.5 border-t-2 border-dashed border-red-600" />
          Biaya Ops
        </div>
      </div>

      {/* Analysis */}
      <div className="mt-4 space-y-1.5">
        {analysisRows.map(row => (
          <div key={row.label} className="flex justify-between text-xs py-1 border-t" style={{ borderColor: 'var(--border-light)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
