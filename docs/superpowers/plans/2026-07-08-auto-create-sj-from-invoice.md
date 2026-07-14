# Auto-Create Surat Jalan dari Invoice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saat submit invoice delivery mode-manual dengan 1 nomor SJ, backend otomatis membuat (atau menimpa) record Surat Jalan yang item-nya di-mapping dari item cargo invoice, lalu menautkannya ke invoice (ikut muncul di detail & PDF).

**Architecture:** Backend-centric. Logika cek-nomor → create/overwrite SJ + tautkan dijalankan **di dalam transaksi** `invoice.service.create()` & `update()` (atomik). Endpoint lookup ringan menyediakan pengecekan nomor untuk konfirmasi di frontend. Frontend: input 1 nomor, panggil lookup sebelum submit, modal konfirmasi/timpa + popup batal, kirim flag.

**Tech Stack:** Backend Node.js + Express + Sequelize (Postgres) di `pnj-backend/`. Frontend Next.js 16 + React 19 + Redux Toolkit + TypeScript. Tidak ada unit-test framework → verifikasi manual/integrasi (server hidup + `npm run build` + UI).

**Spec:** `docs/superpowers/specs/2026-07-08-auto-create-sj-from-invoice-design.md`

---

## File Structure

**Backend (`pnj-backend/`):**
- `src/validators/suratJalan.validator.js` — Modify: tambah `lookupSJQuery` schema.
- `src/services/suratJalan.service.js` — Modify: tambah `lookupByNumber()`, export.
- `src/controllers/suratJalan.controller.js` — Modify: tambah `lookup` handler, export.
- `src/routes/suratJalan.routes.js` — Modify: tambah route `GET /lookup`.
- `src/validators/invoice.validator.js` — Modify: tambah `auto_create_sj` + `overwrite_sj_confirmed` ke create & update schema.
- `src/services/invoice.service.js` — Modify: tambah `buildSJItemsFromInvoiceItems()`, `deriveSJHeaderFromInvoice()`, `syncManualSj()`; panggil di `create()` & `update()`.

**Frontend:**
- `features/surat-jalan/infrastructure/repositories/ISuratJalanRepository.ts` — Modify: tambah tipe `SjLookupResult` + method `getBySjNumber`.
- `features/surat-jalan/infrastructure/repositories/MockSuratJalanRepository.ts` — Modify: implement `getBySjNumber`.
- `features/invoice/application/dto/CreateInvoiceDto.ts` — Modify: tambah 2 flag.
- `features/invoice/application/dto/UpdateInvoiceDto.ts` — Modify: tambah 2 flag.
- `features/invoice/infrastructure/repositories/MockInvoiceRepository.ts` — Modify: kirim 2 flag di create & update.
- `features/invoice/presentation/components/modals/ConfirmOverwriteSJModal.tsx` — Create.
- `features/invoice/presentation/components/modals/ClearManualSJPrompt.tsx` — Create.
- `features/invoice/presentation/pages/CreateInvoicePage.tsx` — Modify: input 1 nomor + gate submit.
- `features/invoice/presentation/pages/EditInvoicePage.tsx` — Modify: gate submit.

---

## Task 1: Backend — Endpoint lookup SJ by nomor

**Files:**
- Modify: `pnj-backend/src/validators/suratJalan.validator.js`
- Modify: `pnj-backend/src/services/suratJalan.service.js`
- Modify: `pnj-backend/src/controllers/suratJalan.controller.js`
- Modify: `pnj-backend/src/routes/suratJalan.routes.js`

- [ ] **Step 1: Tambah schema query lookup**

Di `src/validators/suratJalan.validator.js`, tambahkan schema baru (letakkan sebelum `module.exports`), dan ekspor di objek `module.exports`:

```js
const lookupSJQuery = Joi.object({
  sj_number: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'sj_number wajib diisi.',
    'string.empty': 'sj_number wajib diisi.',
  }),
})
```

Tambahkan `lookupSJQuery,` ke dalam `module.exports = { ... }`.

- [ ] **Step 2: Tambah service `lookupByNumber`**

Di `src/services/suratJalan.service.js`, tambahkan fungsi ini (dekat `getByUuid`), lalu tambahkan `lookupByNumber` ke `module.exports`:

```js
/**
 * Lookup ringan SJ berdasarkan nomor persis (untuk konfirmasi auto-create dari
 * invoice). Hanya kembalikan field yang dibutuhkan FE untuk memutuskan cabang.
 */
async function lookupByNumber(sjNumber) {
  const number = String(sjNumber || '').trim()
  if (!number) return { exists: false, sj: null }

  const sj = await DeliveryOrder.findOne({
    where:      { sj_number: number },
    attributes: ['uuid', 'sj_number', 'status', 'invoice_id'],
    include:    [{ model: Invoice, as: 'invoice', attributes: ['invoice_number'] }],
  })
  if (!sj) return { exists: false, sj: null }

  return {
    exists: true,
    sj: {
      uuid:           sj.uuid,
      sj_number:      sj.sj_number,
      status:         sj.status,
      invoice_id:     sj.invoice_id ? Number(sj.invoice_id) : null,
      invoice_number: sj.invoice ? sj.invoice.invoice_number : null,
    },
  }
}
```

