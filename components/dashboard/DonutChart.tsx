'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { donutData, armadaList } from '@/lib/mockData'

const statusDotColor: Record<string, string> = {
  Assigned: '#3E8055',
  Delivered: '#2D5A42',
  Draft: '#81C784',
}

const statusDotShape: Record<string, string> = {
  Assigned: '●',
  Delivered: '●',
  Draft: '○',
}

export default function DonutChart() {
  const total = donutData.reduce((sum, d) => sum + d.value, 0)

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
    >
      <div>
        <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
          Ringkasan Operasional
        </h3>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Distribusi status surat jalan aktif bulan ini
        </p>
      </div>

      {/* Donut */}
      <div className="relative mt-4" style={{ height: '200px' }}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              strokeWidth={0}
            >
              {donutData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [String(value) + ' SJ', 'SJ']}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-3xl font-bold"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)' }}
          >
            {total}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total SJ</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mt-4">
        {donutData.map(d => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{d.value}</span>
          </div>
        ))}
      </div>

      {/* Armada list */}
      <div className="mt-4 space-y-2">
        {armadaList.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs py-1.5">
            <span style={{ color: statusDotColor[a.status] }}>
              {statusDotShape[a.status]}
            </span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{a.plat}</span>
            <span style={{ color: 'var(--text-secondary)' }}>— {a.nama}</span>
            <span
              className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                backgroundColor: a.status === 'Assigned' ? '#DBEAFE' : a.status === 'Delivered' ? '#DCFCE7' : '#F3F4F6',
                color: a.status === 'Assigned' ? '#1E40AF' : a.status === 'Delivered' ? '#166534' : '#4B5563',
              }}
            >
              {a.status}
            </span>
            <span style={{ color: 'var(--text-secondary)' }}>{a.hari}</span>
            <span style={{ color: statusDotColor[a.status] }}>
              {a.aktif ? '●' : '○'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
