import { FleetCategory, FleetStatus } from '@/features/master/domain/entities/Fleet'

export interface FleetUtilization {
  fleet_id: number
  fleet_uuid: string
  plate_number: string
  fleet_name: string
  category: FleetCategory
  brand: string | null
  year: number | null
  status: FleetStatus
  is_tbd: boolean
  total_trips: number
  delivered_trips: number
  assigned_trips: number
  draft_trips: number
  void_trips: number
  active_days: number
  total_days_in_period: number
  utilization_percent: number
  total_operational_cost: number
  avg_cost_per_trip: number
  unique_projects: number
  unique_customers: number
  drivers_used: string[]
  first_trip_date: string | null
  last_trip_date: string | null
}

export interface FleetUtilizationSummary {
  period_from: string
  period_to: string
  total_fleets: number
  active_fleets: number
  idle_fleets: number
  avg_utilization: number
  top_fleet_uuid: string | null
  total_trips: number
  total_operational_cost: number
  fleets: FleetUtilization[]
}

export const MOCK_FLEET_UTILIZATION: FleetUtilizationSummary = {
  period_from: '2026-03-01',
  period_to: '2026-03-18',
  total_fleets: 5,
  active_fleets: 4,
  idle_fleets: 1,
  avg_utilization: 62.3,
  total_trips: 34,
  total_operational_cost: 42350000,
  top_fleet_uuid: 'fleet-003',
  fleets: [
    {
      fleet_id: 3, fleet_uuid: 'fleet-003',
      plate_number: 'KB 2233 CD', fleet_name: 'Mitsubishi Colt L300',
      category: 'truck', brand: 'Mitsubishi', year: 2019,
      status: 'active', is_tbd: false,
      total_trips: 11, delivered_trips: 9, assigned_trips: 1,
      draft_trips: 1, void_trips: 0,
      active_days: 14, total_days_in_period: 18,
      utilization_percent: 77.8,
      total_operational_cost: 14500000,
      avg_cost_per_trip: 1318182,
      unique_projects: 3, unique_customers: 2,
      drivers_used: ['Agus Widodo', 'Lukman'],
      first_trip_date: '2026-03-01', last_trip_date: '2026-03-13',
    },
    {
      fleet_id: 1, fleet_uuid: 'fleet-001',
      plate_number: 'KB 1561 HX', fleet_name: 'Toyota Zenix',
      category: 'family_car', brand: 'Toyota', year: 2022,
      status: 'active', is_tbd: false,
      total_trips: 8, delivered_trips: 7, assigned_trips: 1,
      draft_trips: 0, void_trips: 0,
      active_days: 12, total_days_in_period: 18,
      utilization_percent: 66.7,
      total_operational_cost: 12800000,
      avg_cost_per_trip: 1600000,
      unique_projects: 1, unique_customers: 1,
      drivers_used: ['Budi Santoso'],
      first_trip_date: '2026-03-02', last_trip_date: '2026-03-14',
    },
    {
      fleet_id: 2, fleet_uuid: 'fleet-002',
      plate_number: 'KB 8821 HX', fleet_name: 'Toyota Veloz',
      category: 'family_car', brand: 'Toyota', year: 2023,
      status: 'active', is_tbd: false,
      total_trips: 8, delivered_trips: 7, assigned_trips: 1,
      draft_trips: 0, void_trips: 0,
      active_days: 10, total_days_in_period: 18,
      utilization_percent: 55.6,
      total_operational_cost: 10500000,
      avg_cost_per_trip: 1312500,
      unique_projects: 2, unique_customers: 2,
      drivers_used: ['Hendra Kusuma', 'Budi Santoso'],
      first_trip_date: '2026-03-03', last_trip_date: '2026-03-12',
    },
    {
      fleet_id: 4, fleet_uuid: 'fleet-004',
      plate_number: 'KB 9988 ZZ', fleet_name: 'Truck Fuso',
      category: 'truck', brand: 'Mitsubishi Fuso', year: 2018,
      status: 'active', is_tbd: false,
      total_trips: 7, delivered_trips: 5, assigned_trips: 2,
      draft_trips: 0, void_trips: 0,
      active_days: 7, total_days_in_period: 18,
      utilization_percent: 38.9,
      total_operational_cost: 4550000,
      avg_cost_per_trip: 650000,
      unique_projects: 1, unique_customers: 1,
      drivers_used: ['Dedi Kurniawan'],
      first_trip_date: '2026-03-04', last_trip_date: '2026-03-10',
    },
    {
      fleet_id: 5, fleet_uuid: 'fleet-005',
      plate_number: 'KB 4455 AB', fleet_name: 'Daihatsu Gran Max',
      category: 'family_car', brand: 'Daihatsu', year: 2020,
      status: 'inactive', is_tbd: false,
      total_trips: 0, delivered_trips: 0, assigned_trips: 0,
      draft_trips: 0, void_trips: 0,
      active_days: 0, total_days_in_period: 18,
      utilization_percent: 0,
      total_operational_cost: 0,
      avg_cost_per_trip: 0,
      unique_projects: 0, unique_customers: 0,
      drivers_used: [],
      first_trip_date: null, last_trip_date: null,
    },
  ],
}
