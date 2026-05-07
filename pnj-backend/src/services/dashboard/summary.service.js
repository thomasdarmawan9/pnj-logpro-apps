'use strict'

const { Op, fn, col, literal } = require('sequelize')
const {
  sequelize,
  Invoice,
  Payment,
  DeliveryOrder,
  Fleet,
} = require('../../models')
const { startOfMonth, endOfMonth, toISODate } = require('../../utils/reportPeriods')

function round2(n) { return Math.round(Number(n) * 100) / 100 }

function pctChange(current, previous) {
  const c = Number(current  || 0)
  const p = Number(previous || 0)
  if (p === 0 && c === 0) return 0
  if (p === 0) return null  // tidak bisa hitung % dari 0
  return Math.round(((c - p) / p) * 1000) / 10  // 1 decimal place
}

/**
 * Format trend label: { value, label, color } sesuai konvensi FE.
 */
function buildTrend(value, opts = {}) {
  const { suffixThis = 'bulan ini', suffixPrev = 'bulan lalu', extra = '' } = opts
  if (value === null) return { value: null, label: '— belum ada data', color: '#9CA3AF' }
  if (value > 0)  return { value, label: `↑ +${value}% vs ${suffixPrev}`,   color: '#16A34A' }
  if (value < 0)  return { value, label: `↓ ${value}% vs ${suffixPrev}`,    color: '#DC2626' }
  return                       { value: 0, label: `Stagnan vs ${suffixPrev}`, color: '#6B7280' }
}

// ── Metric: Piutang Belum Lunas ───────────────────────────────────────────
async function computePiutang() {
  // Outstanding total = SUM(total_amount - paid_amount) untuk invoice yang
  // status 'sent' atau 'outstanding' (= belum lunas, belum void).
  const rows = await Invoice.findAll({
    where: { status: { [Op.in]: ['sent', 'outstanding'] } },
    attributes: ['total_amount', 'paid_amount'],
  })

  const total = rows.reduce(
    (s, r) => s + Math.max(0, Number(r.total_amount) - Number(r.paid_amount)),
    0,
  )
  return round2(total)
}

// ── Metric: Invoice Terlambat Bayar ───────────────────────────────────────
async function computeOverdueInvoiceCount(asOf) {
  return Invoice.count({
    where: {
      status:   { [Op.in]: ['sent', 'outstanding'] },
      due_date: { [Op.lt]: asOf },
    },
  })
}

// ── Metric: SJ count by status + period ───────────────────────────────────
// sjStatus: lowercase BE status ('delivered','assigned','draft','void') atau null = semua non-void
async function computeSJCount(periodFrom, periodTo, sjStatus = null) {
  const where = { sj_date: { [Op.between]: [periodFrom, periodTo] } }
  if (sjStatus) {
    where.status = sjStatus
  } else {
    where.status = 'delivered'  // default: hitung delivered
  }
  return DeliveryOrder.count({ where })
}

// ── Metric: SJ Belum Dilampirkan (delivered tanpa invoice_id) ─────────────
async function computeSJBelumDilampirkan() {
  return DeliveryOrder.count({
    where: {
      status:     'delivered',
      invoice_id: null,
    },
  })
}

// ── Donut: distribusi SJ status (this_month) ──────────────────────────────
async function computeSJDistribution(periodFrom, periodTo, sjStatus = null) {
  const statusFilter = sjStatus
    ? [sjStatus]
    : ['draft', 'assigned', 'delivered']

  const rows = await DeliveryOrder.findAll({
    where: {
      sj_date: { [Op.between]: [periodFrom, periodTo] },
      status:  { [Op.in]: statusFilter },
    },
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'count'],
    ],
    group: ['status'],
    raw:   true,
  })

  const map = { draft: 0, assigned: 0, delivered: 0 }
  for (const r of rows) {
    map[r.status] = Number(r.count)
  }

  const STATUS_COLORS = {
    delivered: '#2D5A42',
    assigned:  '#3E8055',
    draft:     '#81C784',
  }

  return [
    { name: 'Delivered', value: map.delivered, color: STATUS_COLORS.delivered },
    { name: 'Assigned',  value: map.assigned,  color: STATUS_COLORS.assigned },
    { name: 'Draft',     value: map.draft,     color: STATUS_COLORS.draft },
  ]
}

