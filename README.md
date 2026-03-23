# PNJ Control — Sistem Manajemen Armada & Operasional

Aplikasi manajemen operasional berbasis web untuk **PT. Pelangi Nuansa Jaya (PNJ)**, mencakup pengelolaan Surat Jalan, Invoice, Stok Barang, Master Data, Laporan, dan Pengaturan Sistem secara terpadu.

---

## Fitur Utama

### 📋 Modul Surat Jalan
- Pembuatan dan pengelolaan Surat Jalan (SJ) pengiriman
- Alur status operasional: Draft → Assigned → Delivered → Void
- Penugasan armada & supir (dari master atau input manual)
- Upload foto bukti pengiriman (POD)
- Generate PDF Surat Jalan
- Filter & pencarian berdasarkan status, tanggal, customer, proyek

### 🧾 Modul Invoice
- Pembuatan invoice dengan kalkulasi pajak (PPN) — otomatis berdasarkan status PKP customer
- Lampirkan Surat Jalan ke Invoice
- Pencatatan pembayaran bertahap (partial payment)
- Alur status: Draft → Sent → Outstanding → Paid → Void
- Progress bar pembayaran realtime
- Generate PDF Invoice

### 📦 Modul Manajemen Stok
- Dashboard saldo stok per barang dengan indikator level (hijau/amber/merah)
- Grafik pergerakan stok 30 hari (Recharts)
- **Stok Masuk**: pencatatan penerimaan barang dari kapal/supplier per batch
- **Stok Keluar**: pencatatan distribusi per trip, bisa referensikan SJ atau input manual
- Laporan Rekap dengan *running balance* per baris (format dokumen PDF)
- Validasi ketat: saldo stok tidak boleh negatif
- Master Barang: kelola kode, nama, kategori, satuan

### 🗂️ Modul Master Data
- **Master Customer** — CRUD customer dengan status PKP, NPWP, data PIC & kontak; filter by PKP/piutang
- **Master Armada** — CRUD kendaraan dengan kategori (Truck, Trailer, Mobil Keluarga, Alat Berat, Lainnya), status aktif/nonaktif/terjual; proteksi unit TBD
- **Master Supir** — CRUD supir dengan pelacakan SIM (nomor, tanggal kadaluarsa); badge & alert otomatis untuk SIM expired/expiring soon
- **Master Proyek & Kontrak** — CRUD proyek terhubung ke customer; halaman detail per-proyek dengan ringkasan keuangan (revenue, biaya ops, gross profit), tab Surat Jalan & Invoice

### 📊 Modul Laporan
- **Aging AR** — Analisis piutang menurut bucket umur (Current, 1–30, 31–60, 61–90, >90 hari); export Excel
- **Profit & Loss** — Laporan laba-rugi per proyek dalam periode tertentu; export Excel
- **Utilisasi Armada** *(super_admin only)* — Persentase utilisasi per unit kendaraan dengan bar chart (Recharts); filter periode & kategori; export Excel
- **Audit Trail** *(super_admin only)* — Log aktivitas seluruh pengguna sistem

### ⚙️ Modul Pengaturan Sistem *(super_admin only)*
- **User Management** — CRUD akun pengguna; reset password; lock/unlock akun; role-based access
- **Nomor Otomatis** — Konfigurasi format & urutan nomor SJ, Invoice, Stok Masuk, Stok Keluar; live preview format
- **Profil Perusahaan** — Nama, alamat, kontak, rekening bank, logo, dan persentase pajak default; preview kop surat langsung di halaman

### 🔐 Autentikasi & Role
| Role | Akses |
|------|-------|
| `super_admin` | Full access — termasuk Laporan, Pengaturan, hapus data |
| `admin_ops` | Buat & edit SJ, Stok Masuk/Keluar, Master Data |
| `admin_finance` | Buat & kelola Invoice; view-only untuk SJ, Stok, Master Customer |

---

## Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Language | TypeScript 5 |
| State Management | Redux Toolkit + React Redux |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Icons | Lucide React |
| Export | ExcelJS |
| Linting | ESLint (eslint-config-next) |

---

## Arsitektur

Proyek ini menggunakan **Clean Architecture** dengan pemisahan yang jelas antar lapisan:

```
features/
└── [module]/
    ├── domain/
    │   ├── entities/        ← TypeScript interfaces & types
    │   └── value-objects/
    ├── application/
    │   ├── dto/             ← Data Transfer Objects
    │   ├── use-cases/       ← Business logic
    │   └── validators/      ← Validation rules
    ├── infrastructure/
    │   └── repositories/    ← Interface + Mock implementation
    └── presentation/
        ├── pages/           ← Page components
        ├── components/      ← UI components & modals
        └── hooks/           ← Custom React hooks
```

