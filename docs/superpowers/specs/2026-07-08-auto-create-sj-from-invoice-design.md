# Auto-Create Surat Jalan dari Invoice (mode manual)

**Tanggal:** 2026-07-08
**Modul:** Invoice ↔ Surat Jalan
**Status:** Design disetujui, menunggu implementasi

## Latar Belakang

Di form Buat/Edit Invoice, input SJ punya dua mode:

- **`linked`** — pilih SJ yang sudah ada (mengisi `linked_sj_uuids`).
- **`manual`** — mengetik nomor SJ bebas di textarea, disimpan sebagai `manual_sj_numbers`
  (contoh `"SJ-001, SJ-002 / Tanda Terima 123"`). Saat ini **hanya teks referensi**:
  tidak membuat record SJ, tidak menautkan apa pun, tidak memengaruhi total invoice.

Tujuan fitur ini: saat submit invoice dalam mode manual, sistem **otomatis membuat**
(atau **menimpa**) record Surat Jalan nyata di modul SJ, dengan item di-mapping dari item
cargo invoice, lalu **menautkannya** ke invoice (termasuk otomatis muncul di PDF invoice).

Berlaku di halaman **Buat Invoice** dan **Edit Invoice**.

## Keputusan Desain (hasil brainstorming)

1. **Satu nomor SJ per invoice.** Mode manual dibatasi 1 nomor SJ; SEMUA item cargo invoice
   masuk ke 1 record SJ itu.
2. **Guard timpa:** tolak menimpa **hanya** kalau SJ lama sudah terkait invoice LAIN
   (`invoice_id` terisi dan ≠ invoice yang sedang diproses). Status delivered/void tetap boleh ditimpa.
3. **Timpa = replace penuh header + items**, tetapi `status`, `uuid`, `id`, `sj_number` SJ lama
   **dipertahankan**. Hanya `invoice_id` diarahkan ke invoice ini.
4. **Batal timpa:** invoice TIDAK jadi dibuat; tampilkan popup kedua menawarkan
   "hapus nomor SJ manual & lanjut buat invoice tanpa SJ".
5. **Scope:** Buat + Edit Invoice.
6. **Linkage:** SJ hasil auto-create masuk `attached_sj` invoice → otomatis jadi lampiran
   di modal Cetak PDF (fitur sudah ada, opsi default aktif).

## Alur (Buat / Simpan Edit)

```
Bukan (delivery-like & mode manual & tepat 1 nomor SJ)?  → alur normal (tak berubah)
Ya →
  existing = suratJalanRepository.getBySjNumber(nomor)
  ├─ existing terkait invoice LAIN (existing.invoice_id terisi & ≠ invoice ini)
  │     → tolak: toast "Nomor SJ sudah dipakai invoice INV-xxx" → batal submit
  ├─ existing ADA (bebas / invoice yang sama)
  │     → ConfirmOverwriteSJModal
  │        • "Ya, timpa SJ lama"  → simpan invoice → overwrite SJ (update) → attach
  │        • "Batal"              → ClearManualSJPrompt
  │             • "Ya, hapus & buat" → kosongkan field nomor → submit invoice TANPA SJ
  │             • "Kembali"          → kembali ke form, tidak ada yang dibuat
  └─ existing TIDAK ADA
        → simpan invoice → buat SJ baru (create) → attach   (tanpa konfirmasi)
```

Pengecekan nomor dilakukan **sebelum** invoice disimpan, agar blokir/batal bisa terjadi
tanpa terlanjur menyimpan invoice.

### Edit invoice lama multi-nomor

Invoice lama yang `manual_sj_numbers`-nya berisi lebih dari satu nomor (dipisah koma):
ditampilkan apa adanya, tetapi **sync SJ di-skip + warning** kalau isinya bukan tepat 1 nomor
tunggal. Ini mencegah kerusakan data lama.

## Mapping Item (Invoice → SJ)

Hanya baris **cargo/barang** yang dipetakan. Baris biaya tambahan
(`fleet_label === 'Pembiayaan Lainnya'`) **dikecualikan** — bukan barang.

