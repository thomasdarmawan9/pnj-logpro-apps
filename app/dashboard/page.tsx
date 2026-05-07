'use client'

import { useState, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import MetricCard from '@/components/dashboard/MetricCard'
import DonutChart from '@/components/dashboard/DonutChart'
import RevenueChart from '@/components/dashboard/RevenueChart'
import ActivityTable from '@/components/dashboard/ActivityTable'
import { useDashboardSummary, useDashboardActivity } from '@/features/dashboard/hooks/useDashboard'
import type { ActivityFilters } from '@/lib/dashboardApi'
import { ChevronDown, Filter, RefreshCw } from 'lucide-react'

type ModuleFilter = 'all' | 'sj' | 'invoice'
type StatusFilter = 'all' | 'DELIVERED' | 'ASSIGNED' | 'DRAFT' | 'OUTSTANDING' | 'PAID' | 'VOID'
type PeriodFilter = 'all' | 'this_month' | 'last_month'

const MODULE_OPTIONS: { value: ModuleFilter; label: string }[] = [
  { value: 'all', label: 'Semua Modul' },
  { value: 'sj', label: 'Surat Jalan' },
  { value: 'invoice', label: 'Invoice' },
]

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'OUTSTANDING', label: 'Outstanding' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PAID', label: 'Paid' },
  { value: 'VOID', label: 'Void' },
]

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: 'all', label: 'Semua Waktu' },
  { value: 'this_month', label: 'Bulan Ini' },
  { value: 'last_month', label: 'Bulan Lalu' },
]

const EMPTY_META = { total: 0, page: 1, limit: 10, totalPages: 1 }

export default function DashboardPage() {
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month')

  // Applied filter state (only set on "Terapkan Filter" click)
  const [appliedModule, setAppliedModule] = useState<ModuleFilter>('all')
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>('all')
  const [appliedPeriod, setAppliedPeriod] = useState<PeriodFilter>('this_month')
  const [activityPage, setActivityPage] = useState(1)

  const summaryFilters = useMemo(() => ({
    period: appliedPeriod,
    module: appliedModule,
    status: appliedStatus,
  }), [appliedPeriod, appliedModule, appliedStatus])

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary(summaryFilters)

  const activityFilters = useMemo<ActivityFilters>(() => ({
    module: appliedModule,
    status: appliedStatus,
    period: appliedPeriod,
    page: activityPage,
    limit: 10,
  }), [appliedModule, appliedStatus, appliedPeriod, activityPage])

  const { data: activity, isLoading: activityLoading } = useDashboardActivity(activityFilters)

  const handleApply = () => {
    setAppliedModule(moduleFilter)
    setAppliedStatus(statusFilter)
    setAppliedPeriod(periodFilter)
    setActivityPage(1)
  }

  const handleReset = () => {
    setModuleFilter('all')
    setStatusFilter('all')
    setPeriodFilter('this_month')
    setAppliedModule('all')
    setAppliedStatus('all')
    setAppliedPeriod('this_month')
    setActivityPage(1)
  }

  const isFilterActive = appliedModule !== 'all' || appliedStatus !== 'all' || appliedPeriod !== 'all'

  return (
    <DashboardLayout>
      {/* Filter Bar */}
      <div
        data-tour="dashboard-filter"
        className="flex flex-wrap items-center gap-3 rounded-xl px-5 py-3 mb-6 shadow-sm"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
      >
        {/* Modul */}
        <div className="relative">
          <select
            className="appearance-none text-sm pl-3 pr-8 py-1.5 rounded-lg border cursor-pointer focus:outline-none"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)', backgroundColor: 'transparent' }}
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value as ModuleFilter)}
          >
            {MODULE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            className="appearance-none text-sm pl-3 pr-8 py-1.5 rounded-lg border cursor-pointer focus:outline-none"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)', backgroundColor: 'transparent' }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
        </div>

        {/* Periode */}
        <div className="relative">
          <select
            className="appearance-none text-sm pl-3 pr-8 py-1.5 rounded-lg border cursor-pointer focus:outline-none"
            style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)', backgroundColor: 'transparent' }}
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value as PeriodFilter)}
          >
            {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
        </div>

        <button
          onClick={handleApply}
          className="flex items-center gap-2 text-sm px-4 py-1.5 rounded-lg font-medium text-white ml-auto transition-opacity"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          <Filter size={14} />
          Terapkan Filter
        </button>

        {isFilterActive && (
          <button
            onClick={handleReset}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
          >
            Reset
          </button>
        )}
      </div>

      {/* Error state */}
      {summaryError && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
          <RefreshCw size={14} />
          Gagal memuat data dashboard: {summaryError}
        </div>
      )}

      {/* Metric Cards */}
      <div data-tour="dashboard-metrics" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {summaryLoading || !summary
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl p-5 animate-pulse"
                style={{ backgroundColor: '#2D5A42', minHeight: '120px' }}
              />
            ))
          : summary.metrics.map(card => (
              <MetricCard
                key={card.id}
                badge={card.badge}
                badgeVariant={card.badge_variant}
                value={card.value_label}
                label={card.label}
                trend={card.trend.label}
                trendColor={card.trend.color}
              />
            ))}
      </div>

      {/* Two panels */}
      <div data-tour="dashboard-charts" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {summaryLoading || !summary ? (
          <>
            <div className="rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)', minHeight: '380px' }} />
            <div className="rounded-xl animate-pulse" style={{ backgroundColor: 'var(--bg-card)', minHeight: '380px' }} />
          </>
        ) : (
          <>
            <DonutChart donut={summary.donut} armada={summary.armada} />
            <RevenueChart data={summary.revenue.data} summary={summary.revenue.summary} />
          </>
        )}
      </div>

      {/* Activity table */}
      <div data-tour="dashboard-activity">
        <ActivityTable
          data={activity?.data ?? []}
          meta={activity?.meta ?? EMPTY_META}
          isLoading={activityLoading}
          onPageChange={setActivityPage}
        />
      </div>
    </DashboardLayout>
  )
}
