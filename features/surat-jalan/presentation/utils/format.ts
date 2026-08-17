import {
  BUSINESS_TIME_ZONE,
  differenceInCalendarDays,
  formatDateOnly,
  normalizeDateOnly,
  todayDateOnly,
} from '@/lib/dateOnly'

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-'
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return formatDateOnly(dateStr)
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date)
}

export function formatLongDate(dateStr: string): string {
  if (!normalizeDateOnly(dateStr)) return '-'
  return formatDateOnly(dateStr, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function formatTimeWIB(dateStr: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BUSINESS_TIME_ZONE,
  }).format(date)
}

export function daysUntil(dateStr: string | null): number | null {
  const target = normalizeDateOnly(dateStr)
  if (!target) return null
  return differenceInCalendarDays(target, todayDateOnly())
}