Verifikasi nama asosiasi `Invoice as 'invoice'` benar: jalankan
`grep -n "DeliveryOrder.belongsTo\|as: 'invoice'" pnj-backend/src/models/index.js`.
Kalau alias berbeda, sesuaikan `as` di `include`. Kalau tak ada asosiasi, ganti include dengan query terpisah:
`const inv = sj.invoice_id ? await Invoice.findByPk(sj.invoice_id, { attributes: ['invoice_number'] }) : null` dan pakai `inv?.invoice_number ?? null`.

- [ ] **Step 3: Tambah controller `lookup`**

Di `src/controllers/suratJalan.controller.js`, tambahkan handler (dekat `getOne`) dan ekspor di `module.exports`:

```js
const lookup = asyncHandler(async (req, res) => {
  const data = await service.lookupByNumber(req.query.sj_number)
  res.json(success(data))
})
```

- [ ] **Step 4: Daftarkan route `GET /lookup`**

Di `src/routes/suratJalan.routes.js`, import `lookupSJQuery` dari validator dan tambahkan route **sebelum** route `GET /:uuid` (supaya `lookup` tidak tertangkap sebagai `:uuid`):

```js
router.get('/lookup',
  isAnyRole,
  validate(lookupSJQuery, 'query'),
  controller.lookup,
)
```

Tambahkan `lookupSJQuery` ke daftar destructuring `require('../validators/suratJalan.validator')` di atas file.

- [ ] **Step 5: Verifikasi server boot + route**

Run: `cd pnj-backend && node -e "require('./src/routes/suratJalan.routes'); console.log('routes OK')"`
Expected: mencetak `routes OK` tanpa error (syntax & require valid).

- [ ] **Step 6: Verifikasi endpoint hidup (butuh backend jalan + token)**

Jalankan backend (`cd pnj-backend && npm run dev`). Ambil token via login, lalu:
```bash
TOKEN=... # access token dari login
curl -s "http://localhost:4000/api/surat-jalan/lookup?sj_number=SJ-YG-ADA" -H "Authorization: Bearer $TOKEN"
```
Expected: `{"success":true,"data":{"exists":true,"sj":{...invoice_id...}}}` untuk nomor yang ada; `exists:false` untuk yang tidak ada. (Sesuaikan port/base-path dengan `.env` backend bila berbeda.)

- [ ] **Step 7: Commit**

```bash
git add pnj-backend/src/validators/suratJalan.validator.js pnj-backend/src/services/suratJalan.service.js pnj-backend/src/controllers/suratJalan.controller.js pnj-backend/src/routes/suratJalan.routes.js
git commit -m "feat(sj-backend): endpoint lookup SJ by nomor untuk konfirmasi auto-create"
```

---

## Task 2: Backend — Orkestrasi auto-create/overwrite SJ di transaksi invoice

**Files:**
- Modify: `pnj-backend/src/validators/invoice.validator.js`
- Modify: `pnj-backend/src/services/invoice.service.js:835-923` (create), `:1152` (update)

- [ ] **Step 1: Tambah flag ke validator invoice**

Di `src/validators/invoice.validator.js`, tambahkan dua field ini ke **`createInvoiceSchema`** (di antara field lain, sebelum `.oxor(...)`) dan ke **`updateInvoiceSchema`** (sebelum `.min(1)`):

```js
  auto_create_sj:        Joi.boolean().default(true),
  overwrite_sj_confirmed: Joi.boolean().default(false),
```

- [ ] **Step 2: Tambah helper mapping + header + orkestrasi di invoice.service**

Di `src/services/invoice.service.js`, tambahkan tiga fungsi ini (letakkan setelah `buildSJItemRows`, sekitar line 508). `DELIVERY_ADDITIONAL_CHARGE_LABEL`, `effectiveServiceType`, `DeliveryOrder`, `InvoiceItem`, `ConflictError` semuanya sudah tersedia di file ini.