State global dikelola dengan **Redux Toolkit** (slice per modul: `authSlice`, `suratJalanSlice`, `invoiceSlice`, `stockSlice`, `masterSlice`, `settingsSlice`).

---

## Struktur Direktori

```
logproapp/
├── app/                        # Next.js App Router routes
│   ├── dashboard/
│   ├── invoice/
│   ├── surat-jalan/
│   ├── stok/
│   ├── master/
│   │   ├── customer/
│   │   ├── armada/
│   │   ├── supir/
│   │   └── proyek/
│   │       └── [uuid]/
│   ├── laporan/
│   │   ├── aging-ar/
│   │   ├── profit-loss/
│   │   ├── utilisasi/
│   │   └── audit-trail/
│   ├── settings/
│   │   ├── users/
│   │   ├── numbering/
│   │   └── company/
│   └── login/
├── components/
│   ├── layout/                 # DashboardLayout, Sidebar (collapsible), Topbar
│   ├── dashboard/              # MetricCard, RevenueChart, dll
│   ├── toast/                  # Toast notification system
│   └── ui/                     # FleetCategoryBadge, FleetStatusBadge, SIMStatusBadge
├── features/
│   ├── invoice/
│   ├── surat-jalan/
│   ├── stock/
│   ├── master/
│   ├── reports/
│   └── settings/
├── store/
│   ├── index.ts
│   └── slices/
└── lib/
    ├── mockData/               # Mock data untuk development
    ├── formatters.ts           # formatRupiah, formatDate, dll
    └── exportFleetUtilization.ts
```

---

## Cara Menjalankan

### Prerequisites
- Node.js 20+
- npm

### Instalasi

```bash
# Clone repository
git clone https://github.com/your-username/logproapp.git
cd logproapp

# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser.

### Login

Gunakan kredensial berikut untuk masuk:

| Email | Password | Role |
|-------|----------|------|
| `admin@pnj.co.id` | `pnj2026` | super_admin |

### Scripts

```bash
npm run dev      # Development server (Turbopack)
npm run build    # Production build
npm run start    # Jalankan production build
npm run lint     # Cek kode dengan ESLint
```

---

## Halaman & Routes

| Route | Deskripsi | Role |
|-------|-----------|------|
| `/dashboard` | Dashboard utama — metrik & aktivitas | Semua |
| `/surat-jalan` | Daftar Surat Jalan | Semua |
| `/surat-jalan/create` | Buat SJ baru | super_admin, admin_ops |
| `/surat-jalan/[uuid]` | Detail SJ | Semua |
| `/invoice` | Daftar Invoice | Semua |
| `/invoice/create` | Buat Invoice baru | super_admin, admin_finance |
| `/invoice/[uuid]` | Detail Invoice | Semua |
| `/stok` | Dashboard Stok | Semua |
| `/stok/barang` | Master Barang | Semua |
| `/stok/masuk` | Daftar Stok Masuk | Semua |
| `/stok/masuk/create` | Input Stok Masuk | super_admin, admin_ops |
| `/stok/keluar` | Daftar Stok Keluar | Semua |
| `/stok/keluar/create` | Input Stok Keluar | super_admin, admin_ops |
| `/stok/laporan` | Laporan Rekap Stok | Semua |
| `/master/customer` | Master Customer | Semua |
| `/master/armada` | Master Armada | Semua |
| `/master/supir` | Master Supir | Semua |
| `/master/proyek` | Daftar Proyek & Kontrak | Semua |
| `/master/proyek/[uuid]` | Detail Proyek | Semua |
| `/laporan/aging-ar` | Laporan Aging Piutang AR | super_admin, admin_finance |
| `/laporan/profit-loss` | Laporan Profit & Loss | super_admin |
| `/laporan/utilisasi` | Laporan Utilisasi Armada | super_admin |
| `/laporan/audit-trail` | Log Aktivitas Sistem | super_admin |
| `/settings/users` | Manajemen Pengguna | super_admin |
| `/settings/numbering` | Pengaturan Nomor Otomatis | super_admin |
| `/settings/company` | Profil Perusahaan | super_admin |

---

## Catatan Development

- Semua data saat ini menggunakan **mock repository** (in-memory) — belum terhubung ke backend/database.
- Untuk koneksi ke backend nyata, implementasikan interface di `features/[module]/infrastructure/repositories/` sesuai kontrak yang sudah tersedia.
- Design system menggunakan CSS variables di `app/globals.css` (warna, font, spacing).
- Font: **Plus Jakarta Sans** (UI) + **JetBrains Mono** (kode/angka).
- Sidebar mendukung mode **collapsed** (icon-only) dan **expanded** dengan grup navigasi yang bisa dilipat (Master Data, Laporan, Pengaturan).

---

*PT. Pelangi Nuansa Jaya — Internal Operations System*
