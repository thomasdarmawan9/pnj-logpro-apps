export type FleetCategory = 'truck' | 'trailer' | 'family_car' | 'heavy_equipment' | 'other'
export type FleetStatus = 'active' | 'inactive' | 'repair' | 'sold'
export type FleetRentalStatus = 'rented'

export interface Fleet {
  id: number
  uuid: string
  plate_number: string
  name: string
  category: FleetCategory
  brand: string | null
  year: number | null
  capacity_ton: number | null
  status: FleetStatus
  is_tbd: boolean
  photo_path: string | null
  lampiran_paths: string[] | null
  notes: string | null
  rental_status: FleetRentalStatus | null
  rental_invoice_item_id: number | null
  rental_invoice_id: number | null
  rental_invoice_number: string | null
  rental_period_start: string | null
  rental_period_end: string | null
  rentals_this_month: number
  total_trips: number
  active_days_this_month: number
  last_used_date: string | null
  created_at: string
}

export const FLEET_CATEGORY_CONFIG: Record<FleetCategory, { label: string; icon: string; bg: string; text: string }> = {
  truck:           { label: 'Truck',          icon: 'Truck',     bg: '#DBEAFE', text: '#1D4ED8' },
  trailer:         { label: 'Trailer',        icon: 'Container', bg: '#EDE9FE', text: '#6D28D9' },
  family_car:      { label: 'Mobil Keluarga', icon: 'Car',       bg: '#D1FAE5', text: '#065F46' },
  heavy_equipment: { label: 'Alat Berat',     icon: 'Cog',       bg: '#FEF3C7', text: '#92400E' },
  other:           { label: 'Lainnya',        icon: 'Box',       bg: '#F1F5F9', text: '#475569' },
}

export const FLEET_STATUS_CONFIG: Record<FleetStatus, { label: string; bg: string; text: string }> = {
  active:   { label: 'Aktif',       bg: '#D1FAE5', text: '#065F46' },
  inactive: { label: 'Tidak Aktif', bg: '#FEF3C7', text: '#92400E' },
  repair:   { label: 'Perbaikan',   bg: '#FEE2E2', text: '#B91C1C' },
  sold:     { label: 'Terjual',     bg: '#F1F5F9', text: '#475569' },
}

export const MOCK_FLEETS: Fleet[] = [
  {
    id: 0, uuid: 'fleet-tbd',
    plate_number: 'TBD', name: 'Belum Ditentukan',
    category: 'other', is_tbd: true, status: 'active',
    brand: null, year: null, capacity_ton: null,
    photo_path: null, lampiran_paths: null, notes: null,
    rental_status: null, rental_invoice_item_id: null, rental_invoice_id: null,
    rental_invoice_number: null, rental_period_start: null, rental_period_end: null,
    rentals_this_month: 0,
    total_trips: 0, active_days_this_month: 0, last_used_date: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 1, uuid: 'fleet-001',
    plate_number: 'KB 1561 HX', name: 'Toyota Zenix',
    category: 'family_car', brand: 'Toyota', year: 2022,
    capacity_ton: 0.8, status: 'active', is_tbd: false,
    photo_path: null, lampiran_paths: null, notes: null,
    rental_status: null, rental_invoice_item_id: null, rental_invoice_id: null,
    rental_invoice_number: null, rental_period_start: null, rental_period_end: null,
    rentals_this_month: 0,
    total_trips: 23, active_days_this_month: 18,
    last_used_date: '2026-03-14',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2, uuid: 'fleet-002',
    plate_number: 'KB 8821 HX', name: 'Toyota Veloz',
    category: 'family_car', brand: 'Toyota', year: 2023,
    capacity_ton: 0.8, status: 'active', is_tbd: false,
    photo_path: null, lampiran_paths: null, notes: null,
    rental_status: null, rental_invoice_item_id: null, rental_invoice_id: null,
    rental_invoice_number: null, rental_period_start: null, rental_period_end: null,
    rentals_this_month: 0,
    total_trips: 15, active_days_this_month: 12,
    last_used_date: '2026-03-12',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 3, uuid: 'fleet-003',
    plate_number: 'KB 2233 CD', name: 'Mitsubishi Colt L300',
    category: 'truck', brand: 'Mitsubishi', year: 2019,
    capacity_ton: 1.5, status: 'active', is_tbd: false,
    photo_path: null, lampiran_paths: null, notes: null,
    rental_status: null, rental_invoice_item_id: null, rental_invoice_id: null,
    rental_invoice_number: null, rental_period_start: null, rental_period_end: null,
    rentals_this_month: 0,
    total_trips: 31, active_days_this_month: 22,
    last_used_date: '2026-03-13',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 4, uuid: 'fleet-004',
    plate_number: 'KB 9988 ZZ', name: 'Truck Fuso',
    category: 'truck', brand: 'Mitsubishi Fuso', year: 2018,
    capacity_ton: 8.0, status: 'active', is_tbd: false,
    photo_path: null, lampiran_paths: null, notes: null,
    rental_status: null, rental_invoice_item_id: null, rental_invoice_id: null,
    rental_invoice_number: null, rental_period_start: null, rental_period_end: null,
    rentals_this_month: 0,
    total_trips: 8, active_days_this_month: 5,
    last_used_date: '2026-03-10',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 5, uuid: 'fleet-005',
    plate_number: 'KB 4455 AB', name: 'Daihatsu Gran Max',
    category: 'family_car', brand: 'Daihatsu', year: 2020,
    capacity_ton: 0.9, status: 'inactive', is_tbd: false,
    photo_path: null, lampiran_paths: null, notes: 'Sedang perawatan mesin',
    rental_status: null, rental_invoice_item_id: null, rental_invoice_id: null,
    rental_invoice_number: null, rental_period_start: null, rental_period_end: null,
    rentals_this_month: 0,
    total_trips: 18, active_days_this_month: 0,
    last_used_date: '2026-02-28',
    created_at: '2026-01-01T00:00:00Z',
  },
]
