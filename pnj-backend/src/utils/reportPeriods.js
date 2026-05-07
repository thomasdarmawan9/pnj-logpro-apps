'use strict'

/**
 * Period-preset → { from, to } resolver untuk reports module.
 * Semua preset return Date objects (inclusive range).
 */

function startOfDay(d)  { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0) }
function endOfDay(d)    { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999) }
function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1) }
function endOfMonth(d)  { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999) }

function resolvePeriod(preset, customFrom, customTo) {
  const now = new Date()

  if (customFrom || customTo) {
    return {
      from: customFrom ? startOfDay(new Date(customFrom)) : null,
      to:   customTo   ? endOfDay(new Date(customTo))     : null,
    }
  }

  switch (preset) {
    case 'today': {
      return { from: startOfDay(now), to: endOfDay(now) }
    }
    case 'yesterday': {
      const y = new Date(now); y.setDate(y.getDate() - 1)
      return { from: startOfDay(y), to: endOfDay(y) }
    }
    case 'this_week': {
      const d = new Date(now)
      const day = d.getDay() || 7  // Senin = 1, Minggu = 7
      d.setDate(d.getDate() - day + 1)
      return { from: startOfDay(d), to: endOfDay(now) }
    }
    case 'this_month': {
      return { from: startOfMonth(now), to: endOfMonth(now) }
    }
    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    }
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3)
      return {
        from: new Date(now.getFullYear(), q * 3, 1),
        to:   endOfMonth(new Date(now.getFullYear(), q * 3 + 2, 1)),
      }
    }
    case '6_months': {
      const start = new Date(now); start.setMonth(start.getMonth() - 6)
      return { from: startOfDay(start), to: endOfDay(now) }
    }
    case 'all':
    case 'custom':
    default:
      return { from: null, to: null }
  }
}

/**
 * Hitung jumlah hari (inclusive) antara from & to. Min 1.
 */
function daysBetween(from, to) {
  if (!from || !to) return 1
  const ms = endOfDay(new Date(to)).getTime() - startOfDay(new Date(from)).getTime()
  return Math.max(1, Math.ceil(ms / (24 * 60 * 60 * 1000)))
}

/**
 * Convert input ke 'YYYY-MM-DD' string. Tahan timezone — pakai UTC accessor
 * supaya server di non-UTC timezone tidak shift tanggal saat parse string
 * 'YYYY-MM-DD' (yang oleh JS di-parse sebagai UTC midnight).
 *
 * - Sequelize DATEONLY → 'YYYY-MM-DD' string. Kita pertahankan apa adanya.
 * - Date object lain → format pakai UTC.
 */
function toISODate(d) {
  if (!d) return null
  if (typeof d === 'string') {
    // 'YYYY-MM-DD' atau 'YYYY-MM-DDT...' — ambil 10 char pertama bila valid.
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
  }
  const dt = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  const y = dt.getUTCFullYear()
  const mo = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dt.getUTCDate()).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

module.exports = {
  resolvePeriod,
  daysBetween,
  toISODate,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
}
