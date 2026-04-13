import { StockItem } from '@/features/stock/domain/entities/StockItem'
import { StockReceipt } from '@/features/stock/domain/entities/StockReceipt'
import { StockDisbursement } from '@/features/stock/domain/entities/StockDisbursement'

// ─── Stock Items ──────────────────────────────────────────────────────────────
// 5 item induk. "Tiang Beton" mencakup semua tipe (TM, TR, TP) via kategorisasi
// di level penerimaan. Pipa Besi sengaja dibiarkan 0 stok.

export const MOCK_STOCK_ITEMS: StockItem[] = [
  {
    id: 1,
    uuid: 'item-stk-001',
    code: 'TB-001',
    name: 'Tiang Beton',
    category: null,
    unit: 'Batang',
    description: 'Tiang beton pracetak (tipe TM, TR, dan TP — detail tipe dicatat via kategorisasi saat penerimaan)',
    is_active: true,
    current_stock: 170,
    peak_stock: 900,
    created_by: 1,
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
  },
  {
    id: 2,
    uuid: 'item-stk-002',
    code: 'PIPA-4IN',
    name: 'Pipa Besi 4 inch',
    category: null,
    unit: 'Batang',
    description: null,
    is_active: true,
    current_stock: 0,
    peak_stock: 0,
    created_by: 1,
    created_at: '2025-12-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    uuid: 'item-stk-003',
    code: 'KWT-7MM',
    name: 'Kawat Baja 7mm',
    category: null,
    unit: 'Roll',
    description: 'Kawat baja galvanis diameter 7mm',
    is_active: true,
    current_stock: 10,
    peak_stock: 50,
    created_by: 1,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-03-10T00:00:00Z',
  },
  {
    id: 4,
    uuid: 'item-stk-004',
    code: 'BAT-ANC-M16',
    name: 'Baut Anchor M16',
    category: null,
    unit: 'Buah',
    description: null,
    is_active: true,
    current_stock: 420,
    peak_stock: 1350,
    created_by: 1,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-03-25T00:00:00Z',
  },
  {
    id: 5,
    uuid: 'item-stk-005',
    code: 'PLT-6MM',
    name: 'Plat Besi 6mm',
    category: null,
    unit: 'Lembar',
    description: 'Plat besi hitam tebal 6mm ukuran 4x8 ft',
    is_active: true,
    current_stock: 2,
    peak_stock: 38,
    created_by: 1,
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
  },
]

export const MOCK_CUSTOMERS = [
  { id: 1, name: 'PT. Tonggak Ampuh Global' },
  { id: 2, name: 'PT. ATP BIO' },
  { id: 3, name: 'PT. Kalbar Energi' },
  { id: 4, name: 'PT. Borneo Maju Sejahtera' },
]

// ─── Stock Receipts ───────────────────────────────────────────────────────────
// rcpt-2025-001 : Penerimaan perdana — Tiang Beton 2 kategori (TM + TR)
// rcpt-2026-001 : Kloter Jan — Tiang Beton 3 kategori (TM + TR + TP)
// rcpt-2026-002 : Khusus TP untuk proyek ATP BIO — 1 kategori
// rcpt-2026-003 : Pembelian material umum — tanpa kategorisasi
// rcpt-2026-004 : Kloter Mar — Tiang Beton 2 kategori (TM + TR)
//
// Total masuk Tiang Beton : (200+150) + (120+80+100) + 120 + (80+50) = 900 btg
// Total keluar Tiang Beton : 602 btg (11 disbursement di bawah)
// Saldo : 298 btg ✓