```js
/**
 * Map InvoiceItem rows → SJItem[] untuk auto-create SJ dari invoice.
 * Baris additional charge ("Pembiayaan Lainnya") dikecualikan — bukan barang.
 */
function buildSJItemsFromInvoiceItems(invItems) {
  const { randomUUID } = require('crypto')
  return (invItems || [])
    .filter(it => !isDeliveryAdditionalChargeItem(it))
    .map(it => ({
      id:          randomUUID(),
      description: it.description || it.fleet_label || '',
      qty:         it.cargo_qty === null || it.cargo_qty === undefined ? Number(it.qty || 0) : Number(it.cargo_qty),
      unit:        it.cargo_unit || it.unit || 'unit',
      weight:      it.cargo_weight === null || it.cargo_weight === undefined ? null : Number(it.cargo_weight),
      volume:      it.cargo_volume === null || it.cargo_volume === undefined ? null : Number(it.cargo_volume),
      notes:       it.cargo_notes || '',
      source_type: 'manual',
    }))
}

/** Header SJ diturunkan dari invoice + item pertama (fleet/driver pengiriman). */
function deriveSJHeaderFromInvoice(invoice, invItems) {
  const first = (invItems || [])[0] || {}
  return {
    project_id:         invoice.project_id || null,
    customer_id:        invoice.customer_id,
    fleet_id:           first.fleet_id || null,
    driver_id:          first.driver_id || null,
    driver_name_manual: first.driver_name_manual || null,
    sj_date:            invoice.delivery_date || invoice.invoice_date,
    origin:             invoice.origin || '-',
    destination:        invoice.destination || '-',
    cargo_description:  invoice.cargo_description || null,
    operational_cost:   0,
  }
}

/**
 * Auto-create / overwrite SJ dari invoice ketika mode manual (1 nomor).
 * Dipanggil di akhir transaksi create()/update(). Guard:
 *   - SJ terkait invoice lain      → ConflictError SJ_LINKED_OTHER_INVOICE
 *   - SJ ada & belum dikonfirmasi  → ConflictError SJ_EXISTS_NEEDS_CONFIRM
 * Timpa = replace header+items, status SJ lama dipertahankan.
 */
async function syncManualSj(invoice, payload, actor, t) {
  if (payload.auto_create_sj === false) return
  const effType = effectiveServiceType(invoice.service_type, invoice.custom_service_name)
  if (effType === 'rental') return

  const raw = String(invoice.manual_sj_numbers || '').trim()
  if (!raw || raw.includes(',')) return // kosong / multi-token → skip (data lama)
  const sjNumber = raw

  const existing = await DeliveryOrder.findOne({
    where:       { sj_number: sjNumber },
    transaction: t,
    lock:        t.LOCK.UPDATE,
  })

  const sameInvoice = existing && Number(existing.invoice_id || 0) === Number(invoice.id)
  if (existing && existing.invoice_id && !sameInvoice) {
    throw new ConflictError(`Nomor SJ ${sjNumber} sudah dipakai invoice lain.`, { code: 'SJ_LINKED_OTHER_INVOICE' })
  }
  if (existing && !sameInvoice && payload.overwrite_sj_confirmed !== true) {
    throw new ConflictError(`Nomor SJ ${sjNumber} sudah ada. Konfirmasi untuk menimpa.`, { code: 'SJ_EXISTS_NEEDS_CONFIRM' })
  }

  const invItems = await InvoiceItem.findAll({
    where:       { invoice_id: invoice.id },
    order:       [['sort_order', 'ASC'], ['id', 'ASC']],
    transaction: t,
  })
  const sjItems = buildSJItemsFromInvoiceItems(invItems)
  const header  = deriveSJHeaderFromInvoice(invoice, invItems)

  if (existing) {
    await existing.update({
      ...header,
      items:                     sjItems,
      invoice_id:                invoice.id,
      invoice_attachment_status: 'attached',
      updated_by:                actor?.id || null,
    }, { transaction: t })
  } else {
    await DeliveryOrder.create({
      sj_number:                 sjNumber,
      ...header,
      items:                     sjItems,
      status:                    'draft',
      invoice_id:                invoice.id,
      invoice_attachment_status: 'attached',
      created_by:                actor?.id || null,
      updated_by:                actor?.id || null,
    }, { transaction: t })
  }
}
```

- [ ] **Step 3: Panggil `syncManualSj` di `create()`**

Di `create()` (sekitar line 917-921), sisipkan panggilan setelah blok DP dan sebelum `const fresh = await repo.findByUuid(...)`:

```js
    // Optional DP saat create.
    if (payload.down_payment) {
      await upsertDownPayment(invoice, payload.down_payment, actor, t)
    }

    // Auto-create/overwrite SJ dari nomor manual (1 nomor) + tautkan.
    await syncManualSj(invoice, payload, actor, t)

    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
```

- [ ] **Step 4: Panggil `syncManualSj` di `update()`**

Di `update()` (sekitar line 1150-1152), sisipkan sebelum `const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })` (yang di akhir transaksi). Reload dulu agar `invoice.manual_sj_numbers` mencerminkan update terbaru:

```js
    // Auto-create/overwrite SJ dari nomor manual (1 nomor) + tautkan.
    await invoice.reload({ transaction: t })
    await syncManualSj(invoice, payload, actor, t)

    const fresh = await repo.findByUuid(invoice.uuid, { transaction: t })
    return decorate(fresh)
```

- [ ] **Step 5: Verifikasi server boot**

Run: `cd pnj-backend && node -e "require('./src/services/invoice.service'); require('./src/validators/invoice.validator'); console.log('OK')"`
Expected: mencetak `OK` tanpa error.

- [ ] **Step 6: Verifikasi alur via UI (ditunda ke Task 8)**

Verifikasi end-to-end tiap cabang dilakukan di Task 8 setelah frontend siap. Untuk cek cepat sekarang (opsional, backend jalan + token), buat invoice delivery via curl dengan `manual_sj_numbers:"SJ-BARU-001"` dan cek SJ baru muncul di `GET /surat-jalan/lookup?sj_number=SJ-BARU-001` dengan `invoice_id` terisi.

- [ ] **Step 7: Commit**

```bash
git add pnj-backend/src/validators/invoice.validator.js pnj-backend/src/services/invoice.service.js
git commit -m "feat(invoice-backend): auto-create/overwrite SJ dari nomor manual di transaksi invoice"
```

---

## Task 3: Frontend — Repo lookup SJ by nomor

**Files:**
- Modify: `features/surat-jalan/infrastructure/repositories/ISuratJalanRepository.ts`
- Modify: `features/surat-jalan/infrastructure/repositories/MockSuratJalanRepository.ts`

- [ ] **Step 1: Tambah tipe + method di interface**

Di `ISuratJalanRepository.ts`, tambahkan tipe hasil lookup dan method ke interface:

