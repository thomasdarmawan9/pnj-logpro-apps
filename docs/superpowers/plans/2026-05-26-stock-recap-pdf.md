# Stock Recap PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to continue this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan fitur cetak PDF pada Manajemen Stok / Laporan Rekap agar output mengikuti format dokumen contoh `Rekapan Tiang Tonggak Ampuh Global (1).pdf`.

**Architecture:** Backend memakai data yang sama dengan endpoint rekap stok (`stockReport.service.recap`) lalu merender PDF landscape dengan PDFKit. Frontend menambahkan tombol `Cetak PDF` pada halaman laporan stok dan mengirim filter barang/periode yang sedang aktif.

**Tech Stack:** Node.js + Express + PDFKit (backend), Next.js + TypeScript (frontend).

---

## Analisa PDF Contoh

Dokumen contoh adalah rekap muat/stok landscape bergaya spreadsheet.

| Value di PDF contoh | Mapping data manajemen stok |
|---|---|
| Judul: `Rekapan Muat Tiang, PT. Tonggak Ampuh ( Global ) TA` | Nama barang dari `stock_item.name`, dengan title default `Rekapan Muat {nama_barang}` |
| `No` | Nomor urut transaksi stok keluar |
| `Tanggal` | `disbursement_date` untuk keluar, `receipt_date` untuk tambahan stok |
| `Sopir` | `driver_name` atau `delivery_order.driver_name_manual` |
| `No Pol` | `vehicle_plate` |
| Kolom `Stok Tiang TM 12/200`, `Stok Tiang TR 9/200` | Kolom dinamis dari `kategori_name` per receipt/disbursement |
| `Alamat Tujuan` | `destination` atau `delivery_order.destination` |
| `No Invoice` | `invoice_number_manual` atau `delivery_order.invoice.invoice_number` |
| `No SJ` | `sj_number_manual` atau `delivery_order.sj_number` |
| Baris `Tambahan Stok` angka hijau positif | Data `receipt` dengan `qty_in` |
| Baris muat angka negatif | Data `disbursement` dengan `qty_out` |

---

## File Map

| File | Action | Tanggung Jawab |
|---|---|---|
| `pnj-backend/src/pdf/stockRecap.template.js` | Create | Template PDF landscape sesuai format rekap stok contoh |
| `pnj-backend/src/controllers/stockReports.controller.js` | Modify | Tambah handler `exportPdf` |
| `pnj-backend/src/routes/stock.routes.js` | Modify | Tambah route `GET /stock/report/export/pdf` |
| `pnj-backend/src/services/stockReport.service.js` | Modify | Lengkapi row rekap dengan `invoice_number` dan `kategori_name` untuk PDF |
| `features/stock/presentation/pages/StockReportPage.tsx` | Modify | Tambah tombol `Cetak PDF` dan download file dari API |

---

## Task 1: Backend Template PDF

**Files:**
- Create: `pnj-backend/src/pdf/stockRecap.template.js`

- [x] **Step 1: Buat renderer PDF landscape**

Renderer membuat tabel dengan kolom:
`No`, `Tanggal`, `Sopir`, `No Pol`, kolom dinamis `Stok {kategori}`, `Alamat Tujuan`, `No Invoice`, `No SJ`.

- [x] **Step 2: Render receipt sebagai baris Tambahan Stok**

Receipt ditampilkan sebagai baris tinggi dengan label `Tambahan Stok`, referensi dokumen/SPAL, catatan, dan qty positif hijau pada kolom kategori yang sesuai.

- [x] **Step 3: Render disbursement sebagai baris muat**

Disbursement ditampilkan sebagai baris transaksi dengan sopir, no pol, tujuan, invoice, SJ, dan qty negatif pada kolom kategori.

- [x] **Step 4: Tambahkan summary**

Summary menampilkan `Total Masuk`, `Total Keluar`, dan `Saldo Akhir`.

---

## Task 2: Backend Endpoint PDF

**Files:**
- Modify: `pnj-backend/src/controllers/stockReports.controller.js`
- Modify: `pnj-backend/src/routes/stock.routes.js`

- [x] **Step 1: Tambah controller `exportPdf`**

Controller mengambil data dari `service.recap(req.query)`, membuat `PDFDocument` A4 landscape, lalu pipe hasil PDF ke response.

- [x] **Step 2: Tambah route**

Route:

```txt
GET /api/v1/stock/report/export/pdf?stock_item_uuid={uuid}&period={period}
```

Untuk periode custom:

```txt
GET /api/v1/stock/report/export/pdf?stock_item_uuid={uuid}&period=custom&from=2026-01-01&to=2026-01-31
```

