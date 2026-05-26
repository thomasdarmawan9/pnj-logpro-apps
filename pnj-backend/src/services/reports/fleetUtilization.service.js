'use strict'

const { Op } = require('sequelize')
const {
  Fleet,
  DeliveryOrder,
  Driver,
} = require('../../models')
const { resolvePeriod, toISODate, daysBetween } = require('../../utils/reportPeriods')

function round1(n) { return Math.round(Number(n) * 10) / 10 }
function round2(n) { return Math.round(Number(n) * 100) / 100 }

/**
 * @param {object} filters
 *   - period_preset, period_from, period_to
 *   - category: 'all' | 'truck' | 'trailer' | ...
 *   - status: 'all' | 'active' | 'inactive' | 'repair' | 'sold'
 */
async function getSummary(filters = {}) {
  const { from: periodFrom, to: periodTo } = resolvePeriod(
    filters.period_preset,
    filters.period_from,
    filters.period_to,
  )

  const totalDays = daysBetween(periodFrom, periodTo)

  // Filter fleets — exclude TBD always (per FE convention).
  const fleetWhere = { is_tbd: false }
  if (filters.category && filters.category !== 'all') fleetWhere.category = filters.category
  if (filters.status   && filters.status   !== 'all') fleetWhere.status   = filters.status

  const fleets = await Fleet.findAll({
    where: fleetWhere,
    order: [['plate_number', 'ASC']],
  })

  if (fleets.length === 0) {
    return {
      period_from:            toISODate(periodFrom),
      period_to:              toISODate(periodTo),
      total_fleets:           0,
      active_fleets:          0,
      idle_fleets:            0,
      avg_utilization:        0,
      top_fleet_uuid:         null,
      total_trips:            0,
      total_operational_cost: 0,
      fleets:                 [],
    }
  }

  const fleetIds = fleets.map(f => f.id)

  // Ambil semua SJ dalam periode untuk fleet ini.
  const sjWhere = { fleet_id: { [Op.in]: fleetIds } }
  if (periodFrom || periodTo) {
    sjWhere.sj_date = {}
    if (periodFrom) sjWhere.sj_date[Op.gte] = periodFrom
    if (periodTo)   sjWhere.sj_date[Op.lte] = periodTo
  }
  const sjs = await DeliveryOrder.findAll({
    where:      sjWhere,
    attributes: [
      'id', 'fleet_id', 'driver_id', 'driver_name_manual',
      'project_id', 'customer_id', 'sj_date', 'status', 'operational_cost',
    ],
    include: [{
      model:      Driver,
      as:         'driver',
      attributes: ['id', 'name'],
      required:   false,
    }],
  })

  // Aggregate per fleet.
  const byFleet = new Map()
  for (const f of fleets) {
    byFleet.set(f.id, {
      fleet_id:               f.id,
      fleet_uuid:             f.uuid,
      plate_number:           f.plate_number,
      fleet_name:             f.name,
      category:               f.category,
      brand:                  f.brand || null,
      year:                   f.year  || null,
      status:                 f.status,
      is_tbd:                 !!f.is_tbd,
      total_trips:            0,
      delivered_trips:        0,
      assigned_trips:         0,
      draft_trips:            0,
      void_trips:             0,
      _activeDates:           new Set(),
      _projectIds:            new Set(),
      _customerIds:           new Set(),
      _drivers:               new Set(),
      total_operational_cost: 0,
      _firstTripDate:         null,
      _lastTripDate:          null,
    })
  }

  for (const sj of sjs) {
    const e = byFleet.get(sj.fleet_id)
    if (!e) continue
    e.total_trips += 1
    if (sj.status === 'delivered') e.delivered_trips += 1
    else if (sj.status === 'assigned') e.assigned_trips += 1
    else if (sj.status === 'draft')    e.draft_trips    += 1
    else if (sj.status === 'void')     e.void_trips     += 1

    e._activeDates.add(toISODate(sj.sj_date))
    if (sj.project_id)  e._projectIds.add(sj.project_id)
    if (sj.customer_id) e._customerIds.add(sj.customer_id)
    const driverName = sj.driver?.name || sj.driver_name_manual
    if (driverName) e._drivers.add(driverName)

    e.total_operational_cost = round2(e.total_operational_cost + Number(sj.operational_cost || 0))

    const sjDate = toISODate(sj.sj_date)
    if (!e._firstTripDate || sjDate < e._firstTripDate) e._firstTripDate = sjDate
    if (!e._lastTripDate  || sjDate > e._lastTripDate)  e._lastTripDate  = sjDate
  }

  // Build final fleets array.
  const fleetsArr = [...byFleet.values()].map(e => {
    const activeDays = e._activeDates.size
    const utilizationPercent = totalDays > 0
      ? round1((activeDays / totalDays) * 100)
      : 0
    const avgCost = e.total_trips > 0
      ? Math.round(e.total_operational_cost / e.total_trips)
      : 0
    return {
      fleet_id:               e.fleet_id,
      fleet_uuid:             e.fleet_uuid,
      plate_number:           e.plate_number,
      fleet_name:             e.fleet_name,
      category:               e.category,
      brand:                  e.brand,
      year:                   e.year,
      status:                 e.status,
      is_tbd:                 e.is_tbd,
      total_trips:            e.total_trips,
      delivered_trips:        e.delivered_trips,
      assigned_trips:         e.assigned_trips,
      draft_trips:            e.draft_trips,
      void_trips:             e.void_trips,
      active_days:            activeDays,
      total_days_in_period:   totalDays,
      utilization_percent:    utilizationPercent,
      total_operational_cost: e.total_operational_cost,
      avg_cost_per_trip:      avgCost,
      unique_projects:        e._projectIds.size,
      unique_customers:       e._customerIds.size,
      drivers_used:           [...e._drivers],
      first_trip_date:        e._firstTripDate,
      last_trip_date:         e._lastTripDate,
    }
  })

  // Sort by utilization_percent DESC.
  fleetsArr.sort((a, b) => b.utilization_percent - a.utilization_percent)

  const activeFleets   = fleetsArr.filter(f => f.total_trips > 0).length
  const idleFleets     = fleetsArr.length - activeFleets
  const totalTrips     = fleetsArr.reduce((s, f) => s + f.total_trips, 0)
  const totalOpsCost   = round2(fleetsArr.reduce((s, f) => s + f.total_operational_cost, 0))
  const avgUtilization = fleetsArr.length > 0
    ? round1(fleetsArr.reduce((s, f) => s + f.utilization_percent, 0) / fleetsArr.length)
    : 0
  const topFleet = fleetsArr.find(f => f.total_trips > 0) || null

  return {
    period_from:            toISODate(periodFrom),
    period_to:              toISODate(periodTo),
    total_fleets:           fleetsArr.length,
    active_fleets:          activeFleets,
    idle_fleets:            idleFleets,
    avg_utilization:        avgUtilization,
    top_fleet_uuid:         topFleet ? topFleet.fleet_uuid : null,
    total_trips:            totalTrips,
    total_operational_cost: totalOpsCost,
    fleets:                 fleetsArr,
  }
}

module.exports = { getSummary }
