/**
 * SKENARIO MOCK DATA TERHUBUNG
 * ============================================================
 * File ini mendefinisikan 1 skenario lengkap yang menghubungkan
 * semua modul: Master Data → Proyek → Surat Jalan → Invoice.
 *
 * PETA RELASI:
 *   Customer (cust-001)
 *     └── Project (proj-001)
 *           ├── SuratJalan (sj-001) ─ Fleet (fleet-001) + Driver (drv-001) ─┐
 *           ├── SuratJalan (sj-002) ─ Fleet (fleet-002) + Driver (drv-004) ─┤→ Invoice (inv-001)
 *           └── SuratJalan (sj-003) ─ Fleet (fleet-001) + Driver (drv-001)   [DRAFT, belum dilampirkan]
 *
 * ID CANONICAL (konsisten dengan entity files):
 *   Customer  id:1  → PT. ATP BIO
 *   Fleet     id:1  → Toyota Zenix        KB 1561 HX
 *   Fleet     id:2  → Toyota Veloz        KB 8821 HX
 *   Driver    id:1  → Budi Santoso        (SIM valid)
 *   Driver    id:4  → Hendra Kusuma       (SIM valid)
 *   Project   id:1  → Proyek Sewa Kendaraan Maret
 *   SJ        id:1  → SJ-2026-089         (DELIVERED, dilampirkan ke inv-001)
 *   SJ        id:2  → SJ-2026-087         (ASSIGNED,  dilampirkan ke inv-001)
 *   SJ        id:3  → SJ-2026-086         (DRAFT,     belum ada invoice)
 *   Invoice   id:1  → No. 2829            (OUTSTANDING)
 * ============================================================
 */

import { Customer }                                    from '../../features/master/domain/entities/Customer'
import { Fleet }                                       from '../../features/master/domain/entities/Fleet'
import { Driver }                                      from '../../features/master/domain/entities/Driver'
import { Project }                                     from '../../features/master/domain/entities/Project'
import { SuratJalan, StatusOperasional, StatusLampiran } from '../../features/surat-jalan/domain/entities/SuratJalan'
import { Invoice, InvoiceStatus }                      from '../../features/invoice/domain/entities/Invoice'

// ─────────────────────────────────────────────────────────────
// MASTER DATA
// ─────────────────────────────────────────────────────────────

export const SCENARIO_CUSTOMER: Customer = {
  id: 1,
  uuid: 'cust-001',
  name: 'PT. ATP BIO',
  pic_name: 'Budi Hartono',
  phone: '0812-3456-7890',
  email: 'finance@atpbio.co.id',
  address: 'Jl. Raya Sungai Raya No. 45, Kubu Raya, Kalimantan Barat',
  npwp: '01.234.567.8-901.000',
  is_pkp: true,
  active_project_count: 1,
  total_invoice_outstanding: 218_376_000,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
  deleted_at: null,
}

export const SCENARIO_FLEET_1: Fleet = {
  id: 1,
  uuid: 'fleet-001',
  plate_number: 'KB 1561 HX',
  name: 'Toyota Zenix',
  category: 'family_car',
  brand: 'Toyota',
  year: 2022,
  capacity_ton: 0.8,
  status: 'active',
  is_tbd: false,
  photo_path: null,
  notes: null,
  total_trips: 23,
  active_days_this_month: 18,
  last_used_date: '2026-03-14',
  created_at: '2026-01-01T00:00:00Z',
}

export const SCENARIO_FLEET_2: Fleet = {
  id: 2,
  uuid: 'fleet-002',
  plate_number: 'KB 8821 HX',
  name: 'Toyota Veloz',
  category: 'family_car',
  brand: 'Toyota',
  year: 2023,
  capacity_ton: 0.8,
  status: 'active',
  is_tbd: false,
  photo_path: null,
  notes: null,
  total_trips: 15,
  active_days_this_month: 12,
  last_used_date: '2026-03-12',
  created_at: '2026-01-01T00:00:00Z',
}

export const SCENARIO_DRIVER_1: Driver = {
  id: 1,
  uuid: 'drv-001',
  name: 'Budi Santoso',
  phone: '0812-1111-2222',
  sim_number: '1234567890AB',
  sim_expired_at: '2026-08-15',
  status: 'active',
  sim_status: 'valid',
  days_until_sim_expiry: 136,
  total_trips: 23,
  last_trip_date: '2026-03-14',
  created_at: '2025-01-01T00:00:00Z',
}