```ts
export interface SjLookupResult {
  uuid: string
  sj_number: string
  status: string
  invoice_id: number | null
  invoice_number: string | null
}
```

Tambahkan ke `interface ISuratJalanRepository`:

```ts
  getBySjNumber(sjNumber: string): Promise<SjLookupResult | null>
```

- [ ] **Step 2: Implement di MockSuratJalanRepository**

Di `MockSuratJalanRepository.ts`, import tipe dan tambahkan method di dalam class `MockSuratJalanRepository` (mis. setelah `getByUuid`):

Update baris import:
```ts
import { ISuratJalanRepository, PaginatedResult, SjLookupResult } from './ISuratJalanRepository'
```

Tambah method:
```ts
  async getBySjNumber(sjNumber: string): Promise<SjLookupResult | null> {
    const q = encodeURIComponent(sjNumber.trim())
    const response = await apiRequest<{ exists: boolean; sj: SjLookupResult | null }>(
      `/surat-jalan/lookup?sj_number=${q}`,
      { method: 'GET' },
    )
    return response.data.sj ?? null
  }
```

- [ ] **Step 3: Verifikasi typecheck**

Run: `npm run build`
Expected: build sukses (tidak ada error TypeScript pada file yang diubah). (Kalau build lama, cukup pastikan tidak ada error TS baru.)

- [ ] **Step 4: Commit**

```bash
git add features/surat-jalan/infrastructure/repositories/ISuratJalanRepository.ts features/surat-jalan/infrastructure/repositories/MockSuratJalanRepository.ts
git commit -m "feat(sj): repo getBySjNumber via endpoint lookup"
```

---

## Task 4: Frontend — Flag DTO + payload invoice repo

**Files:**
- Modify: `features/invoice/application/dto/CreateInvoiceDto.ts:38-62`
- Modify: `features/invoice/application/dto/UpdateInvoiceDto.ts`
- Modify: `features/invoice/infrastructure/repositories/MockInvoiceRepository.ts:277-317`

- [ ] **Step 1: Tambah flag ke CreateInvoiceDto**

Di `CreateInvoiceDto.ts`, dalam `interface CreateInvoiceDto`, tambahkan (setelah `send_immediately?: boolean`):

```ts
  // Auto-create SJ dari manual_sj_numbers (1 nomor). Default aktif di backend.
  auto_create_sj?: boolean
  overwrite_sj_confirmed?: boolean
```

- [ ] **Step 2: Tambah flag ke UpdateInvoiceDto**

Di `UpdateInvoiceDto.ts`, tambahkan dua field opsional yang sama di dalam interface-nya:

```ts
  auto_create_sj?: boolean
  overwrite_sj_confirmed?: boolean
```

- [ ] **Step 3: Kirim flag di MockInvoiceRepository.create**

Di `MockInvoiceRepository.ts` `create()`, tambahkan ke object `body` (setelah `down_payment: ...`):

```ts
        down_payment: dto.down_payment ?? undefined,
        auto_create_sj: dto.auto_create_sj ?? true,
        overwrite_sj_confirmed: dto.overwrite_sj_confirmed ?? false,
```

- [ ] **Step 4: Kirim flag di MockInvoiceRepository.update**

`update()` saat ini menyebar `...dto`. Karena `UpdateInvoiceDto` sudah memuat kedua flag, keduanya otomatis ikut terkirim — tidak perlu perubahan. Verifikasi dengan membaca method `update()` bahwa body = `{ ...dto, items: ... }`.

- [ ] **Step 5: Verifikasi typecheck**

Run: `npm run build`
Expected: build sukses tanpa error TS baru.

- [ ] **Step 6: Commit**

```bash
git add features/invoice/application/dto/CreateInvoiceDto.ts features/invoice/application/dto/UpdateInvoiceDto.ts features/invoice/infrastructure/repositories/MockInvoiceRepository.ts
git commit -m "feat(invoice): flag auto_create_sj + overwrite_sj_confirmed di DTO & payload"
```

---

## Task 5: Frontend — Modal konfirmasi timpa & popup batal

**Files:**
- Create: `features/invoice/presentation/components/modals/ConfirmOverwriteSJModal.tsx`
- Create: `features/invoice/presentation/components/modals/ClearManualSJPrompt.tsx`

- [ ] **Step 1: Buat ConfirmOverwriteSJModal**

Buat `features/invoice/presentation/components/modals/ConfirmOverwriteSJModal.tsx`:

```tsx
'use client'

import { AlertTriangle } from 'lucide-react'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'

interface Props {
  open: boolean
  sjNumber: string
  sjStatus?: string
  onConfirm: () => void
  onCancel: () => void
}

const STATUS_LABEL: Record<string, string> = {
  draft:     'Draft',
  assigned:  'Terbit',
  delivered: 'Terkirim',
  void:      'Void',
}

export default function ConfirmOverwriteSJModal({ open, sjNumber, sjStatus, onConfirm, onCancel }: Props) {
  return (
    <ModalShell open={open} onClose={onCancel} title="Nomor SJ Sudah Ada" subtitle={`Nomor: ${sjNumber}`}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border px-3 py-3" style={{ borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }}>
          <AlertTriangle size={18} style={{ color: '#B45309' }} className="mt-0.5" />
          <p className="text-sm text-gray-700">
            SJ <strong>{sjNumber}</strong>{sjStatus ? ` (status ${STATUS_LABEL[sjStatus] || sjStatus})` : ''} sudah ada.
            Jika dilanjutkan, isi header & rincian barang SJ tersebut akan <strong>ditimpa</strong> dengan data dari invoice ini.
            Status SJ tidak berubah.
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onCancel} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>
            Batal
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
            Ya, Timpa SJ Lama
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
```

