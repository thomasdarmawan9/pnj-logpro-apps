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

## Arsitektur (Clean Architecture, tetap Mock repository)

Aplikasi masih memakai `MockInvoiceRepository` & `MockSuratJalanRepository`.

### Perubahan

1. **Repo — cari SJ by nomor**
   - `ISuratJalanRepository.getBySjNumber(sjNumber: string): Promise<SuratJalan | null>`
   - Implementasi di `MockSuratJalanRepository` (case-insensitive, trim).

2. **Use-case baru**
   - `features/invoice/application/use-cases/SyncManualSJForInvoice.ts`
   - Input: invoice tersimpan (`id`, `uuid`, `invoice_number`, header, items) + `sjNumber` + `existing`.
   - Bangun `CreateSJDto` / `UpdateSJDto` dari mapping di atas.
   - Panggil `suratJalanRepository.create` **atau** `update`, lalu `attachToInvoice(sjUuid, invoiceId, invoiceUuid, invoiceNumber)`.

3. **Thunk**
   - `suratJalanSlice`: `syncManualSjForInvoice({ invoice, sjNumber, existing })`.

4. **Modal baru** (folder `features/invoice/presentation/components/modals/`)
   - `ConfirmOverwriteSJModal` — konfirmasi timpa SJ yang sudah ada.
   - `ClearManualSJPrompt` — popup kedua saat user batal timpa.

5. **Orkestrasi halaman**
   - `CreateInvoicePage` & `EditInvoicePage`: pada submit mode manual →
     cek `getBySjNumber` → cabang guard/konfirmasi → simpan invoice → `syncManualSjForInvoice`.

6. **Input form**
   - Ubah textarea manual SJ → **single-line input 1 nomor**; validasi menolak koma / >1 nomor
     (di form Buat; form Edit toleran terhadap data lama multi-nomor, lihat di atas).

### Urutan operasi (Buat)

1. Validasi invoice.
2. `getBySjNumber(nomor)` → tentukan cabang (guard / konfirmasi / lanjut).
3. `dispatch(createInvoice(dto))` → dapatkan `{ id, uuid, invoice_number }`.
4. `dispatch(syncManualSjForInvoice({ invoice, sjNumber, existing }))` → create/overwrite + attach.
5. Redirect + toast sukses.

(Untuk Edit: langkah 3 memakai `updateInvoice`; guard "invoice lain" mengabaikan SJ yang
`invoice_id`-nya = invoice yang sedang diedit.)

## Keterkaitan & PDF

- SJ hasil auto-create ditautkan via `attachToInvoice` → muncul di `invoice.attached_sj`.
- Modal Cetak PDF (`GeneratePDFModal`) sudah membaca `attached_sj`: opsi
  *"Lampirkan daftar SJ terlampir"* otomatis tersedia + tercentang saat `attached_sj` terisi
  dan service bukan rental. Tidak perlu perubahan pada logika PDF.
- `manual_sj_numbers` tetap disimpan sebagai nilai yang diketik.

## Risiko yang Diketahui

- **Non-atomik**: invoice disimpan lebih dulu, lalu SJ. Kalau langkah SJ gagal, invoice sudah
  tersimpan. Wajar di tahap mock; idealnya kelak jadi transaksi tunggal di backend.
- **Timpa SJ delivered/void**: diizinkan (hanya konfirmasi). Item/header lama tergantikan
  sementara status dipertahankan — pastikan copy konfirmasi menegaskan konsekuensi ini.

## Testing

- Mapping item: item cargo → SJItem (semua field), baris "Pembiayaan Lainnya" dikecualikan,
  fallback description, invoice tanpa cargo → `items: []`.
- Cabang alur: nomor tidak ada → create; nomor ada (bebas) → konfirmasi → timpa; nomor ada &
  terkait invoice lain → blokir; batal timpa → clear prompt (hapus/kembali).
- Guard Edit: SJ yang `invoice_id`-nya = invoice yang diedit tidak dianggap "invoice lain".
- Linkage: setelah sync, SJ ada di `attached_sj`; opsi PDF SJ tersedia.
- Validasi input: koma / >1 nomor ditolak di form Buat.
