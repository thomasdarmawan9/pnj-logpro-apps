# Design: Auto-Copy SJ Items ke Invoice saat Lampirkan SJ

**Tanggal:** 2026-05-10
**Status:** Approved

---

## Ringkasan

Saat Surat Jalan (SJ) dilampirkan ke Invoice, rincian item SJ (`delivery_orders.items`) otomatis disalin ke `invoice_items`. Saat SJ dilepas (detach), item-item tersebut otomatis dihapus dan total invoice di-recalculate.

---

## Keputusan Desain

| Keputusan | Pilihan |
|---|---|
| Tracking origin item | `source_sj_id` di `invoice_items` |
| Perilaku detach | Hapus otomatis item dari SJ tersebut |
| Perilaku append | Item SJ ditambahkan setelah item yang sudah ada |
| Kolom periode | `period_start` dan `period_end` = NULL |

---

## Section 1: Database & Model

### Migration baru
File: `pnj-backend/src/migrations/20260101000028-add-source-sj-id-to-invoice-items.js`

```sql
ALTER TABLE invoice_items ADD COLUMN source_sj_id BIGINT NULL REFERENCES delivery_orders(id) ON DELETE SET NULL;
```

### InvoiceItem model update
File: `pnj-backend/src/models/InvoiceItem.js`

Tambah field:
```js
source_sj_id: {
  type:      DataTypes.BIGINT,
  allowNull: true,
  comment:   'Null = item manual. Non-null = item disalin dari SJ saat attach.',
}
```

### Semantik
- `source_sj_id = NULL` → item dibuat manual oleh user
- `source_sj_id = sj.id` → item disalin dari SJ saat attach
- Saat detach SJ: `DELETE WHERE invoice_id = ? AND source_sj_id = sj.id`

---

## Section 2: Backend Logic

### File: `pnj-backend/src/services/invoice.service.js`

#### `attachSJ(invoiceUuid, sjUuids, actor)`

Setelah existing logic (validate + update `delivery_orders`), tambahkan:

1. Fetch ulang SJ list dengan include `Fleet` (butuh `fleet.name` dan `fleet.plate_number`)
2. Hitung `existingCount` = jumlah `invoice_items` yang sudah ada untuk invoice ini
3. Untuk setiap SJ yang punya `sj.items` (non-null, non-empty array):

**Mapping SJ item → InvoiceItem:**

| InvoiceItem field | Sumber |
|---|---|
| `invoice_id` | `invoice.id` |
| `fleet_id` | `sj.fleet_id` |
| `fleet_label` | `"${fleet.name} (${fleet.plate_number})"` atau `"TBD"` jika `fleet.is_tbd` |
| `description` | `sjItem.description` |
| `period_start` | `null` |
| `period_end` | `null` |
| `qty` | `sjItem.qty` |
| `unit` | `sjItem.unit` |
| `unit_price` | `sjItem.unit_price` |
| `subtotal` | `round2(qty × unit_price)` |
| `source_sj_id` | `sj.id` |
| `sort_order` | `existingCount + globalIndex` |

4. `InvoiceItem.bulkCreate(allNewRows, { transaction: t })`
5. Recalculate totals invoice:
   - Fetch semua items invoice (existing + baru)
   - `calcTotals(allItems, invoice.tax_percent, invoice.pph_percent)`
   - `invoice.update({ subtotal_amount, tax_amount, pph_amount, total_amount })`

**Edge cases:**
- SJ tidak punya items (`sj.items = null || []`) → skip, tidak ada item dibuat
- Invoice status `paid/void` → sudah diblock guard existing
- Attach ulang SJ yang sama → diblock oleh `sj.invoice_id` check existing

#### `detachSJ(invoiceUuid, sjUuid, actor)`

Sebelum update `delivery_orders`, tambahkan:

1. `InvoiceItem.destroy({ where: { invoice_id: invoice.id, source_sj_id: sj.id }, transaction: t })`
2. Fetch semua items yang tersisa untuk invoice
3. Recalculate totals → `invoice.update({ subtotal_amount, tax_amount, pph_amount, total_amount })`
4. Lanjutkan existing logic (clear `invoice_id` di `delivery_orders`)

#### Helper `recalcInvoiceTotals(invoice, t)`

Ekstrak recalc logic ke helper agar tidak duplikasi antara `attachSJ` dan `detachSJ`:

```js
async function recalcInvoiceTotals(invoice, t) {
  const items = await InvoiceItem.findAll({ where: { invoice_id: invoice.id }, transaction: t })
  const plain = items.map(i => i.get({ plain: true }))
  const totals = calcTotals(plain, invoice.tax_percent, invoice.pph_percent)
  await invoice.update(totals, { transaction: t })
}
```

---

## Section 3: Frontend

### `MockInvoiceRepository.ts` — `normalizeItem`

Tambah `source_sj_id` ke type `ApiInvoiceItem` dan `normalizeItem`:

```ts
source_sj_id: toNullableNumber(item.source_sj_id),
```

### Invoice item entity

Update `InvoiceItem` interface di `Invoice.ts`:

```ts
source_sj_id: number | null
```

### Tampilan item di invoice (opsional, low priority)

Di komponen yang menampilkan daftar invoice items (misal `InvoiceTaxCalculator` atau detail invoice), item dengan `source_sj_id != null` bisa ditampilkan dengan badge kecil "SJ" untuk membedakan dari item manual.

---

## Files yang Diubah

### Backend
| File | Perubahan |
|---|---|
| `src/migrations/20260101000028-add-source-sj-id-to-invoice-items.js` | **Baru** — tambah kolom |
| `src/models/InvoiceItem.js` | Tambah field `source_sj_id` |
| `src/services/invoice.service.js` | Update `attachSJ`, `detachSJ`, tambah `recalcInvoiceTotals` |

### Frontend
| File | Perubahan |
|---|---|
| `features/invoice/domain/entities/Invoice.ts` | Tambah `source_sj_id` ke `InvoiceItem` interface |
| `features/invoice/infrastructure/repositories/MockInvoiceRepository.ts` | Update `normalizeItem` |

---

## Yang Tidak Berubah

- `AttachSJModal.tsx` — tidak perlu perubahan
- `getAttachableSJ` — tidak perlu perubahan
- `attachSJSchema` validator — tidak perlu perubahan
- Logic PDF, report, aging AR — tidak terpengaruh