export const MOCK_STOCK_RECEIPTS: StockReceipt[] = [
  // ── rcpt-2025-001 : Penerimaan perdana Des 2025 ──────────────────────────
  {
    id: 1,
    uuid: 'rcpt-2025-001',
    receipt_number: 'STK-MSK-2025-001',
    receipt_date: '2025-12-22',
    supplier_name: 'Kapal Bahari 27',
    document_number: 'SPAL 140',
    customer_id: 1,
    customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: 'Penerimaan perdana kloter Des 2025 — 2 tipe tiang',
    items: [
      {
        id: 1, uuid: 'ri-001', receipt_id: 1,
        stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0],
        qty: 200, notes: null, kategori_name: 'TM 12/200',
      },
      {
        id: 2, uuid: 'ri-002', receipt_id: 1,
        stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0],
        qty: 150, notes: null, kategori_name: 'TR 9/200',
      },
    ],
    created_by: 1,
    created_by_name: 'Admin Ops PNJ',
    created_at: '2025-12-22T08:00:00Z',
    updated_at: '2025-12-22T08:00:00Z',
  },

  // ── rcpt-2026-001 : Kloter 1 Jan 2026 — 3 tipe sekaligus ────────────────
  {
    id: 2,
    uuid: 'rcpt-2026-001',
    receipt_number: 'STK-MSK-2026-001',
    receipt_date: '2026-01-07',
    supplier_name: 'Kapal Bahari 27',
    document_number: 'SPAL 141',
    customer_id: 1,
    customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: 'Kloter 1 Jan 2026 — tiga tipe tiang sekaligus',
    items: [
      {
        id: 3, uuid: 'ri-003', receipt_id: 2,
        stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0],
        qty: 120, notes: null, kategori_name: 'TM 12/200',
      },
      {
        id: 4, uuid: 'ri-004', receipt_id: 2,
        stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0],
        qty: 80, notes: null, kategori_name: 'TR 9/200',
      },
      {
        id: 5, uuid: 'ri-005', receipt_id: 2,
        stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0],
        qty: 100, notes: 'Untuk fondasi proyek Landak', kategori_name: 'TP 10/300',
      },
    ],
    created_by: 1,
    created_by_name: 'Admin Ops PNJ',
    created_at: '2026-01-07T08:00:00Z',
    updated_at: '2026-01-07T08:00:00Z',
  },

  // ── rcpt-2026-002 : Khusus TP 10/300 untuk PT. ATP BIO ──────────────────
  {
    id: 3,
    uuid: 'rcpt-2026-002',
    receipt_number: 'STK-MSK-2026-002',
    receipt_date: '2026-01-15',
    supplier_name: 'CV Beton Mandiri',
    document_number: 'DO-BM-0041',
    customer_id: 2,
    customer: { id: 2, name: 'PT. ATP BIO' },
    notes: 'Tiang pancang khusus proyek ATP BIO, Kubu Raya',
    items: [
      {
        id: 6, uuid: 'ri-006', receipt_id: 3,
        stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0],
        qty: 120, notes: null, kategori_name: 'TP 10/300',
      },
    ],
    created_by: 1,
    created_by_name: 'Admin Ops PNJ',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-01-15T08:00:00Z',
  },

  // ── rcpt-2026-003 : Pembelian material umum — kawat tanpa kategori,
  //                   baut & plat dengan kategorisasi ukuran ────────────────
  {
    id: 4,
    uuid: 'rcpt-2026-003',
    receipt_number: 'STK-MSK-2026-003',
    receipt_date: '2026-02-01',
    supplier_name: 'Toko Besi Maju',
    document_number: 'INV-TBM-2026-012',
    customer_id: null,
    customer: null,
    notes: 'Pembelian material umum — kawat tanpa kategori, baut & plat dikategorisasi per ukuran',
    items: [
      // Kawat: tidak dikategorisasi (satu ukuran saja)
      {
        id: 7, uuid: 'ri-007', receipt_id: 4,
        stock_item_id: 3, stock_item: MOCK_STOCK_ITEMS[2],
        qty: 50, notes: null, kategori_name: null,
      },
      // Baut Anchor M16: dikategorisasi per panjang
      {
        id: 8, uuid: 'ri-008', receipt_id: 4,
        stock_item_id: 4, stock_item: MOCK_STOCK_ITEMS[3],
        qty: 600, notes: null, kategori_name: 'Panjang 100mm',
      },
      {
        id: 9, uuid: 'ri-009', receipt_id: 4,
        stock_item_id: 4, stock_item: MOCK_STOCK_ITEMS[3],
        qty: 400, notes: 'Untuk sambungan fondasi dalam', kategori_name: 'Panjang 150mm',
      },
      // Plat Besi 6mm: dikategorisasi per ukuran lembar
      {
        id: 10, uuid: 'ri-010', receipt_id: 4,
        stock_item_id: 5, stock_item: MOCK_STOCK_ITEMS[4],
        qty: 20, notes: null, kategori_name: 'Ukuran 4x8 ft',
      },
      {
        id: 11, uuid: 'ri-011', receipt_id: 4,
        stock_item_id: 5, stock_item: MOCK_STOCK_ITEMS[4],
        qty: 10, notes: 'Ukuran kecil untuk potongan custom', kategori_name: 'Ukuran 4x4 ft',
      },
    ],
    created_by: 1,
    created_by_name: 'Admin Ops PNJ',
    created_at: '2026-02-01T09:00:00Z',
    updated_at: '2026-02-01T09:00:00Z',
  },

  // ── rcpt-2026-004 : Kloter Mar 2026 — 2 tipe tiang ──────────────────────
  {
    id: 5,
    uuid: 'rcpt-2026-004',
    receipt_number: 'STK-MSK-2026-004',
    receipt_date: '2026-03-05',
    supplier_name: 'Kapal Bahari 27',
    document_number: 'SPAL 145',
    customer_id: 1,
    customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null,
    items: [
      {
        id: 12, uuid: 'ri-012', receipt_id: 5,
        stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0],
        qty: 80, notes: null, kategori_name: 'TM 12/200',
      },
      {
        id: 13, uuid: 'ri-013', receipt_id: 5,
        stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0],
        qty: 50, notes: 'Cadangan proyek Sintang', kategori_name: 'TR 9/200',
      },
    ],
    created_by: 1,
    created_by_name: 'Admin Ops PNJ',
    created_at: '2026-03-05T08:00:00Z',
    updated_at: '2026-03-05T08:00:00Z',
  },

  // ── rcpt-2026-005 : Restock Baut & Plat Mar 2026 ─────────────────────────
  // Menambah variasi: Baut dengan tambahan kategori "Panjang 200mm",
  // Plat hanya "Ukuran 4x8 ft" (satu kategori pun tetap bisa pakai kategorisasi)
  {
    id: 6,
    uuid: 'rcpt-2026-005',
    receipt_number: 'STK-MSK-2026-005',
    receipt_date: '2026-03-20',
    supplier_name: 'Toko Besi Maju',
    document_number: 'INV-TBM-2026-031',
    customer_id: null,
    customer: null,
    notes: 'Restock baut dan plat — penambahan varian panjang 200mm',
    items: [
      {
        id: 14, uuid: 'ri-014', receipt_id: 6,
        stock_item_id: 4, stock_item: MOCK_STOCK_ITEMS[3],
        qty: 200, notes: null, kategori_name: 'Panjang 100mm',
      },
      {
        id: 15, uuid: 'ri-015', receipt_id: 6,
        stock_item_id: 4, stock_item: MOCK_STOCK_ITEMS[3],
        qty: 150, notes: null, kategori_name: 'Panjang 200mm',
      },
      {
        id: 16, uuid: 'ri-016', receipt_id: 6,
        stock_item_id: 5, stock_item: MOCK_STOCK_ITEMS[4],
        qty: 8, notes: null, kategori_name: 'Ukuran 4x8 ft',
      },
    ],
    created_by: 1,
    created_by_name: 'Admin Ops PNJ',
    created_at: '2026-03-20T09:00:00Z',
    updated_at: '2026-03-20T09:00:00Z',
  },
]

