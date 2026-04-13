'use client'

import { useState, useMemo } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import MetricCard from '@/components/dashboard/MetricCard'
import DonutChart from '@/components/dashboard/DonutChart'
import RevenueChart from '@/components/dashboard/RevenueChart'
import ActivityTable from '@/components/dashboard/ActivityTable'
import { metricCards, activityData } from '@/lib/mockData'
import { ChevronDown, Filter } from 'lucide-react'

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

function getMonthYear(iso: string): { month: number; year: number } {
  const d = new Date(iso)
  return { month: d.getMonth() + 1, year: d.getFullYear() }
}

export default function DashboardPage() {
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('this_month')

  // Applied filter state (only set on "Terapkan Filter" click)
  const [appliedModule, setAppliedModule] = useState<ModuleFilter>('all')
  const [appliedStatus, setAppliedStatus] = useState<StatusFilter>('all')
  const [appliedPeriod, setAppliedPeriod] = useState<PeriodFilter>('this_month')

  const filteredActivity = useMemo(() => {
    const now = new Date('2026-04-13')
    const thisMonth = { month: now.getMonth() + 1, year: now.getFullYear() }
    const lastMonth = now.getMonth() === 0
      ? { month: 12, year: now.getFullYear() - 1 }
      : { month: now.getMonth(), year: now.getFullYear() }

    return activityData.filter(row => {
      // Module filter
      if (appliedModule === 'sj' && !row.noDokumen.startsWith('SJ-')) return false
      if (appliedModule === 'invoice' && !row.noDokumen.startsWith('INV-')) return false

      // Status filter
      if (appliedStatus !== 'all' && row.statusOps !== appliedStatus) return false

      // Period filter
      if (appliedPeriod !== 'all') {
        const target = appliedPeriod === 'this_month' ? thisMonth : lastMonth
        const { month, year } = getMonthYear(row.tanggalISO)
        if (month !== target.month || year !== target.year) return false
      }

      return true
    })
  }, [appliedModule, appliedStatus, appliedPeriod])

  const handleApply = () => {
    setAppliedModule(moduleFilter)
    setAppliedStatus(statusFilter)
    setAppliedPeriod(periodFilter)
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
            onClick={() => {
              setModuleFilter('all')
              setStatusFilter('all')
              setPeriodFilter('this_month')
              setAppliedModule('all')
              setAppliedStatus('all')
              setAppliedPeriod('this_month')
            }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
          >
            Reset
          </button>
        )}
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
        <ActivityTable data={filteredActivity} />
      </div>
    </DashboardLayout>
  )
}
