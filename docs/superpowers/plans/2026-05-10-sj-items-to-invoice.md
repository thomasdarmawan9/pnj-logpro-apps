# SJ Items Auto-Copy ke Invoice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saat SJ dilampirkan ke Invoice, item-item SJ otomatis disalin ke `invoice_items`. Saat SJ di-detach, item-itemnya otomatis dihapus dan total invoice di-recalculate.

**Architecture:** Tambah kolom `source_sj_id` di `invoice_items` sebagai tracker origin. `attachSJ` service membuat InvoiceItem rows dari SJ items + recalc total. `detachSJ` service menghapus rows dengan `source_sj_id` matching + recalc total.

**Tech Stack:** Node.js/Sequelize (backend), TypeScript/React (frontend), PostgreSQL

---

## File Map

| File | Action | Tanggung Jawab |
|---|---|---|
| `pnj-backend/src/migrations/20260101000028-add-source-sj-id-to-invoice-items.js` | Create | Tambah kolom `source_sj_id` ke tabel `invoice_items` |
| `pnj-backend/src/models/InvoiceItem.js` | Modify | Tambah field `source_sj_id` ke model |
| `pnj-backend/src/services/invoice.service.js` | Modify | Update `attachSJ`, `detachSJ`, tambah `recalcInvoiceTotals` dan `buildSJItemRows` |
| `features/invoice/domain/entities/Invoice.ts` | Modify | Tambah `source_sj_id` ke `InvoiceItem` interface |
| `features/invoice/infrastructure/repositories/MockInvoiceRepository.ts` | Modify | Update `ApiInvoiceItem` type dan `normalizeItem` |
| `lib/mockData/connectedScenario.ts` | Modify | Tambah `source_sj_id: null` ke existing mock items |

---

## Task 1: Migration — Tambah Kolom `source_sj_id`

**Files:**
- Create: `pnj-backend/src/migrations/20260101000028-add-source-sj-id-to-invoice-items.js`

- [ ] **Step 1: Buat file migration**

```js
// pnj-backend/src/migrations/20260101000028-add-source-sj-id-to-invoice-items.js
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('invoice_items', 'source_sj_id', {
      type:       Sequelize.BIGINT,
      allowNull:  true,
      defaultValue: null,
      comment:    'Null = item manual. Non-null = item disalin dari SJ saat attach.',
      references: { model: 'delivery_orders', key: 'id' },
      onDelete:   'SET NULL',
    })
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('invoice_items', 'source_sj_id')
  },
}
```

- [ ] **Step 2: Jalankan migration**

```bash
cd pnj-backend && npm run db:migrate
```

Expected output:
```
== 20260101000028-add-source-sj-id-to-invoice-items: migrating =======
== 20260101000028-add-source-sj-id-to-invoice-items: migrated (0.Xs)
```

- [ ] **Step 3: Commit**

```bash
git add pnj-backend/src/migrations/20260101000028-add-source-sj-id-to-invoice-items.js
git commit -m "feat: add source_sj_id column to invoice_items"
```

---

## Task 2: Model — Update InvoiceItem

**Files:**
- Modify: `pnj-backend/src/models/InvoiceItem.js`

- [ ] **Step 1: Tambah field `source_sj_id` ke model**

Di `pnj-backend/src/models/InvoiceItem.js`, tambahkan field berikut setelah field `sort_order`:

```js
    sort_order: {
      type:         DataTypes.SMALLINT,
      defaultValue: 0,
    },
    source_sj_id: {
      type:      DataTypes.BIGINT,
      allowNull: true,
      comment:   'Null = item manual. Non-null = item disalin dari SJ saat attach.',
    },
```

- [ ] **Step 2: Verifikasi syntax**

```bash
cd pnj-backend && node --check src/models/InvoiceItem.js && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add pnj-backend/src/models/InvoiceItem.js
git commit -m "feat: add source_sj_id field to InvoiceItem model"
```

---

## Task 3: Backend Service — Helper Functions

**Files:**
- Modify: `pnj-backend/src/services/invoice.service.js`

- [ ] **Step 1: Tambah `buildSJItemRows` setelah fungsi `buildItemRows` (baris ~198)**

