import DashboardLayout from '@/components/layout/DashboardLayout'
import MetricCard from '@/components/dashboard/MetricCard'
import DonutChart from '@/components/dashboard/DonutChart'
import RevenueChart from '@/components/dashboard/RevenueChart'
import ActivityTable from '@/components/dashboard/ActivityTable'
import { metricCards } from '@/lib/mockData'
import { ChevronDown, Filter } from 'lucide-react'

export default function DashboardPage() {
  return (
    <DashboardLayout>
      {/* Filter Bar */}
      <div
        data-tour="dashboard-filter"
        className="flex flex-wrap items-center gap-3 rounded-xl px-5 py-3 mb-6 shadow-sm"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
      >
        {['Semua Modul', 'Semua Status', 'Bulan Ini'].map(label => (
          <button
            key={label}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--border-card)',
              color: 'var(--text-primary)',
              backgroundColor: 'transparent',
            }}
          >
            {label}
            <ChevronDown size={14} />
          </button>
        ))}
        <button
          className="flex items-center gap-2 text-sm px-4 py-1.5 rounded-lg font-medium text-white ml-auto"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          <Filter size={14} />
          Terapkan Filter
        </button>
      </div>

      {/* Metric Cards */}
      <div data-tour="dashboard-metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {metricCards.map(card => (
          <MetricCard
            key={card.id}
            badge={card.badge}
            badgeVariant={card.badgeVariant as 'gray' | 'red' | 'green' | 'amber'}
            value={card.value}
            label={card.label}
            trend={card.trend}
            trendColor={card.trendColor}
          />
        ))}
      </div>

      {/* Two panels */}
      <div data-tour="dashboard-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DonutChart />
        <RevenueChart />
      </div>

      {/* Activity table */}
      <div data-tour="dashboard-activity">
        <ActivityTable />
      </div>
    </DashboardLayout>
  )
}
