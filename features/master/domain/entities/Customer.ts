export interface Customer {
  id: number
  uuid: string
  name: string
  pic_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  npwp: string | null
  is_pkp: boolean
  active_project_count: number
  total_invoice_outstanding: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 1, uuid: 'cust-001', name: 'PT. ATP BIO',
    pic_name: 'Budi Hartono', phone: '0812-3456-7890',
    email: 'finance@atpbio.co.id',
    address: 'Jl. Raya Sungai Raya No. 45, Kubu Raya, Kalimantan Barat',
    npwp: '01.234.567.8-901.000', is_pkp: true,
    active_project_count: 1, total_invoice_outstanding: 273981000,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-03-01T00:00:00Z', deleted_at: null,
  },
  {
    id: 2, uuid: 'cust-002', name: 'PT. Borneo Maju',
    pic_name: 'Siti Rahayu', phone: '0813-9876-5432',
    email: null, address: 'Jl. Ahmad Yani Km 5, Pontianak',
    npwp: null, is_pkp: false,
    active_project_count: 1, total_invoice_outstanding: 25000000,
    created_at: '2026-01-15T00:00:00Z', updated_at: '2026-02-01T00:00:00Z', deleted_at: null,
  },
  {
    id: 3, uuid: 'cust-003', name: 'PT. Kalbar Energi',
    pic_name: 'Hendra Wijaya', phone: '0811-2233-4455',
    email: 'operasional@kalbarenergi.id',
    address: 'Komplek Perkantoran Supadio, Blok A No. 12, Kubu Raya',
    npwp: '03.456.789.0-123.000', is_pkp: true,
    active_project_count: 2, total_invoice_outstanding: 20000000,
    created_at: '2026-01-20T00:00:00Z', updated_at: '2026-02-15T00:00:00Z', deleted_at: null,
  },
  {
    id: 4, uuid: 'cust-004', name: 'PT. Sawit Borneo',
    pic_name: null, phone: '0821-5566-7788', email: null,
    address: 'Jl. Trans Kalimantan KM 38, Ketapang',
    npwp: '05.678.901.2-345.000', is_pkp: true,
    active_project_count: 1, total_invoice_outstanding: 0,
    created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-20T00:00:00Z', deleted_at: null,
  },
  {
    id: 5, uuid: 'cust-005', name: 'PT. Tonggak Ampuh Global',
    pic_name: 'Andi Setiawan', phone: '0819-1122-3344',
    email: 'logistics@tonggakampuh.com',
    address: 'Jl. Gajah Mada No. 88, Pontianak',
    npwp: '07.890.123.4-567.000', is_pkp: true,
    active_project_count: 0, total_invoice_outstanding: 0,
    created_at: '2025-12-01T00:00:00Z', updated_at: '2026-01-10T00:00:00Z', deleted_at: null,
  },
]
