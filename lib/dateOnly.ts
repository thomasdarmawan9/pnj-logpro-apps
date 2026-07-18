export const BUSINESS_TIME_ZONE = 'Asia/Jakarta'

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/

function partsInBusinessTimeZone(date: Date): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  )
}

/** Tanggal kalender bisnis saat ini, tanpa konversi UTC. */
export function todayDateOnly(now = new Date()): string {
  const parts = partsInBusinessTimeZone(now)
  return `${parts.year}-${parts.month}-${parts.day}`
}

/**
 * Ambil komponen date-only tanpa menggesernya berdasarkan timezone perangkat.
 * Menerima DATEONLY (`YYYY-MM-DD`) dan response ISO untuk kompatibilitas data lama.
 */
export function normalizeDateOnly(value?: string | null): string | null {
  if (!value) return null
  const match = String(value).match(DATE_ONLY_PATTERN)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null
}

export function addDaysDateOnly(value: string, days: number): string {
  const normalized = normalizeDateOnly(value)
  if (!normalized) return value
  const [year, month, day] = normalized.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + days))
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

export function addMonthsDateOnly(value: string, months: number): string {
  const normalized = normalizeDateOnly(value)
  if (!normalized) return value
  const [year, month, day] = normalized.split('-').map(Number)
  const targetFirst = new Date(Date.UTC(year, month - 1 + months, 1))
  const targetYear = targetFirst.getUTCFullYear()
  const targetMonth = targetFirst.getUTCMonth()
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  return [
    targetYear,
    String(targetMonth + 1).padStart(2, '0'),
    String(Math.min(day, lastDay)).padStart(2, '0'),
  ].join('-')
}

export function differenceInCalendarDays(later: string, earlier: string): number {
  const a = normalizeDateOnly(later)
  const b = normalizeDateOnly(earlier)
  if (!a || !b) return 0
  const toUtc = (value: string) => {
    const [year, month, day] = value.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.floor((toUtc(a) - toUtc(b)) / 86_400_000)
}

export function formatDateOnly(
  value: string,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' },
): string {
  const normalized = normalizeDateOnly(value)
  if (!normalized) return '-'
  const [year, month, day] = normalized.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  )
}
