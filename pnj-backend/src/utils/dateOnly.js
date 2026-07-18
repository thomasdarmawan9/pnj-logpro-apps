'use strict'

const BUSINESS_TIME_ZONE = 'Asia/Jakarta'
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function normalizeDateOnly(value) {
  if (typeof value !== 'string') return null
  const match = value.match(DATE_ONLY_PATTERN)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) return null
  return `${match[1]}-${match[2]}-${match[3]}`
}

function todayDateOnly(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: BUSINESS_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(now)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

function addDaysDateOnly(value, days) {
  const normalized = normalizeDateOnly(value)
  if (!normalized) return null
  const [year, month, day] = normalized.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function addMonthsDateOnly(value, months) {
  const normalized = normalizeDateOnly(value)
  if (!normalized) return null
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

function differenceInCalendarDays(later, earlier) {
  const a = normalizeDateOnly(later)
  const b = normalizeDateOnly(earlier)
  if (!a || !b) return 0
  const toUtc = (value) => {
    const [year, month, day] = value.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.floor((toUtc(a) - toUtc(b)) / 86_400_000)
}

module.exports = {
  BUSINESS_TIME_ZONE,
  normalizeDateOnly,
  todayDateOnly,
  addDaysDateOnly,
  addMonthsDateOnly,
  differenceInCalendarDays,
}