| `SJItem` | Sumber dari `InvoiceItem` |
|---|---|
| `description` | `item.description` → fallback `cargo_description` header → `item.fleet_label` |
| `qty` | `item.cargo_qty ?? item.qty` |
| `unit` | `item.cargo_unit ?? item.unit` |
| `weight` | `item.cargo_weight ?? null` |
| `volume` | `item.cargo_volume ?? null` |
| `notes` | `item.cargo_notes ?? ''` |
| `source_type` | `'manual'` |

**Header SJ** dibangun dari invoice:

- `customer_id`, `project_id`
- `fleet_id` (dari Delivery Operations), `driver_id` / `driver_name_manual`
- `sj_date = invoice.delivery_date ?? invoice.invoice_date`
- `origin`, `destination`, `cargo_description`
- `operational_cost: 0`
- create: `status` = draft (default repo). overwrite: status lama dipertahankan.

Kalau tidak ada baris cargo sama sekali → SJ dibuat dengan `items: []` (tetap valid;
`SJItem[] | null` diperbolehkan entity).

## Arsitektur (Backend-centric)

**Penting:** repository frontend (`MockInvoiceRepository` / `MockSuratJalanRepository`) sebenarnya
memanggil **backend Node/Sequelize** di `pnj-backend/` (nama `Mock*` legacy). Kolom
`manual_sj_numbers` sudah ada di DB. Karena SJ auto-create harus **tertaut** ke invoice (agar masuk
`attached_sj` & PDF) dan endpoint attach yang ada hanya menerima SJ berstatus assigned/delivered,
orkestrasi dijalankan **di dalam transaksi backend** `invoice.service.create()` & `update()` —
atomik dan bebas dari aturan attach eksternal.

### Backend (`pnj-backend`)

1. **Endpoint lookup**: `GET /surat-jalan/lookup?sj_number=<n>`
   - `suratJalan.controller.lookup` → `suratJalan.service.lookupByNumber(sjNumber)`.
   - Return `{ exists: boolean, sj: { uuid, sj_number, status, invoice_id, invoice_number } | null }`.
   - Match persis (trim), kecualikan soft-deleted (model `paranoid`).

2. **Helper mapping** `buildSJItemsFromInvoiceItems(items)` di `invoice.service.js`:
   item cargo → `{ description, qty: cargo_qty ?? qty, unit: cargo_unit ?? unit, weight: cargo_weight, volume: cargo_volume, notes: cargo_notes, source_type: 'manual' }`.
   Baris `fleet_label === 'Pembiayaan Lainnya'` (additional charge) dikecualikan.

3. **Orkestrasi** `syncManualSj(invoice, payload, actor, t)` dipanggil di akhir transaksi
   `create()` & `update()` bila: non-rental, `manual_sj_numbers` berisi **tepat 1 token**, dan
   `auto_create_sj !== false`.
   - `existing = DeliveryOrder.findOne({ where: { sj_number }, lock })`
   - `existing.invoice_id` terisi & ≠ `invoice.id` → `ConflictError` kode `SJ_LINKED_OTHER_INVOICE`
   - existing ada & `overwrite_sj_confirmed !== true` → `ConflictError` kode `SJ_EXISTS_NEEDS_CONFIRM`
     (guard belt-and-suspenders; FE normalnya sudah konfirmasi duluan lewat lookup)
   - existing ada & confirmed → `existing.update({ ...header, items, invoice_id, invoice_attachment_status:'attached' })` — **status dipertahankan**
   - tidak ada → `DeliveryOrder.create({ sj_number, ...header, items, status:'draft', invoice_id, invoice_attachment_status:'attached' })`
   - `manual_sj_numbers` multi-token (data lama "SJ-001, SJ-002") → **no-op** (invoice tetap tersimpan).

4. **Validator** (`invoice.validator.js`): tambah ke `createInvoiceSchema` & `updateInvoiceSchema`:
   `auto_create_sj: Joi.boolean().default(true)`, `overwrite_sj_confirmed: Joi.boolean().default(false)`.

