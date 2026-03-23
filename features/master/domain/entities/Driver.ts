export type DriverStatus = 'active' | 'inactive'
export type SIMStatus = 'valid' | 'expiring_soon' | 'expired' | 'no_sim'

export interface Driver {
  id: number
  uuid: string
  name: string
  phone: string | null
  sim_number: string | null
  sim_expired_at: string | null
  status: DriverStatus
  sim_status: SIMStatus
  days_until_sim_expiry: number | null
  total_trips: number
  last_trip_date: string | null
  created_at: string
}

export function computeSIMStatus(sim_expired_at: string | null): { sim_status: SIMStatus; days_until_sim_expiry: number | null } {
  if (!sim_expired_at) return { sim_status: 'no_sim', days_until_sim_expiry: null }
  const today = new Date()
  const expiry = new Date(sim_expired_at)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0)  return { sim_status: 'expired',        days_until_sim_expiry: diffDays }
  if (diffDays < 30) return { sim_status: 'expiring_soon',  days_until_sim_expiry: diffDays }
  return                    { sim_status: 'valid',           days_until_sim_expiry: diffDays }
}

export const MOCK_DRIVERS: Driver[] = [
  {
    id: 1, uuid: 'drv-001', name: 'Budi Santoso',
    phone: '0812-1111-2222',
    sim_number: '1234567890AB', sim_expired_at: '2026-08-15',
    status: 'active', sim_status: 'valid', days_until_sim_expiry: 150,
    total_trips: 23, last_trip_date: '2026-03-14',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 2, uuid: 'drv-002', name: 'Agus Widodo',
    phone: '0813-3333-4444',
    sim_number: '9876543210CD', sim_expired_at: '2026-04-10',
    status: 'active', sim_status: 'expiring_soon', days_until_sim_expiry: 23,
    total_trips: 18, last_trip_date: '2026-03-13',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 3, uuid: 'drv-003', name: 'Rizki Pratama',
    phone: '0814-5555-6666',
    sim_number: '5555666677EF', sim_expired_at: '2026-03-20',
    status: 'active', sim_status: 'expired', days_until_sim_expiry: -2,
    total_trips: 12, last_trip_date: '2026-03-11',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 4, uuid: 'drv-004', name: 'Hendra Kusuma',
    phone: '0815-7777-8888',
    sim_number: '1111222233GH', sim_expired_at: '2027-01-20',
    status: 'active', sim_status: 'valid', days_until_sim_expiry: 308,
    total_trips: 15, last_trip_date: '2026-03-12',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 5, uuid: 'drv-005', name: 'Dedi Kurniawan',
    phone: '0816-9999-0000',
    sim_number: null, sim_expired_at: null,
    status: 'active', sim_status: 'no_sim', days_until_sim_expiry: null,
    total_trips: 5, last_trip_date: '2026-02-20',
    created_at: '2025-06-01T00:00:00Z',
  },
  {
    id: 6, uuid: 'drv-006', name: 'Wawan Setiawan',
    phone: '0817-1234-5678',
    sim_number: '7777888899IJ', sim_expired_at: '2025-11-30',
    status: 'inactive', sim_status: 'expired', days_until_sim_expiry: -108,
    total_trips: 31, last_trip_date: '2025-11-15',
    created_at: '2024-06-01T00:00:00Z',
  },
]