// ── Armada list: top 5 fleet aktif this_month ─────────────────────────────
async function computeTopArmada(periodFrom, periodTo, sjStatus = null) {
  const statusWhere = sjStatus
    ? { status: sjStatus }
    : { status: { [Op.ne]: 'void' } }

  const rows = await DeliveryOrder.findAll({
    where: {
      sj_date: { [Op.between]: [periodFrom, periodTo] },
      ...statusWhere,
    },
    attributes: [
      'fleet_id',
      'status',
      'sj_date',
    ],
    raw: true,
  })

  // Aggregate per fleet.
  const byFleet = new Map()
  for (const r of rows) {
    let entry = byFleet.get(r.fleet_id)
    if (!entry) {
      entry = {
        fleet_id:       r.fleet_id,
        active_dates:   new Set(),
        total_trips:    0,
        last_status:    null,
        last_sj_date:   null,
      }
      byFleet.set(r.fleet_id, entry)
    }
    entry.total_trips += 1
    entry.active_dates.add(toISODate(r.sj_date))
    if (!entry.last_sj_date || r.sj_date > entry.last_sj_date) {
      entry.last_sj_date = r.sj_date
      entry.last_status  = r.status
    }
  }

  if (byFleet.size === 0) return []

  // Ambil fleet master (skip TBD).
  const fleets = await Fleet.findAll({
    where: {
      id:     { [Op.in]: [...byFleet.keys()] },
      is_tbd: false,
    },
    attributes: ['id', 'uuid', 'plate_number', 'name', 'status'],
  })
  const fleetMap = new Map(fleets.map(f => [f.id, f]))

  const result = [...byFleet.values()]
    .filter(e => fleetMap.has(e.fleet_id))
    .map(e => {
      const f = fleetMap.get(e.fleet_id)
      // Capitalize status.
      const lastStatus = e.last_status
        ? e.last_status.charAt(0).toUpperCase() + e.last_status.slice(1)
        : '—'
      return {
        fleet_id:     f.id,
        fleet_uuid:   f.uuid,
        plat:         f.plate_number,
        nama:         f.name,
        status:       lastStatus,
        active_days:  e.active_dates.size,
        hari:         `${e.active_dates.size} hari aktif`,
        aktif:        e.total_trips > 0,
        total_trips:  e.total_trips,
      }
    })
    .sort((a, b) => b.total_trips - a.total_trips)
    .slice(0, 5)

  return result
}

// ── Revenue chart: 6 bulan terakhir ──────────────────────────────────────
/**
 * Untuk bulan N:
 *   revenue = SUM(Payment.amount) where payment_date IN month
 *   biaya   = SUM(DeliveryOrder.operational_cost) where sj_date IN month, status != void
 */