- [ ] **Step 2: Buat ClearManualSJPrompt**

Buat `features/invoice/presentation/components/modals/ClearManualSJPrompt.tsx`:

```tsx
'use client'

import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'

interface Props {
  open: boolean
  onClearAndSubmit: () => void
  onBack: () => void
}

export default function ClearManualSJPrompt({ open, onClearAndSubmit, onBack }: Props) {
  return (
    <ModalShell open={open} onClose={onBack} title="Batalkan Pembuatan SJ?" subtitle="Nomor SJ tidak jadi diproses">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Kamu membatalkan penimpaan SJ. Mau <strong>hapus nomor SJ manual</strong> dan lanjut membuat invoice
          <strong> tanpa SJ</strong>? Atau kembali ke form untuk mengganti nomornya.
        </p>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onBack} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>
            Kembali ke Form
          </button>
          <button onClick={onClearAndSubmit} className="px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ backgroundColor: 'var(--green-primary)' }}>
            Hapus Nomor & Buat Tanpa SJ
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
```

- [ ] **Step 3: Verifikasi typecheck**

Run: `npm run build`
Expected: build sukses. (Komponen belum dipakai — pastikan tidak ada error import/`ModalShell` path.)

- [ ] **Step 4: Commit**

```bash
git add features/invoice/presentation/components/modals/ConfirmOverwriteSJModal.tsx features/invoice/presentation/components/modals/ClearManualSJPrompt.tsx
git commit -m "feat(invoice): modal konfirmasi timpa SJ + popup batal"
```

---

## Task 6: Frontend — CreateInvoicePage: input 1 nomor + gate submit

**Files:**
- Modify: `features/invoice/presentation/pages/CreateInvoicePage.tsx`

Referensi anchor saat ini: state `manualSjNumbers` (line ~86), `getDto()` (line ~422), `validate()` (~548), `handleSaveDraft` (~577), `handleSaveAndSend` (~590), input manual textarea (~1026).

- [ ] **Step 1: Import modal + state gate**

Tambahkan import di bagian atas:
```tsx
import ConfirmOverwriteSJModal from '../components/modals/ConfirmOverwriteSJModal'
import ClearManualSJPrompt from '../components/modals/ClearManualSJPrompt'
import { suratJalanRepository } from '../../../surat-jalan/infrastructure/repositories/MockSuratJalanRepository'
```

Tambahkan state (dekat `const [manualSjNumbers, setManualSjNumbers] = useState('')`):
```tsx
  const [sjGate, setSjGate] = useState<{ mode: 'confirm' | 'clear'; sjNumber: string; sjStatus?: string; send: boolean } | null>(null)
```

- [ ] **Step 2: `getDto` terima flag overwrite**

Ubah signature `getDto` untuk menerima opsi overwrite dan sertakan flag ke object return. Ganti baris `const getDto = (sendImmediately = false) => {` menjadi:
```tsx
  const getDto = (sendImmediately = false, overwriteSjConfirmed = false) => {
```
Lalu di object yang di-`return` (dekat `send_immediately: sendImmediately,`), tambahkan:
```tsx
      send_immediately: sendImmediately,
      overwrite_sj_confirmed: overwriteSjConfirmed,
```

- [ ] **Step 3: Validasi input 1 nomor**

Di `validate()`, setelah blok `if (isDeliveryLikeService) { ... }`, tambahkan validasi manual:
```tsx
    if (isDeliveryLikeService && sjInputMode === 'manual' && manualSjNumbers.trim().includes(',')) {
      result.errors.manual_sj_numbers = 'Masukkan tepat satu nomor SJ (tanpa koma) agar bisa dibuat otomatis.'
      result.valid = false
    }
```
(Field `result.errors`/`result.valid` sudah dipakai pola yang sama di sekitarnya.)

- [ ] **Step 4: Fungsi gate + refactor submit**

Ganti isi `handleSaveDraft` dan `handleSaveAndSend` agar memanggil gate dulu. Tambahkan fungsi berikut sebelum `handleSaveDraft`:

```tsx
  const isManualSjMode = () =>
    isDeliveryLikeService && sjInputMode === 'manual' && manualSjNumbers.trim().length > 0

  // Kirim invoice ke backend (dipakai setelah gate SJ lolos).
  const doSubmit = async (send: boolean, overwriteConfirmed = false) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    const result = await dispatch(createInvoice(getDto(send, overwriteConfirmed)))
    setIsSubmitting(false)
    if (createInvoice.fulfilled.match(result)) {
      pushToast({
        title: send ? 'Invoice Dikirim' : 'Invoice Disimpan',
        description: `Invoice #${result.payload.invoice_number} berhasil dibuat${send ? ' dan dikirim' : ' sebagai draft'}.`,
        variant: 'success',
      })
      router.push('/invoice')
      return
    }
    pushToast({ title: 'Gagal membuat invoice', description: (result.payload as string) || 'Invoice tidak tersimpan.', variant: 'error' })
  }

  // Gate: cek nomor SJ manual sebelum submit.
  const submitWithSjGate = async (send: boolean) => {
    if (!validate()) return
    if (!isManualSjMode()) { await doSubmit(send); return }

    const sjNumber = manualSjNumbers.trim()
    let lookup
    try {
      lookup = await suratJalanRepository.getBySjNumber(sjNumber)
    } catch {
      pushToast({ title: 'Gagal cek nomor SJ', description: 'Tidak bisa memverifikasi nomor SJ. Coba lagi.', variant: 'error' })
      return
    }

    if (lookup && lookup.invoice_id) {
      pushToast({
        title: 'Nomor SJ dipakai invoice lain',
        description: `SJ ${sjNumber} sudah tertaut ke invoice ${lookup.invoice_number || 'lain'}. Ganti nomor SJ.`,
        variant: 'error',
      })
      return
    }
    if (lookup) {
      setSjGate({ mode: 'confirm', sjNumber, sjStatus: lookup.status, send })
      return
    }
    await doSubmit(send) // nomor belum ada → buat baru
  }

  const handleSaveDraft = () => submitWithSjGate(false)
  const handleSaveAndSend = () => submitWithSjGate(true)
```

Lalu **hapus** definisi lama `handleSaveDraft` dan `handleSaveAndSend` (yang memanggil `dispatch(createInvoice(getDto(...)))` langsung) agar tidak dobel.

- [ ] **Step 5: Render modal gate**

Sebelum penutup akhir JSX komponen (dekat modal-modal lain / sebelum `</>` atau `</div>` terluar yang di-return), tambahkan:

```tsx
      <ConfirmOverwriteSJModal
        open={sjGate?.mode === 'confirm'}
        sjNumber={sjGate?.sjNumber || ''}
        sjStatus={sjGate?.sjStatus}
        onConfirm={() => { const g = sjGate; setSjGate(null); if (g) doSubmit(g.send, true) }}
        onCancel={() => setSjGate(g => (g ? { ...g, mode: 'clear' } : null))}
      />
      <ClearManualSJPrompt
        open={sjGate?.mode === 'clear'}
        onClearAndSubmit={() => { const g = sjGate; setManualSjNumbers(''); setSjGate(null); if (g) doSubmit(g.send, false) }}
        onBack={() => setSjGate(null)}
      />
```

Catatan: `onClearAndSubmit` mengosongkan `manualSjNumbers` via state, tapi `doSubmit` membaca `getDto()` yang memakai `manualSjNumbers` — karena setState async, kirim juga flag mematikan auto-create untuk submit ini. Untuk aman, ubah `doSubmit` menampung override: lihat Step 6.

- [ ] **Step 6: Override auto_create_sj saat clear**

Ubah `doSubmit` agar bisa mematikan auto-create untuk kasus clear (hindari race setState). Ganti tanda tangan & pemakaian getDto:

```tsx
  const doSubmit = async (send: boolean, overwriteConfirmed = false, disableAutoSj = false) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    const dto = { ...getDto(send, overwriteConfirmed), ...(disableAutoSj ? { auto_create_sj: false, manual_sj_numbers: null } : {}) }
    const result = await dispatch(createInvoice(dto))
    setIsSubmitting(false)
    if (createInvoice.fulfilled.match(result)) {
      pushToast({
        title: send ? 'Invoice Dikirim' : 'Invoice Disimpan',
        description: `Invoice #${result.payload.invoice_number} berhasil dibuat${send ? ' dan dikirim' : ' sebagai draft'}.`,
        variant: 'success',
      })
      router.push('/invoice')
      return
    }
    pushToast({ title: 'Gagal membuat invoice', description: (result.payload as string) || 'Invoice tidak tersimpan.', variant: 'error' })
  }
```

Dan di `ClearManualSJPrompt` `onClearAndSubmit`, panggil `doSubmit(g.send, false, true)`:
```tsx
        onClearAndSubmit={() => { const g = sjGate; setManualSjNumbers(''); setSjGate(null); if (g) doSubmit(g.send, false, true) }}
```

- [ ] **Step 7: Ubah textarea manual → input 1 nomor**

Ganti blok `<textarea ... value={manualSjNumbers} ... />` (sekitar line 1026) menjadi input satu baris:

```tsx
                    <div>
                      <input
                        type="text"
                        className="form-input w-full"
                        value={manualSjNumbers}
                        onChange={event => setManualSjNumbers(event.target.value)}
                        placeholder="Contoh: SJ-2026-07-001"
                      />
                      <p className="text-xs text-gray-400 mt-1.5">
                        Masukkan <strong>satu</strong> nomor SJ. Saat invoice dibuat, SJ dengan nomor ini otomatis dibuat/diperbarui dan terlampir.
                      </p>
                      {errors.manual_sj_numbers && <p className="text-xs text-red-600 mt-1">{errors.manual_sj_numbers}</p>}
                    </div>