export const SCENARIO_DRIVER_2: Driver = {
  id: 4,
  uuid: 'drv-004',
  name: 'Hendra Kusuma',
  phone: '0815-7777-8888',
  sim_number: '1111222233GH',
  sim_expired_at: '2027-01-20',
  status: 'active',
  sim_status: 'valid',
  days_until_sim_expiry: 294,
  total_trips: 15,
  last_trip_date: '2026-03-12',
  created_at: '2025-01-01T00:00:00Z',
}

// ─────────────────────────────────────────────────────────────
// PROYEK
// ─────────────────────────────────────────────────────────────

export const SCENARIO_PROJECT: Project = {
  id: 1,
  uuid: 'proj-001',
  code: 'PRJ-2026-001',
  name: 'Proyek Sewa Kendaraan Maret',
  contract_number: '002/HRD/III/2026',
  customer_id: 1,                                       // → SCENARIO_CUSTOMER.id
  customer: { id: 1, name: 'PT. ATP BIO', is_pkp: true },
  description: 'Sewa 2 unit kendaraan operasional lapangan selama 11 bulan',
  start_date: '2026-04-19',
  end_date: '2027-04-19',
  status: 'active',
  sj_count: 3,
  sj_delivered_count: 1,                                // hanya sj-001 yang DELIVERED
  invoice_count: 1,
  invoice_outstanding_amount: 218_376_000,              // → SCENARIO_INVOICE.total_amount
  invoice_paid_amount: 0,
  total_operational_cost: 4_450_000,                    // sj-001 + sj-002 + sj-003
  gross_profit: -4_450_000,                             // belum ada pembayaran
  created_at: '2026-03-01T00:00:00Z',
}

// ─────────────────────────────────────────────────────────────
// SURAT JALAN
// ─────────────────────────────────────────────────────────────

/** SJ-001 — DELIVERED, sudah dilampirkan ke Invoice 2829 */
export const SCENARIO_SJ_1: SuratJalan = {
  id: 1,
  uuid: 'sj-001',
  sj_number: 'SJ-2026-089',
  project_id: 1,                                        // → SCENARIO_PROJECT.id
  project: {
    id: 1,
    name: 'Proyek Sewa Kendaraan Maret',
    contract_number: '002/HRD/III/2026',
    code: 'PRJ-2026-001',
  },
  customer_id: 1,                                       // → SCENARIO_CUSTOMER.id
  customer: { id: 1, name: 'PT. ATP BIO' },
  fleet_id: 1,                                          // → SCENARIO_FLEET_1.id
  fleet: { id: 1, name: 'Toyota Zenix', plate_number: 'KB 1561 HX', is_tbd: false },
  driver_id: 1,                                         // → SCENARIO_DRIVER_1.id
  driver: { id: 1, name: 'Budi Santoso', sim_expired_at: '2026-08-15' },
  driver_name_manual: null,
  sj_date: '2026-03-14',
  origin: 'Gudang PNJ, Jl. Supadio Pontianak',
  destination: 'Lokasi PT. ATP BIO, Kubu Raya',
  cargo_description: 'Serah terima kendaraan operasional sewa',
  operational_cost: 1_500_000,
  status: StatusOperasional.DELIVERED,
  invoice_id: 1,                                        // → SCENARIO_INVOICE.id
  invoice_attachment_status: StatusLampiran.ATTACHED,
  invoice: { id: 1, invoice_number: '2829' },
  delivered_at: '2026-03-14T14:30:00Z',
  pod_photo_path: '/mock/pod-sj-089.jpg',
  void_reason: null,
  internal_notes: null,
  created_by: 1,
  created_at: '2026-03-12T08:50:00Z',
  updated_at: '2026-03-14T14:30:00Z',
}