// ─── Stock Disbursements ──────────────────────────────────────────────────────
// Semua pengeluaran Tiang Beton menggunakan item id:1 (induk).
// Disbursement tidak memiliki kategorisasi — keluar sebagai "Tiang Beton" saja.
//
// Tiang Beton keluar total:
//   disb-001..005 (ke TAG)      : 48+48+40+48+48 = 232
//   disb-006..009 (ke TAG)      : 48+64+64+48    = 224
//   disb-010..011 (ke ATP BIO)  : 80+66          = 146
//   Total keluar                                 : 602 btg ✓

export const MOCK_STOCK_DISBURSEMENTS: StockDisbursement[] = [
  // ── Tiang Beton → PT. Tonggak Ampuh Global ───────────────────────────────
  {
    id: 1, uuid: 'disb-001', disbursement_number: 'STK-KLR-2026-001',
    disbursement_date: '2026-01-09',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 48,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '354', invoice_number_manual: '2650',
    driver_name: 'Setyo', vehicle_plate: 'BE 8330 OU',
    destination: 'Perum Puri Agung, Pontianak',
    customer_id: 1, customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-01-09T07:00:00Z', updated_at: '2026-01-09T07:00:00Z',
  },
  {
    id: 2, uuid: 'disb-002', disbursement_number: 'STK-KLR-2026-002',
    disbursement_date: '2026-01-19',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 48,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '356', invoice_number_manual: '2654',
    driver_name: 'Wawan', vehicle_plate: 'KB 8693 HC',
    destination: 'Desa Nyin, Kab. Landak',
    customer_id: 1, customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-01-19T07:00:00Z', updated_at: '2026-01-19T07:00:00Z',
  },
  {
    id: 3, uuid: 'disb-003', disbursement_number: 'STK-KLR-2026-003',
    disbursement_date: '2026-02-03',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 40,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '370', invoice_number_manual: '2680',
    driver_name: 'Abray', vehicle_plate: 'KB 8873 WC',
    destination: 'Desa Nyin, Kab. Landak',
    customer_id: 1, customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-02-03T07:00:00Z', updated_at: '2026-02-03T07:00:00Z',
  },
  {
    id: 4, uuid: 'disb-004', disbursement_number: 'STK-KLR-2026-004',
    disbursement_date: '2026-02-10',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 48,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '378', invoice_number_manual: '2690',
    driver_name: 'Setyo', vehicle_plate: 'BE 8330 OU',
    destination: 'Perum Puri Agung, Pontianak',
    customer_id: 1, customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-02-10T07:00:00Z', updated_at: '2026-02-10T07:00:00Z',
  },
  {
    id: 5, uuid: 'disb-005', disbursement_number: 'STK-KLR-2026-005',
    disbursement_date: '2026-03-01',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 48,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '390', invoice_number_manual: '2710',
    driver_name: 'Wawan', vehicle_plate: 'KB 8693 HC',
    destination: 'Desa Nyin, Kab. Landak',
    customer_id: 1, customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-03-01T07:00:00Z', updated_at: '2026-03-01T07:00:00Z',
  },
  {
    id: 6, uuid: 'disb-006', disbursement_number: 'STK-KLR-2026-006',
    disbursement_date: '2026-01-24',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 48,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '362', invoice_number_manual: '2666',
    driver_name: 'Abray', vehicle_plate: 'KB 8873 WC',
    destination: 'Desa Nyin, Kab. Landak',
    customer_id: 1, customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-01-24T07:00:00Z', updated_at: '2026-01-24T07:00:00Z',
  },
  {
    id: 7, uuid: 'disb-007', disbursement_number: 'STK-KLR-2026-007',
    disbursement_date: '2026-02-05',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 64,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '372', invoice_number_manual: '2682',
    driver_name: 'Setyo', vehicle_plate: 'BE 8330 OU',
    destination: 'Perum Puri Agung, Pontianak',
    customer_id: 1, customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-02-05T07:00:00Z', updated_at: '2026-02-05T07:00:00Z',
  },
  {
    id: 8, uuid: 'disb-008', disbursement_number: 'STK-KLR-2026-008',
    disbursement_date: '2026-02-20',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 64,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '385', invoice_number_manual: '2700',
    driver_name: 'Wawan', vehicle_plate: 'KB 8693 HC',
    destination: 'Desa Nyin, Kab. Landak',
    customer_id: 1, customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-02-20T07:00:00Z', updated_at: '2026-02-20T07:00:00Z',
  },
  {
    id: 9, uuid: 'disb-009', disbursement_number: 'STK-KLR-2026-009',
    disbursement_date: '2026-03-10',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 48,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '395', invoice_number_manual: '2715',
    driver_name: 'Abray', vehicle_plate: 'KB 8873 WC',
    destination: 'Desa Nyin, Kab. Landak',
    customer_id: 1, customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-03-10T07:00:00Z', updated_at: '2026-03-10T07:00:00Z',
  },
  // ── Tiang Beton → PT. ATP BIO ─────────────────────────────────────────────
  {
    id: 10, uuid: 'disb-010', disbursement_number: 'STK-KLR-2026-010',
    disbursement_date: '2026-01-20',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 80,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '365', invoice_number_manual: '2670',
    driver_name: 'Wawan', vehicle_plate: 'KB 8693 HC',
    destination: 'Lok. PT. ATP BIO, Kubu Raya',
    customer_id: 2, customer: { id: 2, name: 'PT. ATP BIO' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-01-20T07:00:00Z', updated_at: '2026-01-20T07:00:00Z',
  },
  {
    id: 11, uuid: 'disb-011', disbursement_number: 'STK-KLR-2026-011',
    disbursement_date: '2026-02-12',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 66,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '380', invoice_number_manual: '2693',
    driver_name: 'Setyo', vehicle_plate: 'BE 8330 OU',
    destination: 'Lok. PT. ATP BIO, Kubu Raya',
    customer_id: 2, customer: { id: 2, name: 'PT. ATP BIO' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-02-12T07:00:00Z', updated_at: '2026-02-12T07:00:00Z',
  },
  // ── Kawat Baja 7mm ────────────────────────────────────────────────────────
  {
    id: 12, uuid: 'disb-012', disbursement_number: 'STK-KLR-2026-012',
    disbursement_date: '2026-02-18',
    stock_item_id: 3, stock_item: MOCK_STOCK_ITEMS[2], qty: 12,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '383', invoice_number_manual: '2697',
    driver_name: 'Abray', vehicle_plate: 'KB 8873 WC',
    destination: 'Lok. PT. ATP BIO, Kubu Raya',
    customer_id: 2, customer: { id: 2, name: 'PT. ATP BIO' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-02-18T07:00:00Z', updated_at: '2026-02-18T07:00:00Z',
  },
  {
    id: 13, uuid: 'disb-013', disbursement_number: 'STK-KLR-2026-013',
    disbursement_date: '2026-03-28',
    stock_item_id: 3, stock_item: MOCK_STOCK_ITEMS[2], qty: 20,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '405', invoice_number_manual: '2727',
    driver_name: 'Wawan', vehicle_plate: 'KB 8693 HC',
    destination: 'Lok. PT. ATP BIO, Kubu Raya',
    customer_id: 2, customer: { id: 2, name: 'PT. ATP BIO' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-03-28T07:00:00Z', updated_at: '2026-03-28T07:00:00Z',
  },
  // ── Baut Anchor M16 ───────────────────────────────────────────────────────
  {
    id: 14, uuid: 'disb-014', disbursement_number: 'STK-KLR-2026-014',
    disbursement_date: '2026-03-08',
    stock_item_id: 4, stock_item: MOCK_STOCK_ITEMS[3], qty: 400,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '392', invoice_number_manual: '2712',
    driver_name: 'Wawan', vehicle_plate: 'KB 8693 HC',
    destination: 'Desa Nyin, Kab. Landak',
    customer_id: 1, customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-03-08T07:00:00Z', updated_at: '2026-03-08T07:00:00Z',
  },
  {
    id: 15, uuid: 'disb-015', disbursement_number: 'STK-KLR-2026-015',
    disbursement_date: '2026-03-15',
    stock_item_id: 4, stock_item: MOCK_STOCK_ITEMS[3], qty: 280,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '398', invoice_number_manual: '2718',
    driver_name: 'Setyo', vehicle_plate: 'BE 8330 OU',
    destination: 'Lok. PT. ATP BIO, Kubu Raya',
    customer_id: 2, customer: { id: 2, name: 'PT. ATP BIO' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-03-15T07:00:00Z', updated_at: '2026-03-15T07:00:00Z',
  },
  // ── Plat Besi 6mm ─────────────────────────────────────────────────────────
  {
    id: 16, uuid: 'disb-016', disbursement_number: 'STK-KLR-2026-016',
    disbursement_date: '2026-03-25',
    stock_item_id: 5, stock_item: MOCK_STOCK_ITEMS[4], qty: 8,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '402', invoice_number_manual: '2724',
    driver_name: 'Abray', vehicle_plate: 'KB 8873 WC',
    destination: 'Desa Nyin, Kab. Landak',
    customer_id: 1, customer: { id: 1, name: 'PT. Tonggak Ampuh Global' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-03-25T07:00:00Z', updated_at: '2026-03-25T07:00:00Z',
  },
  // ── PT. Kalbar Energi ─────────────────────────────────────────────────────
  {
    id: 17, uuid: 'disb-017', disbursement_number: 'STK-KLR-2026-017',
    disbursement_date: '2026-01-25',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 80,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '364', invoice_number_manual: '2668',
    driver_name: 'Wawan', vehicle_plate: 'KB 8693 HC',
    destination: 'Lok. PT. Kalbar Energi, Kubu Raya',
    customer_id: 3, customer: { id: 3, name: 'PT. Kalbar Energi' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-01-25T07:00:00Z', updated_at: '2026-01-25T07:00:00Z',
  },
  {
    id: 18, uuid: 'disb-018', disbursement_number: 'STK-KLR-2026-018',
    disbursement_date: '2026-02-08',
    stock_item_id: 4, stock_item: MOCK_STOCK_ITEMS[3], qty: 150,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '375', invoice_number_manual: '2686',
    driver_name: 'Setyo', vehicle_plate: 'BE 8330 OU',
    destination: 'Lok. PT. Kalbar Energi, Kubu Raya',
    customer_id: 3, customer: { id: 3, name: 'PT. Kalbar Energi' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-02-08T07:00:00Z', updated_at: '2026-02-08T07:00:00Z',
  },
  {
    id: 19, uuid: 'disb-019', disbursement_number: 'STK-KLR-2026-019',
    disbursement_date: '2026-03-18',
    stock_item_id: 5, stock_item: MOCK_STOCK_ITEMS[4], qty: 5,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '400', invoice_number_manual: '2720',
    driver_name: 'Abray', vehicle_plate: 'KB 8873 WC',
    destination: 'Lok. PT. Kalbar Energi, Kubu Raya',
    customer_id: 3, customer: { id: 3, name: 'PT. Kalbar Energi' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-03-18T07:00:00Z', updated_at: '2026-03-18T07:00:00Z',
  },
  // ── PT. Borneo Maju Sejahtera ──────────────────────────────────────────────
  {
    id: 20, uuid: 'disb-020', disbursement_number: 'STK-KLR-2026-020',
    disbursement_date: '2026-02-22',
    stock_item_id: 1, stock_item: MOCK_STOCK_ITEMS[0], qty: 48,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '387', invoice_number_manual: '2703',
    driver_name: 'Wawan', vehicle_plate: 'KB 8693 HC',
    destination: 'Lok. PT. Borneo Maju, Pontianak',
    customer_id: 4, customer: { id: 4, name: 'PT. Borneo Maju Sejahtera' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-02-22T07:00:00Z', updated_at: '2026-02-22T07:00:00Z',
  },
  {
    id: 21, uuid: 'disb-021', disbursement_number: 'STK-KLR-2026-021',
    disbursement_date: '2026-03-02',
    stock_item_id: 3, stock_item: MOCK_STOCK_ITEMS[2], qty: 8,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '391', invoice_number_manual: '2711',
    driver_name: 'Abray', vehicle_plate: 'KB 8873 WC',
    destination: 'Lok. PT. Borneo Maju, Pontianak',
    customer_id: 4, customer: { id: 4, name: 'PT. Borneo Maju Sejahtera' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-03-02T07:00:00Z', updated_at: '2026-03-02T07:00:00Z',
  },
  {
    id: 22, uuid: 'disb-022', disbursement_number: 'STK-KLR-2026-022',
    disbursement_date: '2026-04-05',
    stock_item_id: 4, stock_item: MOCK_STOCK_ITEMS[3], qty: 100,
    delivery_order_id: null, delivery_order: null,
    sj_number_manual: '410', invoice_number_manual: '2731',
    driver_name: 'Setyo', vehicle_plate: 'BE 8330 OU',
    destination: 'Lok. PT. Borneo Maju, Pontianak',
    customer_id: 4, customer: { id: 4, name: 'PT. Borneo Maju Sejahtera' },
    notes: null, created_by: 1, created_by_name: 'Admin Ops PNJ',
    created_at: '2026-04-05T07:00:00Z', updated_at: '2026-04-05T07:00:00Z',
  },
]