```

- [ ] **Step 8: Verifikasi typecheck + UI**

Run: `npm run build`
Expected: build sukses tanpa error TS.
Lalu jalankan app (`npm run dev`) + backend, verifikasi UI di Task 8.

- [ ] **Step 9: Commit**

```bash
git add features/invoice/presentation/pages/CreateInvoicePage.tsx
git commit -m "feat(invoice): gate nomor SJ manual + input 1 nomor di halaman buat invoice"
```

---

## Task 7: Frontend — EditInvoicePage: gate submit

**Files:**
- Modify: `features/invoice/presentation/pages/EditInvoicePage.tsx`

Struktur nyata: satu `handleSave` (line ~380) — tanpa split save/send. Membangun `dto: Record<string, unknown>` di dua cabang (`fullEditable` line ~572 dan else line ~600), memvalidasi, lalu **satu** `dispatch(updateInvoice({ uuid, dto }))` di line ~629-635. Ada juga cabang VOID yang `return` lebih awal (line ~435-445) — biarkan, invoice void tak menyentuh manual SJ.

- [ ] **Step 1: Import modal + repo + state gate**

Tambahkan import:
```tsx
import ConfirmOverwriteSJModal from '../components/modals/ConfirmOverwriteSJModal'
import ClearManualSJPrompt from '../components/modals/ClearManualSJPrompt'
import { suratJalanRepository } from '../../../surat-jalan/infrastructure/repositories/MockSuratJalanRepository'
```

Tambahkan state (dekat deklarasi state lain, mis. setelah `manualSjNumbers`):
```tsx
  const [sjGate, setSjGate] = useState<{ mode: 'confirm' | 'clear'; sjNumber: string; sjStatus?: string; dto: Record<string, unknown> } | null>(null)
```

- [ ] **Step 2: Ekstrak commit + gate; ganti dispatch terakhir**

Ganti blok dispatch terakhir di `handleSave` (line ~629-635):
```tsx
    const action = await dispatch(updateInvoice({ uuid, dto: dto as Parameters<typeof validateUpdateInvoice>[0] }))
    if (updateInvoice.fulfilled.match(action)) {
      pushToast({ title: 'Invoice Disimpan', description: `Invoice #${invoice?.invoice_number} berhasil diperbarui.`, variant: 'success' })
      router.push(`/invoice/${uuid}`)
    } else if (updateInvoice.rejected.match(action)) {
      pushToast({ title: 'Gagal Menyimpan', description: action.payload as string ?? 'Terjadi kesalahan. Coba lagi.', variant: 'error' })
    }
  }
```
menjadi panggilan gate:
```tsx
    await submitWithSjGate(dto)
  }
```

Lalu tambahkan dua fungsi ini di dalam komponen (mis. tepat sebelum `const handleSave`):
```tsx
  const commitUpdate = async (finalDto: Record<string, unknown>) => {
    const action = await dispatch(updateInvoice({ uuid, dto: finalDto as Parameters<typeof validateUpdateInvoice>[0] }))
    if (updateInvoice.fulfilled.match(action)) {
      pushToast({ title: 'Invoice Disimpan', description: `Invoice #${invoice?.invoice_number} berhasil diperbarui.`, variant: 'success' })
      router.push(`/invoice/${uuid}`)
    } else if (updateInvoice.rejected.match(action)) {
      pushToast({ title: 'Gagal Menyimpan', description: action.payload as string ?? 'Terjadi kesalahan. Coba lagi.', variant: 'error' })
    }
  }

  const submitWithSjGate = async (dto: Record<string, unknown>) => {
    const raw = manualSjNumbers.trim()
    const manualMode = isDeliveryLikeInvoice && raw.length > 0
    // Toleransi data lama multi-nomor: lewati gate, backend skip auto-create.
    if (!manualMode || raw.includes(',')) { await commitUpdate(dto); return }

    let lookup
    try { lookup = await suratJalanRepository.getBySjNumber(raw) }
    catch { pushToast({ title: 'Gagal cek nomor SJ', description: 'Tidak bisa memverifikasi nomor SJ. Coba lagi.', variant: 'error' }); return }

    const currentInvoiceId = invoice?.id ?? null
    if (lookup && lookup.invoice_id && Number(lookup.invoice_id) !== Number(currentInvoiceId)) {
      pushToast({ title: 'Nomor SJ dipakai invoice lain', description: `SJ ${raw} sudah tertaut invoice ${lookup.invoice_number || 'lain'}. Ganti nomor SJ.`, variant: 'error' })
      return
    }
    if (lookup && Number(lookup.invoice_id || 0) !== Number(currentInvoiceId)) {
      // SJ ada & bukan milik invoice ini → konfirmasi timpa.
      setSjGate({ mode: 'confirm', sjNumber: raw, sjStatus: lookup.status, dto })
      return
    }
    // Tidak ada, atau SJ ini sudah milik invoice yang sedang diedit → lanjut tanpa konfirmasi.
    await commitUpdate({ ...dto, overwrite_sj_confirmed: true })
  }
```

- [ ] **Step 3: Render modal gate (edit)**

Tambahkan sebelum penutup JSX komponen (dekat modal lain / sebelum return terluar ditutup):
```tsx
      <ConfirmOverwriteSJModal
        open={sjGate?.mode === 'confirm'}
        sjNumber={sjGate?.sjNumber || ''}
        sjStatus={sjGate?.sjStatus}
        onConfirm={() => { const g = sjGate; setSjGate(null); if (g) commitUpdate({ ...g.dto, overwrite_sj_confirmed: true }) }}
        onCancel={() => setSjGate(g => (g ? { ...g, mode: 'clear' } : null))}
      />
      <ClearManualSJPrompt
        open={sjGate?.mode === 'clear'}
        onClearAndSubmit={() => { const g = sjGate; setManualSjNumbers(''); setSjGate(null); if (g) commitUpdate({ ...g.dto, auto_create_sj: false, manual_sj_numbers: null }) }}
        onBack={() => setSjGate(null)}
      />