/** SJ-002 — ASSIGNED, sudah dilampirkan ke Invoice 2829 */
export const SCENARIO_SJ_2: SuratJalan = {
  id: 2,
  uuid: 'sj-002',
  sj_number: 'SJ-2026-087',
  project_id: 1,                                        // → SCENARIO_PROJECT.id
  project: {
    id: 1,
    name: 'Proyek Sewa Kendaraan Maret',
    contract_number: '002/HRD/III/2026',
    code: 'PRJ-2026-001',
  },
  customer_id: 1,                                       // → SCENARIO_CUSTOMER.id
  customer: { id: 1, name: 'PT. ATP BIO' },
  fleet_id: 2,                                          // → SCENARIO_FLEET_2.id
  fleet: { id: 2, name: 'Toyota Veloz', plate_number: 'KB 8821 HX', is_tbd: false },
  driver_id: 4,                                         // → SCENARIO_DRIVER_2.id
  driver: { id: 4, name: 'Hendra Kusuma', sim_expired_at: '2027-01-20' },
  driver_name_manual: null,
  sj_date: '2026-03-12',
  origin: 'Gudang PNJ, Jl. Supadio Pontianak',
  destination: 'Lokasi PT. ATP BIO, Kubu Raya',
  cargo_description: null,
  operational_cost: 1_200_000,
  status: StatusOperasional.ASSIGNED,
  invoice_id: 1,                                        // → SCENARIO_INVOICE.id
  invoice_attachment_status: StatusLampiran.ATTACHED,
  invoice: { id: 1, invoice_number: '2829' },
  delivered_at: null,
  pod_photo_path: null,
  void_reason: null,
  internal_notes: null,
  created_by: 1,
  created_at: '2026-03-12T09:00:00Z',
  updated_at: '2026-03-12T09:15:00Z',
}

/** SJ-003 — DRAFT, belum dilampirkan ke invoice manapun */
export const SCENARIO_SJ_3: SuratJalan = {
  id: 3,
  uuid: 'sj-003',
  sj_number: 'SJ-2026-086',
  project_id: 1,                                        // → SCENARIO_PROJECT.id
  project: {
    id: 1,
    name: 'Proyek Sewa Kendaraan Maret',
    contract_number: '002/HRD/III/2026',
    code: 'PRJ-2026-001',
  },
  customer_id: 1,                                       // → SCENARIO_CUSTOMER.id
  customer: { id: 1, name: 'PT. ATP BIO' },
  fleet_id: 1,                                          // → SCENARIO_FLEET_1.id
  fleet: { id: 1, name: 'Toyota Zenix', plate_number: 'KB 1561 HX', is_tbd: false },
  driver_id: 1,                                         // → SCENARIO_DRIVER_1.id
  driver: { id: 1, name: 'Budi Santoso', sim_expired_at: '2026-08-15' },
  driver_name_manual: null,
  sj_date: '2026-03-18',
  origin: 'Gudang PNJ, Jl. Supadio Pontianak',
  destination: 'Kantor PT. ATP BIO, Pontianak Selatan',
  cargo_description: 'Dokumen dan perlengkapan kantor',
  operational_cost: 1_750_000,
  status: StatusOperasional.DRAFT,
  invoice_id: null,
  invoice_attachment_status: StatusLampiran.NO_INVOICE,
  invoice: null,
  delivered_at: null,
  pod_photo_path: null,
  void_reason: null,
  internal_notes: 'Menunggu konfirmasi jadwal dari customer',
  created_by: 1,
  created_at: '2026-03-16T08:00:00Z',
  updated_at: '2026-03-16T08:00:00Z',
}

// ─────────────────────────────────────────────────────────────
// INVOICE
// ─────────────────────────────────────────────────────────────

/**
 * Invoice 2829 — OUTSTANDING
 * Tagihan sewa 2 unit kendaraan untuk PT. ATP BIO.
 * Melampirkan sj-001 (DELIVERED) dan sj-002 (ASSIGNED).
 *
 * Perhitungan:
 *   Toyota Zenix  KB 1561 HX : 1 unit × Rp138.000.000 = Rp138.000.000
 *   Toyota Veloz  KB 8821 HX : 1 unit × Rp  80.000.000 =  Rp 80.000.000
 *   Subtotal                                             = Rp218.000.000
 *   PPN 1,1% (PT. ATP BIO is_pkp: true)                 =  Rp  2.398.000  (dibulatkan → Rp2.376.000*)
 *   Total                                               = Rp218.376.000
 *   *  tax_amount = floor(218_000_000 × 0.011) = 2_398_000 → gunakan angka ini
 */