```js
/**
 * Buat InvoiceItem rows dari items milik satu SJ.
 * period_start dan period_end sengaja dikosongkan (null).
 * source_sj_id diisi dengan sj.id untuk tracking saat detach.
 *
 * @param {object} sj         — DeliveryOrder instance (include fleet)
 * @param {number} invoiceId  — Invoice.id
 * @param {number} startOrder — sort_order awal (existing item count)
 * @returns {object[]}        — array rows siap InvoiceItem.bulkCreate
 */
function buildSJItemRows(sj, invoiceId, startOrder) {
  const items = Array.isArray(sj.items) ? sj.items : []
  if (items.length === 0) return []

  const fleetIsTbd = !sj.fleet || sj.fleet.is_tbd
  const fleetLabel = fleetIsTbd
    ? 'TBD'
    : `${sj.fleet.name} (${sj.fleet.plate_number})`

  return items.map((item, i) => {
    const qty       = Number(item.qty)       || 1
    const unitPrice = Number(item.unit_price) || 0
    return {
      invoice_id:   invoiceId,
      fleet_id:     fleetIsTbd ? null : sj.fleet_id,
      fleet_label:  fleetLabel,
      description:  item.description || null,
      period_start: null,
      period_end:   null,
      qty,
      unit:         item.unit || 'Unit',
      unit_price:   unitPrice,
      subtotal:     round2(qty * unitPrice),
      sort_order:   startOrder + i,
      source_sj_id: sj.id,
    }
  })
}

/**
 * Recalculate subtotal_amount, tax_amount, pph_amount, total_amount invoice
 * berdasarkan semua invoice_items yang ada saat ini.
 * Dipanggil setelah attach/detach SJ.
 */
async function recalcInvoiceTotals(invoice, t) {
  const items = await InvoiceItem.findAll({
    where:      { invoice_id: invoice.id },
    attributes: ['qty', 'unit_price'],
    transaction: t,
  })
  const plain = items.map(i => ({ qty: i.qty, unit_price: i.unit_price }))
  const totals = calcTotals(plain, invoice.tax_percent, invoice.pph_percent)
  await invoice.update(totals, { transaction: t })
}
```

- [ ] **Step 2: Verifikasi syntax**

```bash
cd pnj-backend && node --check src/services/invoice.service.js && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add pnj-backend/src/services/invoice.service.js
git commit -m "feat: add buildSJItemRows and recalcInvoiceTotals helpers"
```

---

## Task 4: Backend Service — Update `attachSJ`

**Files:**
- Modify: `pnj-backend/src/services/invoice.service.js`

- [ ] **Step 1: Ganti fungsi `attachSJ` seluruhnya**

Ganti fungsi `attachSJ` (mulai baris `async function attachSJ(invoiceUuid, sjUuids, actor)`) dengan:

```js
async function attachSJ(invoiceUuid, sjUuids, actor) {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({ where: { uuid: invoiceUuid }, transaction: t })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
    if (FINAL_STATUSES.includes(invoice.status)) {
      throw new ForbiddenError(`Invoice status ${invoice.status} tidak dapat diubah attachment-nya.`)
    }

    // Fetch SJ dengan Fleet untuk fleet_label
    const sjList = await DeliveryOrder.findAll({
      where:   { uuid: sjUuids },
      include: [{ model: Fleet, as: 'fleet', attributes: ['id', 'uuid', 'name', 'plate_number', 'is_tbd'], required: false }],
      transaction: t,
    })

    if (sjList.length !== sjUuids.length) {
      const found   = new Set(sjList.map(sj => sj.uuid))
      const missing = sjUuids.filter(u => !found.has(u))
      throw new NotFoundError(`SJ tidak ditemukan: ${missing.join(', ')}`)
    }

    for (const sj of sjList) {
      if (sj.project_id !== invoice.project_id) {
        throw new BadRequestError(`SJ ${sj.sj_number} bukan dari project yang sama dengan invoice.`)
      }
      if (sj.status !== 'delivered') {
        throw new BadRequestError(`SJ ${sj.sj_number} status ${sj.status} — hanya SJ delivered yang bisa di-attach.`)
      }
      if (sj.invoice_id && sj.invoice_id !== invoice.id) {
        throw new ConflictError(`SJ ${sj.sj_number} sudah ter-attach ke invoice lain.`)
      }
    }

    // Update delivery_orders
    await DeliveryOrder.update({
      invoice_id:                invoice.id,
      invoice_attachment_status: 'attached',
    }, {
      where:       { id: sjList.map(sj => sj.id) },
      transaction: t,
    })

    // Salin items dari SJ ke invoice_items
    const existingCount = await InvoiceItem.count({ where: { invoice_id: invoice.id }, transaction: t })
    let globalIndex = existingCount

    const allNewRows = []
    for (const sj of sjList) {
      const rows = buildSJItemRows(sj, invoice.id, globalIndex)
      allNewRows.push(...rows)
      globalIndex += rows.length
    }

    if (allNewRows.length > 0) {
      await InvoiceItem.bulkCreate(allNewRows, { transaction: t })
      await recalcInvoiceTotals(invoice, t)
    }

    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}
```

