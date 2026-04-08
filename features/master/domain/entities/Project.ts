export type ProjectStatus = 'active' | 'completed' | 'on_hold'

export interface Project {
  id: number
  uuid: string
  code: string
  name: string
  contract_number: string | null
  customer_id: number
  customer: { id: number; name: string; is_pkp: boolean }
  description: string | null
  start_date: string
  end_date: string | null
  status: ProjectStatus
  sj_count: number
  sj_delivered_count: number
  invoice_count: number
  invoice_outstanding_amount: number
  invoice_paid_amount: number
  total_operational_cost: number
  gross_profit: number
  created_at: string
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: 1, uuid: 'proj-001', code: 'PRJ-2026-001',
    name: 'Proyek Sewa Kendaraan Maret',
    contract_number: '002/HRD/III/2026',
    customer_id: 1, customer: { id: 1, name: 'PT. ATP BIO', is_pkp: true },
    start_date: '2026-03-01', end_date: null, status: 'active',
    description: 'Sewa 3 unit kendaraan untuk operasional lapangan',
    sj_count: 3, sj_delivered_count: 2,
    invoice_count: 1, invoice_outstanding_amount: 273981000,
    invoice_paid_amount: 0, total_operational_cost: 4750000,
    gross_profit: -4750000,
    created_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 2, uuid: 'proj-002', code: 'PRJ-2026-002',
    name: 'Logistik Q1 2026',
    contract_number: '015/LOG/I/2026',
    customer_id: 2, customer: { id: 2, name: 'PT. Borneo Maju', is_pkp: false },
    start_date: '2026-01-01', end_date: '2026-03-31', status: 'active',
    description: null,
    sj_count: 4, sj_delivered_count: 4,
    invoice_count: 1, invoice_outstanding_amount: 25000000,
    invoice_paid_amount: 20000000, total_operational_cost: 6800000,
    gross_profit: 13200000,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 3, uuid: 'proj-003', code: 'PRJ-2025-012',
    name: 'Transportasi Bulk Des 2025',
    contract_number: '089/TRB/XII/2025',
    customer_id: 5, customer: { id: 5, name: 'PT. Kalbar Batu', is_pkp: false },
    start_date: '2025-12-01', end_date: '2025-12-31', status: 'completed',
    description: null,
    sj_count: 8, sj_delivered_count: 8,
    invoice_count: 1, invoice_outstanding_amount: 0,
    invoice_paid_amount: 38500000, total_operational_cost: 41200000,
    gross_profit: -2700000,
    created_at: '2025-12-01T00:00:00Z',
  },
  {
    id: 4, uuid: 'proj-004', code: 'PRJ-2026-004',
    name: 'Pengiriman Harian Samarinda',
    contract_number: null,
    customer_id: 2, customer: { id: 2, name: 'PT. Borneo Maju', is_pkp: false },
    start_date: '2026-02-01', end_date: null, status: 'active',
    description: 'Pengiriman rutin tanpa kontrak formal, berdasarkan PO harian',
    sj_count: 5, sj_delivered_count: 5,
    invoice_count: 0, invoice_outstanding_amount: 0,
    invoice_paid_amount: 0, total_operational_cost: 3200000,
    gross_profit: -3200000,
    created_at: '2026-02-01T00:00:00Z',
  },
]
