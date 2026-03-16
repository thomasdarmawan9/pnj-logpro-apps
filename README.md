# PNJ Control — Sistem Manajemen Armada & Operasional

Aplikasi manajemen operasional berbasis web untuk **PT. Pelangi Nuansa Jaya (PNJ)**, mencakup pengelolaan Surat Jalan, Invoice, dan Stok Barang secara terpadu.

---

## Fitur Utama

### 📋 Modul Surat Jalan
- Pembuatan dan pengelolaan Surat Jalan (SJ) pengiriman
- Alur status operasional: Draft → Assigned → Delivered → Void
- Penugasan armada & supir (dari master atau input manual)
- Upload foto bukti pengiriman (POD)
- Generate PDF Surat Jalan
- Filter & pencarian berdasarkan status, tanggal, customer

### 🧾 Modul Invoice
- Pembuatan invoice dengan kalkulasi pajak (PPN)
- Lampirkan Surat Jalan ke Invoice
- Pencatatan pembayaran bertahap (partial payment)
- Alur status: Draft → Sent → Outstanding → Paid → Void
- Progress bar pembayaran realtime
- Generate PDF Invoice
- Laporan Aging AR

### 📦 Modul Manajemen Stok
- Dashboard saldo stok per barang dengan indikator level (hijau/amber/merah)
- Grafik pergerakan stok 30 hari (Recharts)
- **Stok Masuk**: pencatatan penerimaan barang dari kapal/supplier per batch
- **Stok Keluar**: pencatatan distribusi per trip, bisa referensikan SJ atau input manual
- Laporan Rekap dengan *running balance* per baris (format dokumen PDF)
- Validasi ketat: saldo stok tidak boleh negatif
- Master Barang: kelola kode, nama, kategori, satuan

### 🔐 Autentikasi & Role
| Role | Akses |
|------|-------|
| `super_admin` | Full access — termasuk hapus data |
| `admin_ops` | Buat & edit SJ, Stok Masuk/Keluar, Master Barang |
| `admin_finance` | Buat & kelola Invoice; view-only untuk SJ & Stok |

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

State global dikelola dengan **Redux Toolkit** (slice per modul: `authSlice`, `suratJalanSlice`, `invoiceSlice`, `stockSlice`).

---

## Struktur Direktori

```
logproapp/
├── app/                        # Next.js App Router routes
│   ├── dashboard/
│   ├── invoice/
│   ├── surat-jalan/
│   ├── stok/
│   └── login/
├── components/
│   ├── layout/                 # DashboardLayout, Sidebar, Topbar
│   ├── dashboard/              # MetricCard, RevenueChart, dll
│   ├── toast/                  # Toast notification system
│   └── ui/                     # Badge, StatusBadge
├── features/
│   ├── invoice/
│   ├── surat-jalan/
│   └── stock/
├── store/
│   ├── index.ts
│   └── slices/
└── lib/
    └── mockData/               # Mock data untuk development
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

| Field | Value |
|-------|-------|
| Email | `admin@pnj.co.id` |
| Password | `pnj2026` |

### Scripts

```bash
npm run dev      # Development server (Turbopack)
npm run build    # Production build
npm run start    # Jalankan production build
npm run lint     # Cek kode dengan ESLint
```

---

## Halaman & Routes

| Route | Deskripsi |
|-------|-----------|
| `/dashboard` | Dashboard utama — metrik & aktivitas |
| `/surat-jalan` | Daftar Surat Jalan |
| `/surat-jalan/create` | Buat SJ baru |
| `/surat-jalan/[uuid]` | Detail SJ |
| `/invoice` | Daftar Invoice |
| `/invoice/create` | Buat Invoice baru |
| `/invoice/[uuid]` | Detail Invoice |
| `/stok` | Dashboard Stok |
| `/stok/barang` | Master Barang |
| `/stok/masuk` | Daftar Stok Masuk |
| `/stok/masuk/create` | Input Stok Masuk |
| `/stok/keluar` | Daftar Stok Keluar |
| `/stok/keluar/create` | Input Stok Keluar |
| `/stok/laporan` | Laporan Rekap Stok |

---

## Catatan Development

- Semua data saat ini menggunakan **mock repository** (in-memory) — belum terhubung ke backend/database.
- Untuk koneksi ke backend nyata, implementasikan interface di `features/[module]/infrastructure/repositories/` sesuai kontrak yang sudah tersedia.
- Design system menggunakan CSS variables di `app/globals.css` (warna, font, spacing).
- Font: **Plus Jakarta Sans** (UI) + **JetBrains Mono** (kode/angka).

---

*PT. Pelangi Nuansa Jaya — Internal Operations System*