- [ ] **Step 2: Verifikasi syntax**

```bash
cd pnj-backend && node --check src/services/invoice.service.js && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add pnj-backend/src/services/invoice.service.js
git commit -m "feat: attachSJ now copies SJ items to invoice_items and recalcs totals"
```

---

## Task 5: Backend Service — Update `detachSJ`

**Files:**
- Modify: `pnj-backend/src/services/invoice.service.js`

- [ ] **Step 1: Ganti fungsi `detachSJ` seluruhnya**

Ganti fungsi `detachSJ` (mulai `async function detachSJ(invoiceUuid, sjUuid, actor)`) dengan:

```js
async function detachSJ(invoiceUuid, sjUuid, actor) {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findOne({ where: { uuid: invoiceUuid }, transaction: t })
    if (!invoice) throw new NotFoundError('Invoice tidak ditemukan.')
    if (FINAL_STATUSES.includes(invoice.status)) {
      throw new ForbiddenError(`Invoice status ${invoice.status} tidak dapat diubah attachment-nya.`)
    }

    const sj = await DeliveryOrder.findOne({ where: { uuid: sjUuid }, transaction: t })
    if (!sj)                           throw new NotFoundError('Surat Jalan tidak ditemukan.')
    if (sj.invoice_id !== invoice.id)  throw new BadRequestError('SJ ini tidak ter-attach ke invoice tersebut.')

    // Hapus items yang berasal dari SJ ini
    const deletedCount = await InvoiceItem.destroy({
      where:       { invoice_id: invoice.id, source_sj_id: sj.id },
      transaction: t,
    })

    // Recalc total hanya kalau ada item yang dihapus
    if (deletedCount > 0) {
      await recalcInvoiceTotals(invoice, t)
    }

    await sj.update({
      invoice_id:                null,
      invoice_attachment_status: 'no_invoice',
    }, { transaction: t })

    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
  })
}
```

- [ ] **Step 2: Verifikasi syntax**

```bash
cd pnj-backend && node --check src/services/invoice.service.js && echo "OK"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add pnj-backend/src/services/invoice.service.js
git commit -m "feat: detachSJ removes SJ-sourced items from invoice and recalcs totals"
```

---

## Task 6: Frontend — Update InvoiceItem Entity

**Files:**
- Modify: `features/invoice/domain/entities/Invoice.ts`

- [ ] **Step 1: Tambah `source_sj_id` ke interface `InvoiceItem`**

Di `features/invoice/domain/entities/Invoice.ts`, update interface `InvoiceItem`:

```ts
export interface InvoiceItem {
  id?: number
  uuid: string
  invoice_id?: number
  fleet_id?: number | null
  fleet?: {
    id: number
    name: string
    plate_number: string
  } | null
  fleet_label: string
  description: string | null
  period_start: string | null
  period_end: string | null
  qty: number
  unit: string
  unit_price: number
  subtotal: number
  sort_order: number
  source_sj_id: number | null
}
```

- [ ] **Step 2: Commit**

```bash
git add features/invoice/domain/entities/Invoice.ts
git commit -m "feat: add source_sj_id to InvoiceItem entity"
```

---

## Task 7: Frontend — Update MockInvoiceRepository

**Files:**
- Modify: `features/invoice/infrastructure/repositories/MockInvoiceRepository.ts`

- [ ] **Step 1: Update `ApiInvoiceItem` type — tambah `source_sj_id`**

Ganti definisi `type ApiInvoiceItem`:

```ts
type ApiInvoiceItem = Omit<InvoiceItem, 'id' | 'invoice_id' | 'fleet_id' | 'qty' | 'unit_price' | 'subtotal' | 'sort_order' | 'source_sj_id'> & {
  id?: ApiId
  invoice_id?: ApiId
  fleet_id?: ApiId
  qty: number | string
  unit_price: number | string
  subtotal: number | string
  sort_order: number | string
  source_sj_id?: ApiId
}
```

- [ ] **Step 2: Update fungsi `normalizeItem` — handle `source_sj_id`**

Ganti fungsi `normalizeItem`:

```ts
function normalizeItem(item: ApiInvoiceItem): InvoiceItem {
  return {
    ...item,
    id: toNumber(item.id),
    invoice_id: toNumber(item.invoice_id),
    fleet_id: toNullableNumber(item.fleet_id),
    fleet: item.fleet ? { ...item.fleet, id: toNumber(item.fleet.id) } : null,
    qty: Number(item.qty || 0),
    unit_price: Number(item.unit_price || 0),
    subtotal: Number(item.subtotal || 0),
    sort_order: Number(item.sort_order || 0),
    source_sj_id: toNullableNumber(item.source_sj_id),
  }
}
```

- [ ] **Step 3: Verifikasi TypeScript tidak error**

```bash
cd /Users/thomasdarmawan/Documents/github/logproapp && npx tsc --noEmit 2>&1 | grep "Invoice\|source_sj" | head -20
```

Expected: tidak ada error terkait `source_sj_id` atau `InvoiceItem`.

- [ ] **Step 4: Commit**

```bash
git add features/invoice/infrastructure/repositories/MockInvoiceRepository.ts
git commit -m "feat: update MockInvoiceRepository to handle source_sj_id"
```

---

## Task 8: Mock Data — Update connectedScenario

**Files:**
- Modify: `lib/mockData/connectedScenario.ts`

- [ ] **Step 1: Tambah `source_sj_id: null` ke existing mock items**

Di `lib/mockData/connectedScenario.ts`, update dua item di `SCENARIO_INVOICE` (keduanya item manual, bukan dari SJ):

```ts
  items: [
    {
      id: 1,
      uuid: 'item-001',
      invoice_id: 1,
      fleet_id: 1,
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
      source_sj_id: null,
    },
    {
      id: 2,
      uuid: 'item-002',
      invoice_id: 1,
      fleet_id: 2,
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
      source_sj_id: null,
    },
  ],
```

- [ ] **Step 2: Verifikasi TypeScript tidak error**

```bash
cd /Users/thomasdarmawan/Documents/github/logproapp && npx tsc --noEmit 2>&1 | grep "connectedScenario\|source_sj" | head -10
```

Expected: tidak ada error.

- [ ] **Step 3: Commit**

```bash
git add lib/mockData/connectedScenario.ts
git commit -m "chore: add source_sj_id null to existing mock invoice items"
```

---

## Task 9: Verifikasi End-to-End

- [ ] **Step 1: Jalankan backend**

```bash
cd pnj-backend && npm run dev
```

Pastikan server start tanpa error Sequelize tentang kolom `source_sj_id`.

- [ ] **Step 2: Jalankan PDF worker (terminal terpisah)**

```bash
cd pnj-backend && npm run worker:pdf:dev
```

- [ ] **Step 3: Jalankan frontend**

```bash
cd /Users/thomasdarmawan/Documents/github/logproapp && pnpm dev
```

- [ ] **Step 4: Test attach SJ**

1. Buka Invoice yang punya SJ deliverable di proyek yang sama
2. Klik "Lampirkan SJ"
3. Pilih SJ yang punya `items` (rincian muatan) dan konfirmasi
4. Verifikasi: item-item SJ muncul di tabel rincian invoice
5. Verifikasi: total invoice ter-update sesuai subtotal items baru

- [ ] **Step 5: Test detach SJ**

1. Di invoice yang sama, detach SJ yang barusan dilampirkan
2. Verifikasi: item-item dari SJ tersebut hilang dari invoice
3. Verifikasi: total invoice kembali ke nilai semula

- [ ] **Step 6: Test SJ tanpa items**

1. Lampirkan SJ yang `items = null` (belum ada rincian muatan)
2. Verifikasi: tidak ada item baru di invoice (tidak crash)
3. Verifikasi: total invoice tidak berubah

---

## Self-Review Checklist

- [x] Migration + Model konsisten (nama kolom `source_sj_id` sama di semua file)
- [x] `buildSJItemRows` dipanggil dengan `sj` yang sudah include `fleet` — `attachSJ` fetch dengan `include: [Fleet]`
- [x] `recalcInvoiceTotals` dipanggil setelah bulkCreate (attach) dan setelah destroy (detach)
- [x] Detach hanya hapus items dengan `source_sj_id = sj.id` — item manual (`source_sj_id = null`) tidak tersentuh
- [x] `FINAL_STATUSES` guard existing tetap di-preserve di kedua fungsi
- [x] Mock data `connectedScenario.ts` ter-update sehingga TypeScript tidak error
- [x] `normalizeItem` handle `source_sj_id` nullable
