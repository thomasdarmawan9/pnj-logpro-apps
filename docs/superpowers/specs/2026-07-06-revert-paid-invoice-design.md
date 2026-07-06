# Batalkan Status Lunas (Revert Paid Invoice) — Design

**Tanggal:** 2026-07-06
**Modul:** Invoice (`features/invoice` + `pnj-backend`)
**Status:** Design — menunggu review

## 1. Latar Belakang & Tujuan

Saat ini status `paid` (lunas) bersifat **terminal**: `ALLOWED_TRANSITIONS[PAID] = []`,
`paid` masuk `FINAL_STATUSES`, dan `recordPayment` menolak invoice paid. Invoice lunas
hanya bisa edit DP/uang muka + tanggal invoice, tidak bisa ubah item/pajak/status.

Kebutuhan: invoice yang sudah lunas bisa **dibuka kembali** — statusnya dikembalikan
jadi belum-lunas (`paid → terbit`) sehingga isi invoice (item, pajak, tanggal, DP,
metode bayar) bisa diedit lagi lewat alur edit "terbit" yang sudah ada.

## 2. Pendekatan

**Reversible status, lalu pakai alur edit yang sudah ada.** Tambah satu aksi
"Batalkan Status Lunas" yang men-transisi `paid → terbit (sent)`. Setelah jadi
`terbit`, seluruh kemampuan edit yang sudah ada otomatis berlaku (mode "Edit Invoice
Terbit": item, PPN/PPh/asuransi, tanggal, DP, metode bayar). Tidak ada mode edit baru.

Target `terbit` dipilih karena hanya status `terbit` yang mengizinkan edit item;
kalau ke `outstanding`, edit hanya DP.

**Alternatif ditolak:**
- Unlock penuh halaman edit langsung di status `paid` — menduplikasi logika draft,
  lebih kompleks, tidak memodelkan perubahan status.
- Revert ke `outstanding` — tidak bisa edit item, tidak memenuhi "edit informasi lainnya".

## 3. Perilaku Revert

Saat "Batalkan Status Lunas" pada invoice `paid`:

1. Hapus **semua Payment reguler** (non-DP).
2. **DP dipertahankan** (Payment `is_down_payment = true` tidak dihapus).
3. `paid_amount` dihitung ulang = nominal DP (0 jika tak ada DP).
4. Status `paid → sent`. `sent_at` tetap seperti semula.
5. Alasan revert dicatat ke audit trail.

### Edge cases
- **Tanpa DP:** `paid_amount → 0`, status `sent`.
- **DP == total:** `paid_amount` tetap == total, status `sent` (tampak lunas via DP
  tapi sudah editable). Diterima — sesuai keputusan "pertahankan DP".
- **Setelah revert lalu edit item** sehingga total baru < `paid_amount` (DP): sudah
  ditangani guard `TOTAL_BELOW_PAID` yang ada di `update()`.
- **Konkuren:** dilakukan dalam transaksi dengan row lock (`t.LOCK.UPDATE`).

## 4. Komponen

### Backend (`pnj-backend`)
- `ALLOWED_TRANSITIONS[PAID]` → tambah `STATUS.SENT`.
- Fungsi baru `revertToUnpaid(uuid, { reason }, actor)` di `invoice.service.js`:
  transaksi + lock → pastikan `status === paid` (else `ConflictError`) → hapus
  Payment reguler → recompute `paid_amount` dari sisa payment (DP) → `invoice.update({ status: sent, paid_amount })` → return `decorate(fresh)`.
- Route `PATCH /invoices/:uuid/revert-payment` di `invoices.routes.js`:
  `isAnyRole` (kedua peran diizinkan) → `validate(revertPaymentSchema)` →
  `logActivity('revert_invoice_payment', 'invoice')` → `controller.revertPayment`.
- Validator `revertPaymentSchema`: `{ reason: Joi.string().trim().min(3).max(500).required() }`.
- Controller `revertPayment` di `invoices.controller.js`.

### Frontend (`features/invoice`)
- Redux thunk `revertInvoicePayment({ uuid, reason })` di `invoiceSlice.ts` →
  `MockInvoiceRepository.revertPayment(uuid, reason)` (PATCH). Update store.
- Modal `RevertPaymentModal.tsx` (pola sama `VoidInvoiceModal`): peringatan bahwa
  pembayaran reguler akan dihapus & DP dipertahankan, input alasan wajib.
- Detail page (`DetailInvoicePage.tsx`): pada `status === paid` dan role
  `super_admin`/`admin_finance`, tampilkan tombol **"Batalkan Status Lunas"** →
  buka modal → sukses: invoice jadi `terbit`, tombol **"Edit Invoice"** yang sudah
  ada tersedia untuk edit isi.
- List row menu (`InvoiceTableRow.tsx`): item "Batalkan Status Lunas" untuk paid
  (kedua peran) — konsistensi entry point (sama seperti pola void).

## 5. Hak Akses
`super_admin` dan `admin_finance` boleh melakukan revert.

**Dependensi penting:** setelah revert, invoice jadi `terbit`. Tombol/menu "Edit
Invoice" untuk status non-draft saat ini **hanya muncul untuk `super_admin`**
(`canEditDownPayment` di `DetailInvoicePage.tsx` dan syarat `role === 'super_admin'`
di row menu). Agar `admin_finance` yang me-revert juga bisa lanjut mengedit isinya,
entry "Edit Invoice" untuk status `terbit` akan diperluas supaya terlihat oleh
`admin_finance` juga. Halaman edit sendiri (`EditInvoicePage`) memang sudah
mengizinkan kedua peran; perubahan ini hanya menampilkan tombol yang selama ini
sebenarnya sudah bisa diakses via URL. (Cakupan diperluas hanya untuk status
`terbit`, bukan mengubah gating DP di outstanding/paid.)

## 6. Audit
Aksi tercatat via `logActivity('revert_invoice_payment', 'invoice')` beserta `reason`.

## 7. Yang TIDAK termasuk (YAGNI)
- Tidak menghapus DP.
- Tidak menyediakan revert `paid → outstanding`/`draft` (hanya ke `terbit`).
- Tidak mengubah aturan edit status lain.
- Tidak ada perubahan pada laporan (Aging/P&L) selain efek alami dari status &
  `paid_amount` yang berubah.
