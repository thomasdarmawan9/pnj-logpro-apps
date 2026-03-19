'use client'

import { RefreshCw } from 'lucide-react'
import { formatDateTime } from '@/lib/formatters'

interface CacheStatusBadgeProps {
  lastRefreshed: string | null
  onRefresh: () => void
  isRefreshing: boolean
  cacheTTLMinutes?: number
}

function getMinutesAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
}

function formatMinutesAgo(minutes: number): string {
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  return `${hours} jam lalu`
}

export default function CacheStatusBadge({
  lastRefreshed,
  onRefresh,
  isRefreshing,
  cacheTTLMinutes = 10,
}: CacheStatusBadgeProps) {
  const minutesAgo = lastRefreshed ? getMinutesAgo(lastRefreshed) : null

  const dotClass =
    minutesAgo === null       ? 'cache-dot-stale' :
    minutesAgo < 5            ? 'cache-dot-fresh dot-pulse' :
    minutesAgo < cacheTTLMinutes ? 'cache-dot-aging' :
                                'cache-dot-stale'

  const dotColor =
    minutesAgo === null       ? '#9CA3AF' :
    minutesAgo < 5            ? '#16A34A' :
    minutesAgo < cacheTTLMinutes ? '#D97706' :
                                '#9CA3AF'

  return (
    <div
      className="rounded-xl flex items-center justify-between gap-4 flex-wrap"
      style={{
        backgroundColor: '#F9FAFB',
        border: '1px solid var(--border-light)',
        padding: '12px 20px',
      }}
    >
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`}
          style={{ backgroundColor: dotColor, display: 'inline-block' }}
        />
        <span>
          {lastRefreshed
            ? <>Data diperbarui <strong>{formatMinutesAgo(minutesAgo!)}</strong> ({formatDateTime(lastRefreshed)})</>
            : 'Data belum dimuat'
          }
        </span>
        <span className="hidden sm:inline" style={{ color: '#D1D5DB' }}>·</span>
        <span className="hidden sm:inline text-xs">Cache diperbarui otomatis setiap {cacheTTLMinutes} menit.</span>
      </div>

      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-1.5 transition-all"
        style={{
          color: isRefreshing ? '#9CA3AF' : 'var(--green-primary)',
          backgroundColor: isRefreshing ? '#F3F4F6' : '#F0FDF4',
          border: `1px solid ${isRefreshing ? '#E5E7EB' : '#BBF7D0'}`,
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
        }}
      >
        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
        {isRefreshing ? 'Memuat...' : 'Refresh Sekarang'}
      </button>
    </div>
  )
}