export const SCENARIO_INVOICE: Invoice = {
  id: 1,
  uuid: 'inv-001',
  invoice_number: '2829',
  project_id: 1,                                        // → SCENARIO_PROJECT.id
  project: {
    id: 1,
    name: 'Proyek Sewa Kendaraan Maret',
    code: 'PRJ-2026-001',
    contract_number: '002/HRD/III/2026',
  },
  customer_id: 1,                                       // → SCENARIO_CUSTOMER.id
  customer: {
    id: 1,
    name: 'PT. ATP BIO',
    address: 'Jl. Raya Sungai Raya No. 45, Kubu Raya, Kalimantan Barat',
    npwp: '01.234.567.8-901.000',
    is_pkp: true,
  },
  invoice_date: '2026-03-15',
  due_date: '2026-04-14',
  items: [
    {
      id: 1,
      uuid: 'item-001',
      invoice_id: 1,
      fleet_id: 1,                                      // → SCENARIO_FLEET_1.id
      fleet: { id: 1, name: 'Toyota Zenix', plate_number: 'KB 1561 HX' },
      fleet_label: 'Toyota Zenix KB 1561 HX',
      description: 'Tagihan Biaya Jasa Sewa Kendaraan',
      period_start: '2026-04-19',
      period_end: '2027-04-19',
      qty: 1,
      unit: 'Unit',
      unit_price: 138_000_000,
      subtotal: 138_000_000,
      sort_order: 0,
    },
    {
      id: 2,
      uuid: 'item-002',
      invoice_id: 1,
      fleet_id: 2,                                      // → SCENARIO_FLEET_2.id
      fleet: { id: 2, name: 'Toyota Veloz', plate_number: 'KB 8821 HX' },
      fleet_label: 'Toyota Veloz KB 8821 HX',
      description: 'Tagihan Biaya Jasa Sewa Kendaraan',
      period_start: '2026-04-19',
      period_end: '2027-04-19',
      qty: 1,
      unit: 'Unit',
      unit_price: 80_000_000,
      subtotal: 80_000_000,
      sort_order: 1,
    },
  ],
  subtotal_amount: 218_000_000,
  tax_percent: 1.1,
  tax_amount: 2_398_000,
  pph_percent: 0,
  pph_amount: 0,
  total_amount: 220_398_000,
  paid_amount: 0,
  remaining_amount: 220_398_000,
  status: InvoiceStatus.OUTSTANDING,
  notes: null,
  sent_at: '2026-03-15T10:00:00Z',
  void_reason: null,
  attached_sj: [
    {
      uuid: 'sj-001',                                   // → SCENARIO_SJ_1.uuid
      sj_number: 'SJ-2026-089',
      sj_date: '2026-03-14',
      origin: 'Gudang PNJ, Jl. Supadio Pontianak',
      destination: 'Lokasi PT. ATP BIO, Kubu Raya',
      fleet_label: 'Toyota Zenix KB 1561 HX',          // → SCENARIO_FLEET_1
      driver_name: 'Budi Santoso',                      // → SCENARIO_DRIVER_1
      status: 'delivered',
    },
    {
      uuid: 'sj-002',                                   // → SCENARIO_SJ_2.uuid
      sj_number: 'SJ-2026-087',
      sj_date: '2026-03-12',
      origin: 'Gudang PNJ, Jl. Supadio Pontianak',
      destination: 'Lokasi PT. ATP BIO, Kubu Raya',
      fleet_label: 'Toyota Veloz KB 8821 HX',          // → SCENARIO_FLEET_2
      driver_name: 'Hendra Kusuma',                     // → SCENARIO_DRIVER_2
      status: 'assigned',
    },
  ],
  payments: [],
  created_by: 1,
  created_at: '2026-03-15T08:00:00Z',
  updated_at: '2026-03-15T10:00:00Z',
}

// ─────────────────────────────────────────────────────────────
// BUNDLE — satu objek yang merangkum seluruh skenario
// ─────────────────────────────────────────────────────────────

export const CONNECTED_SCENARIO = {
  // Master Data
  customer:  SCENARIO_CUSTOMER,
  fleets:    [SCENARIO_FLEET_1, SCENARIO_FLEET_2],
  drivers:   [SCENARIO_DRIVER_1, SCENARIO_DRIVER_2],
  project:   SCENARIO_PROJECT,

  // Operasional
  suratJalan: [SCENARIO_SJ_1, SCENARIO_SJ_2, SCENARIO_SJ_3],

  // Keuangan
  invoice:   SCENARIO_INVOICE,
} as const