async function computeRevenueChart() {
  const now = new Date()
  const months = []
  // Build 6 month buckets — bulan paling lama dulu.
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('id-ID', { month: 'short' }),
      from:  startOfMonth(d),
      to:    endOfMonth(d),
    })
  }

  const earliest = months[0].from
  const latest   = months[5].to

  const [payments, sjs] = await Promise.all([
    Payment.findAll({
      where: { payment_date: { [Op.between]: [earliest, latest] } },
      attributes: ['payment_date', 'amount'],
      raw: true,
    }),
    DeliveryOrder.findAll({
      where: {
        sj_date: { [Op.between]: [earliest, latest] },
        status:  { [Op.ne]: 'void' },
      },
      attributes: ['sj_date', 'operational_cost'],
      raw: true,
    }),
  ])

  function bucketKey(date) {
    const d = new Date(date)
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  }

  const map = new Map(months.map(m => [m.key, { revenue: 0, biaya: 0 }]))
  for (const p of payments) {
    const k = bucketKey(p.payment_date)
    if (map.has(k)) map.get(k).revenue += Number(p.amount || 0)
  }
  for (const s of sjs) {
    const k = bucketKey(s.sj_date)
    if (map.has(k)) map.get(k).biaya += Number(s.operational_cost || 0)
  }

  // Convert ke jutaan rupiah supaya cocok dengan FE chart (`Jt`).
  const data = months.map(m => {
    const v = map.get(m.key)
    return {
      bulan:           m.label,
      bulan_year:      m.key,
      revenue:         Math.round(v.revenue / 1_000_000),
      biaya:           Math.round(v.biaya   / 1_000_000),
      revenue_raw:     round2(v.revenue),
      biaya_raw:       round2(v.biaya),
      from:            toISODate(m.from),
      to:              toISODate(m.to),
    }
  })

  // Summary stats untuk panel kanan.
  const totalRevenue = data.reduce((s, d) => s + d.revenue_raw, 0)
  const totalBiaya   = data.reduce((s, d) => s + d.biaya_raw,   0)
  const avgRevenue   = round2(totalRevenue / Math.max(1, data.length))

  // Average margin (rata-rata margin per bulan, skip bulan tanpa revenue).
  const margins = data
    .filter(d => d.revenue_raw > 0)
    .map(d => ((d.revenue_raw - d.biaya_raw) / d.revenue_raw) * 100)
  const avgMargin = margins.length
    ? Math.round((margins.reduce((s, m) => s + m, 0) / margins.length) * 10) / 10
    : null

  // Highlight rows.
  const highestRevenue = [...data].sort((a, b) => b.revenue_raw - a.revenue_raw)[0]
  const highestBiaya   = [...data].sort((a, b) => b.biaya_raw   - a.biaya_raw)[0]
  const bestMargin = data
    .filter(d => d.revenue_raw > 0)
    .map(d => ({ ...d, margin_pct: ((d.revenue_raw - d.biaya_raw) / d.revenue_raw) * 100 }))
    .sort((a, b) => b.margin_pct - a.margin_pct)[0] || null

  return {
    data,
    summary: {
      avg_revenue:   avgRevenue,
      total_biaya:   round2(totalBiaya),
      avg_margin:    avgMargin,
      highest_revenue: highestRevenue && highestRevenue.revenue_raw > 0
        ? { bulan: highestRevenue.bulan, value: highestRevenue.revenue_raw }
        : null,
      highest_biaya:   highestBiaya && highestBiaya.biaya_raw > 0
        ? { bulan: highestBiaya.bulan, value: highestBiaya.biaya_raw }
        : null,
      best_margin:     bestMargin
        ? { bulan: bestMargin.bulan, percent: Math.round(bestMargin.margin_pct * 10) / 10 }
        : null,
    },
  }
}

// ── PUBLIC: getSummary ────────────────────────────────────────────────────
// Status FE → status BE (lowercase)
const SJ_STATUS_MAP = { DRAFT: 'draft', ASSIGNED: 'assigned', DELIVERED: 'delivered', VOID: 'void' }
const INVOICE_STATUS_SET = new Set(['OUTSTANDING', 'PAID'])
const SJ_STATUS_SET = new Set(['DRAFT', 'ASSIGNED', 'DELIVERED', 'VOID'])

