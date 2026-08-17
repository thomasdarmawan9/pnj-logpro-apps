import { BUSINESS_TIME_ZONE } from '@/lib/dateOnly'

const WIB_OFFSET = '+07:00'
const DATE_TIME_LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

/** Nilai untuk input datetime-local yang mengikuti jam operasional WIB. */
export function toWibDateTimeLocal(date = new Date()): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  )

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/** Konversi input datetime-local WIB menjadi timestamp absolut untuk API. */
export function wibDateTimeLocalToISOString(value: string): string | null {
  const match = value.match(DATE_TIME_LOCAL_PATTERN)
  if (!match) return null

  const date = new Date(`${value}:00${WIB_OFFSET}`)
  if (Number.isNaN(date.getTime())) return null

  const roundTrip = toWibDateTimeLocal(date)
  return roundTrip === value ? date.toISOString() : null
}