- [x] **Step 3: Pakai validasi query rekap existing**

Route memakai `listRecapQuery`, sama seperti endpoint JSON rekap.

---

## Task 3: Data Model untuk PDF

**Files:**
- Modify: `pnj-backend/src/services/stockReport.service.js`

- [x] **Step 1: Include Invoice dari DeliveryOrder**

`DeliveryOrder` pada query disbursement include relasi `invoice` agar PDF bisa menampilkan `No Invoice`.

- [x] **Step 2: Tambahkan `invoice_number` di row disbursement**

Prioritas:
1. `invoice_number_manual`
2. `delivery_order.invoice.invoice_number`
3. kosong

- [x] **Step 3: Pastikan `kategori_name` keluar dipakai**

`kategori_name` dari disbursement dipakai untuk menentukan kolom stok dinamis.

---

## Task 4: Frontend Tombol Cetak

**Files:**
- Modify: `features/stock/presentation/pages/StockReportPage.tsx`

- [x] **Step 1: Tambah tombol `Cetak PDF`**

Tombol berada di header halaman `Laporan Rekap Stok`.

- [x] **Step 2: Download PDF dengan filter aktif**

Request memakai:
- `stock_item_uuid` dari barang terpilih
- `period` dari filter halaman
- `from` dan `to` jika periode `custom`

- [x] **Step 3: Disable tombol saat belum ada barang**

Tombol disabled jika barang belum dipilih atau sedang proses download.

---

## Task 5: Verification

- [x] **Step 1: Syntax check backend**

```bash
node -c pnj-backend/src/pdf/stockRecap.template.js
node -c pnj-backend/src/controllers/stockReports.controller.js
node -c pnj-backend/src/services/stockReport.service.js
node -c pnj-backend/src/routes/stock.routes.js
```

- [x] **Step 2: Lint frontend file**

```bash
npx eslint features/stock/presentation/pages/StockReportPage.tsx
```

- [x] **Step 3: Render smoke test PDF dengan dummy data**

PDF dummy berhasil dirender lokal untuk memastikan template tidak crash.

- [ ] **Step 4: Test end-to-end dengan backend berjalan**

Jalankan backend dan frontend, login, buka `Manajemen Stok / Laporan Rekap`, pilih barang, klik `Cetak PDF`, lalu cek file hasil download.

- [ ] **Step 5: Validasi dengan data asli customer Tonggak Ampuh**

Cek apakah kategori, invoice, SJ, sopir, no pol, dan tujuan tampil sesuai data produksi/staging.

---

## Task 6: Audit Fixes

- [x] **Step 1: Kirim filter customer dari frontend ke backend**

Saat `Filter Customer` dipilih di halaman laporan stok, tombol `Cetak PDF` sekarang mengirim `customer_uuid` ke endpoint PDF.

- [x] **Step 2: Tambahkan customer ke payload recap backend**

`stockReport.service.recap` sekarang mengembalikan `customer` saat `customer_uuid` valid, sehingga controller PDF bisa membuat judul spesifik customer.

- [x] **Step 3: Buat judul PDF mengikuti customer**

Jika customer dipilih, title menjadi `Rekapan Muat {barang}, {customer}`. Jika tidak ada customer, fallback tetap `Rekapan Muat {barang}`.

- [x] **Step 4: Rapikan label periode PDF**

`from/to` hasil validasi Joi diformat menjadi `YYYY-MM-DD`, dan pilihan preset tampil sebagai `Bulan ini`, `Bulan lalu`, atau `Semua waktu`.

- [x] **Step 5: Tambahkan refresh-token retry untuk download**

`apiDownload` sekarang mengikuti pola `apiRequest`: jika response `401`, coba refresh token, retry download, lalu force logout jika tetap gagal.

- [x] **Step 6: Kurangi risiko teks overlap di row PDF**

Cell row pendek untuk sopir, no pol, tujuan, invoice, dan SJ memakai ellipsis agar teks panjang tidak menabrak baris lain.

---

## Notes

- PDF sekarang mendukung filter dan judul per customer jika user memilih `Filter Customer`.
- Jika output wajib menampilkan nama proyek seperti contoh suffix `( Global ) TA`, data proyek belum tersedia di laporan stok saat ini. Lanjutkan dengan menambahkan filter/relasi proyek jika dibutuhkan.
- Jika kategori terlalu banyak, kolom stok akan makin sempit. Untuk kasus itu, opsi lanjutan adalah membatasi kategori per halaman atau membuat grouping per kategori.