async function getSummary(period = 'this_month', module = 'all', status = 'all') {
  const now = new Date()

  // ── Resolve periode ────────────────────────────────────────────────────
  const lastMonthRef  = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthFrom = startOfMonth(lastMonthRef)
  const lastMonthTo   = endOfMonth(lastMonthRef)

  let periodFrom, periodTo, prevFrom, prevTo
  if (period === 'last_month') {
    periodFrom = lastMonthFrom
    periodTo   = lastMonthTo
    const twoRef = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    prevFrom = startOfMonth(twoRef)
    prevTo   = endOfMonth(twoRef)
  } else if (period === 'all') {
    periodFrom = new Date(2000, 0, 1)
    periodTo   = endOfMonth(now)
    prevFrom   = null
    prevTo     = null
  } else {
    periodFrom = startOfMonth(now)
    periodTo   = endOfMonth(now)
    prevFrom   = lastMonthFrom
    prevTo     = lastMonthTo
  }

  // ── Resolve filter status ke SJ / Invoice ─────────────────────────────
  const sjStatus      = (status !== 'all' && SJ_STATUS_SET.has(status))
    ? SJ_STATUS_MAP[status]
    : null
  const wantInvoice   = module === 'all' || module === 'invoice'
  const wantSJ        = module === 'all' || module === 'sj'

  // Jika status filter adalah invoice-only status, sembunyikan SJ data & sebaliknya
  const showSJ      = wantSJ      && (status === 'all' || SJ_STATUS_SET.has(status)      || !INVOICE_STATUS_SET.has(status))
  const showInvoice = wantInvoice && (status === 'all' || INVOICE_STATUS_SET.has(status) || !SJ_STATUS_SET.has(status))

  // ── Compute paralel ────────────────────────────────────────────────────
  const [
    piutangNow,
    overdueNow,
    overdueLastMonth,
    sjCountThis,
    sjCountPrev,
    sjBelumLampir,
    donutData,
    armada,
    revenue,
  ] = await Promise.all([
    showInvoice ? computePiutang()                                         : Promise.resolve(0),
    showInvoice ? computeOverdueInvoiceCount(now)                          : Promise.resolve(0),
    showInvoice ? computeOverdueInvoiceCount(prevTo || lastMonthTo)        : Promise.resolve(0),
    showSJ      ? computeSJCount(periodFrom, periodTo, sjStatus)            : Promise.resolve(0),
    showSJ && prevFrom && prevTo
      ? computeSJCount(prevFrom, prevTo, sjStatus)                         : Promise.resolve(0),
    showSJ      ? computeSJBelumDilampirkan()                              : Promise.resolve(0),
    showSJ      ? computeSJDistribution(periodFrom, periodTo, sjStatus)    : Promise.resolve([]),
    showSJ      ? computeTopArmada(periodFrom, periodTo, sjStatus)         : Promise.resolve([]),
    computeRevenueChart(),
  ])

  const overdueTrendValue = pctChange(overdueNow, overdueLastMonth)
  const sjTrend           = period === 'all' ? null : pctChange(sjCountThis, sjCountPrev)
  const periodLabel       = period === 'last_month' ? 'bulan lalu' : period === 'all' ? 'semua waktu' : 'bulan ini'

  // Label metric SJ menyesuaikan status filter
  const sjMetricLabel = sjStatus
    ? `SJ ${sjStatus.charAt(0).toUpperCase() + sjStatus.slice(1)}`
    : 'Surat Jalan Delivered'

  const allMetrics = [
    {
      id:            'piutang',
      badge:         'outstanding',
      badge_variant: 'gray',
      label:         'Piutang Belum Lunas',
      value:         piutangNow,
      value_label:   formatRupiah(piutangNow),
      trend:         buildTrend(null),
      _show:         showInvoice,
    },
    {
      id:            'invoice',
      badge:         overdueNow > 0 ? 'urgent' : 'normal',
      badge_variant: overdueNow > 0 ? 'red' : 'gray',
      label:         'Invoice Terlambat Bayar',
      value:         overdueNow,
      value_label:   String(overdueNow),
      trend:         buildTrend(overdueTrendValue),
      _show:         showInvoice,
    },
    {
      id:            'sj',
      badge:         sjCountThis > 0 ? 'normal' : 'idle',
      badge_variant: sjCountThis > 0 ? 'green' : 'gray',
      label:         sjMetricLabel,
      value:         sjCountThis,
      value_label:   String(sjCountThis),
      trend:         buildTrend(sjTrend, { suffixPrev: periodLabel }),
      _show:         showSJ,
    },
    {
      id:            'sj-invoice',
      badge:         sjBelumLampir > 0 ? 'perlu tindakan' : 'aman',
      badge_variant: sjBelumLampir > 0 ? 'amber' : 'green',
      label:         'SJ Belum Dilampirkan',
      value:         sjBelumLampir,
      value_label:   String(sjBelumLampir),
      trend: {
        value: null,
        label: sjBelumLampir > 0 ? '● Perlu perhatian' : '✓ Semua tertangani',
        color: sjBelumLampir > 0 ? '#D97706' : '#16A34A',
      },
      _show: showSJ,
    },
  ]

  // Hapus field internal _show sebelum return
  const metrics = allMetrics
    .filter(m => m._show)
    .map(({ _show, ...m }) => m)

  return {
    as_of:   new Date().toISOString(),
    period,
    module,
    status,
    metrics,
    donut:   donutData,
    armada,
    revenue,
  }
}

function formatRupiah(n) {
  const num = Number(n || 0)
  return 'Rp ' + num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

module.exports = {
  getSummary,
  // exposed for test
  pctChange,
  buildTrend,
  formatRupiah,
}