```

- [ ] **Step 4: Ubah input manual jadi 1 nomor + helper**

Di input manual edit (cari `value={manualSjNumbers}` di file, sekitar line 836), ganti `<textarea>` menjadi `<input type="text">` satu baris dengan helper. Untuk data lama multi-nomor jangan blokir — helper cukup menjelaskan:
```tsx
                    <input
                      type="text"
                      className="form-input w-full"
                      value={manualSjNumbers}
                      onChange={event => setManualSjNumbers(event.target.value)}
                      placeholder="Contoh: SJ-2026-07-001"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Satu nomor SJ → otomatis dibuat/diperbarui & terlampir saat disimpan. Nilai lama berisi beberapa nomor tidak diproses otomatis.
                    </p>
```

- [ ] **Step 5: Verifikasi typecheck**

Run: `npm run build`
Expected: build sukses tanpa error TS. Bila `invoice?.id` bertipe error/undefined, pastikan entity `Invoice` punya `id?` (ada di `Invoice.ts:104`) dan `invoice` sudah ter-load sebelum submit.

- [ ] **Step 6: Commit**

```bash
git add features/invoice/presentation/pages/EditInvoicePage.tsx
git commit -m "feat(invoice): gate nomor SJ manual di halaman edit invoice"
```

---

## Task 8: Verifikasi end-to-end (manual/integrasi)

**Prasyarat:** backend jalan (`cd pnj-backend && npm run dev`) + frontend jalan (`npm run dev`) + login sebagai user berhak.

- [ ] **Step 1: Nomor SJ baru → SJ tercreate & terlampir**
  - Buat invoice delivery, mode SJ manual, isi nomor baru (mis. `SJ-TEST-NEW-001`), isi rincian barang, submit.
  - Expected: invoice tersimpan; buka detail invoice → SJ `SJ-TEST-NEW-001` muncul di daftar SJ terlampir (`attached_sj`). Buka modul Surat Jalan → SJ ada, item = item cargo invoice, status `draft`, tertaut ke invoice.

- [ ] **Step 2: Nomor SJ sudah ada (bebas) → konfirmasi → timpa (status tetap)**
  - Siapkan SJ existing tak tertaut invoice (mis. status `assigned`). Buat invoice manual dengan nomor itu, submit.
  - Expected: muncul `ConfirmOverwriteSJModal`. Klik "Ya, Timpa" → invoice dibuat; SJ ter-update header+item dari invoice, **status tetap `assigned`**, kini tertaut invoice.

- [ ] **Step 3: Batal timpa → popup clear**
  - Ulangi Step 2 tapi klik "Batal" → muncul `ClearManualSJPrompt`.
    - "Kembali ke Form" → tidak ada yang dibuat.
    - "Hapus Nomor & Buat Tanpa SJ" → invoice dibuat tanpa SJ; nomor manual kosong; SJ lama tidak berubah.

- [ ] **Step 4: Nomor SJ terkait invoice lain → blokir**
  - Pakai nomor SJ yang sudah tertaut invoice lain. Submit invoice manual dengan nomor itu.
  - Expected: toast merah "Nomor SJ dipakai invoice lain", invoice tidak dibuat (gate memblok sebelum submit). Backend juga menolak (`SJ_LINKED_OTHER_INVOICE`) bila dipaksa.

- [ ] **Step 5: PDF ikut SJ**
  - Buka invoice dari Step 1/2 → Cetak PDF → opsi "Lampirkan daftar SJ terlampir" tersedia & tercentang. Generate → PDF memuat SJ.

- [ ] **Step 6: Edit invoice**
  - Edit invoice (mis. dari Step 1), ubah rincian barang, simpan.
  - Expected: SJ tertaut ikut ter-update (karena nomor = milik invoice ini → tanpa konfirmasi). Ganti ke nomor SJ lain yang bebas → muncul konfirmasi timpa.

- [ ] **Step 7: Regresi mode linked & tanpa SJ**
  - Buat invoice mode `linked` (pilih SJ existing) → perilaku lama tetap (tidak ada auto-create).
  - Buat invoice tanpa nomor SJ → normal, tidak ada SJ dibuat.

- [ ] **Step 8: Commit catatan verifikasi (opsional)**

Kalau ada penyesuaian kecil selama verifikasi, commit dengan pesan `fix(invoice): penyesuaian auto-create SJ pasca verifikasi`.

---

## Self-Review Notes

- **Spec coverage:** lookup endpoint (T1), mapping + guard + timpa status-preserved + create draft + multi-token skip (T2), repo lookup (T3), flags (T4), modals (T5), Create gate + input 1 nomor (T6), Edit gate + toleransi data lama (T7), linkage+PDF diverifikasi (T8 Step 5). Semua bagian spec tercakup.
- **Konsistensi tipe:** `getBySjNumber` → `SjLookupResult | null` dipakai konsisten di T3/T6/T7. Flag `auto_create_sj`/`overwrite_sj_confirmed` konsisten FE DTO ↔ BE validator.
- **Catatan implementasi Edit (T7):** `handleSave` sudah membangun `dto` lengkap di dua cabang; gate hanya membungkus dispatch terakhir (ekstrak `commitUpdate` + `submitWithSjGate`). Tidak ada save/send split di Edit.