### Frontend

1. **Repo SJ**: `ISuratJalanRepository.getBySjNumber(sjNumber)` → `GET /surat-jalan/lookup`; impl di `MockSuratJalanRepository`.
2. **DTO + payload**: `CreateInvoiceDto`/`UpdateInvoiceDto` tambah `auto_create_sj?`, `overwrite_sj_confirmed?`; kirim di `MockInvoiceRepository.create/update`.
3. **Input form**: textarea manual SJ → single-line 1 nomor; validasi tolak koma/>1 nomor (form Buat; Edit toleran data lama).
4. **Modal**: `ConfirmOverwriteSJModal` + `ClearManualSJPrompt`.
5. **Orkestrasi** `CreateInvoicePage` & `EditInvoicePage`: sebelum submit (mode manual, 1 nomor) →
   `getBySjNumber` → cabang guard/konfirmasi → set flag → submit.

### Urutan (Buat)

1. Validasi FE.
2. `getBySjNumber(nomor)`:
   - terkait invoice lain → toast tolak, batal submit.
   - ada (bebas/sama) → `ConfirmOverwriteSJModal` → "Ya" set `overwrite_sj_confirmed=true`; "Batal" → `ClearManualSJPrompt`.
   - tidak ada → lanjut.
3. `dispatch(createInvoice(dto + flags))` → backend buat invoice **+ SJ** dalam satu transaksi.
4. Redirect + toast sukses.

(Untuk Edit: langkah 3 memakai `updateInvoice`; guard "invoice lain" mengabaikan SJ yang
`invoice_id`-nya = invoice yang sedang diedit.)

## Keterkaitan & PDF

- SJ hasil auto-create diset `invoice_id` + `invoice_attachment_status='attached'` di transaksi →
  muncul di `invoice.attached_sj`.
- Modal Cetak PDF (`GeneratePDFModal`) sudah membaca `attached_sj`: opsi
  *"Lampirkan daftar SJ terlampir"* otomatis tersedia + tercentang saat `attached_sj` terisi
  dan service bukan rental. **Tidak perlu perubahan pada logika PDF.**
- `manual_sj_numbers` tetap disimpan sebagai nilai yang diketik.

## Risiko yang Diketahui

- **Atomik**: SJ dibuat/ditimpa di dalam transaksi invoice — kalau gagal, seluruh operasi
  (invoice + SJ) rollback. Guard error dikembalikan dengan kode spesifik agar FE bisa tampilkan pesan.
- **Timpa SJ delivered/void**: diizinkan (hanya konfirmasi). Item/header lama tergantikan
  sementara status dipertahankan — copy konfirmasi harus menegaskan konsekuensi ini.
- **Nomor SJ unik di DB** (`delivery_orders.sj_number` UNIQUE): create dengan nomor duplikat yang
  lolos race → constraint error; ditangani sebagai `ConflictError`.

## Testing / Verifikasi

Tidak ada framework unit test di kedua codebase → verifikasi **manual/integrasi**:

- **Backend hidup + curl**: jalankan backend, uji `create`/`update` invoice dengan `manual_sj_numbers`
  1 nomor untuk tiap cabang (baru → SJ tercreate & attached; nomor ada + confirmed → tertimpa,
  status lama tetap; nomor ada tanpa confirm → 409 `SJ_EXISTS_NEEDS_CONFIRM`; terkait invoice lain →
  409 `SJ_LINKED_OTHER_INVOICE`). Cek `GET /surat-jalan/lookup`.
- **Mapping**: verifikasi item cargo → SJItem lengkap; baris "Pembiayaan Lainnya" tidak ikut; invoice
  tanpa cargo → SJ `items: []`.
- **Frontend**: `npm run build` (typecheck) lolos; uji UI Buat & Edit mode manual: input 1 nomor,
  modal konfirmasi/timpa, popup batal (hapus nomor / kembali), SJ muncul di detail invoice & opsi PDF.
- **Guard Edit**: SJ yang `invoice_id`-nya = invoice yang diedit tidak dianggap "invoice lain".
