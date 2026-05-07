# SJ Rincian Item Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan fitur rincian item (detail baris) pada Surat Jalan — saat buat/edit SJ user bisa menambahkan baris item (deskripsi, qty, satuan, harga), dan item ini tampil di halaman detail SJ.

**Architecture:** Item SJ disimpan di tabel `delivery_order_items` (relasi hasMany dari `delivery_orders`). Item tidak punya field armada (armada sudah ada di level SJ) dan tidak ada periode. BE menangani create/update items dalam satu transaksi bersama SJ. FE memakai hook `useSJItems` dan komponen `SJItemRow` yang disederhanakan dari pola invoice.

**Tech Stack:** Node.js + Sequelize (BE), Next.js + Redux Toolkit + TypeScript (FE), PostgreSQL.

---

## File Map

### Backend (buat/ubah)
| File | Action |
|---|---|
| `pnj-backend/src/migrations/20260101000026-create-delivery-order-items.js` | CREATE — tabel baru |
| `pnj-backend/src/models/DeliveryOrderItem.js` | CREATE — Sequelize model |
| `pnj-backend/src/models/index.js` | MODIFY — register model + associations |
| `pnj-backend/src/repositories/deliveryOrder.repository.js` | MODIFY — include items dalam INCLUDES |
| `pnj-backend/src/validators/suratJalan.validator.js` | MODIFY — terima `items` array |
| `pnj-backend/src/services/suratJalan.service.js` | MODIFY — create/update/upsert items |

### Frontend (buat/ubah)
| File | Action |
|---|---|
| `features/surat-jalan/domain/entities/SuratJalan.ts` | MODIFY — tambah `SJItem` interface + field `items` |
| `features/surat-jalan/application/dto/CreateSJDto.ts` | MODIFY — tambah `items` |
| `features/surat-jalan/application/dto/UpdateSJDto.ts` | MODIFY — tambah `items` |
| `features/surat-jalan/infrastructure/repositories/MockSuratJalanRepository.ts` | MODIFY — normalize items, kirim items |
| `features/surat-jalan/presentation/hooks/useSJItems.ts` | CREATE — state management untuk baris item |
| `features/surat-jalan/presentation/components/SJItemRow.tsx` | CREATE — baris item UI (tanpa fleet, tanpa periode) |
| `features/surat-jalan/presentation/pages/CreateSuratJalanPage.tsx` | MODIFY — tambah section "Rincian Item" |
| `features/surat-jalan/presentation/pages/EditSuratJalanPage.tsx` | MODIFY — pre-fill + tampil section "Rincian Item" |
| `features/surat-jalan/presentation/pages/DetailSuratJalanPage.tsx` | MODIFY — tampilkan tabel item di tab "Informasi SJ" |

---

## Task 1: DB Migration + Model

**Files:**
- Create: `pnj-backend/src/migrations/20260101000026-create-delivery-order-items.js`
- Create: `pnj-backend/src/models/DeliveryOrderItem.js`

- [ ] **Step 1: Buat migration file**

```js
// pnj-backend/src/migrations/20260101000026-create-delivery-order-items.js
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('delivery_order_items', {
      id: {
        type:          Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey:    true,
      },
      uuid: {
        type:         Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull:    false,
        unique:       true,
      },
      delivery_order_id: {
        type:       Sequelize.BIGINT,
        allowNull:  false,
        references: { model: 'delivery_orders', key: 'id' },
        onUpdate:   'CASCADE',
        onDelete:   'CASCADE',
      },
      description: {
        type:      Sequelize.STRING(500),
        allowNull: false,
      },
      qty: {
        type:         Sequelize.DECIMAL(10, 2),
        allowNull:    false,
        defaultValue: 1,
      },
      unit: {
        type:         Sequelize.STRING(30),
        allowNull:    false,
        defaultValue: 'Unit',
      },
      unit_price: {
        type:         Sequelize.DECIMAL(15, 2),
        allowNull:    false,
        defaultValue: 0,
      },
      subtotal: {
        type:         Sequelize.DECIMAL(15, 2),
        allowNull:    false,
        defaultValue: 0,
      },
      sort_order: {
        type:         Sequelize.INTEGER,
        allowNull:    false,
        defaultValue: 0,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    })

    await queryInterface.addIndex('delivery_order_items', ['delivery_order_id'], {
      name: 'doi_delivery_order_id_idx',
    })
  },

  async down(queryInterface) {
    await queryInterface.dropTable('delivery_order_items')
  },
}
```

- [ ] **Step 2: Buat Sequelize model**

```js
// pnj-backend/src/models/DeliveryOrderItem.js
'use strict'

const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const DeliveryOrderItem = sequelize.define('DeliveryOrderItem', {
    id: {
      type:          DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey:    true,
    },
    uuid: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull:    false,
      unique:       true,
    },
    delivery_order_id: {
      type:      DataTypes.BIGINT,
      allowNull: false,
    },
    description: {
      type:      DataTypes.STRING(500),
      allowNull: false,
    },
    qty: {
      type:         DataTypes.DECIMAL(10, 2),
      allowNull:    false,
      defaultValue: 1,
    },
    unit: {
      type:         DataTypes.STRING(30),
      allowNull:    false,
      defaultValue: 'Unit',
    },
    unit_price: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
    },
    subtotal: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
    },
    sort_order: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
    },
  }, {
    tableName:  'delivery_order_items',
    paranoid:   false,
    timestamps: true,
  })

  return DeliveryOrderItem
}
```

- [ ] **Step 3: Jalankan migration**

```bash
cd pnj-backend && npx sequelize-cli db:migrate
```

Expected: `20260101000026-create-delivery-order-items: migrated`

---

## Task 2: Register Model + Associations

**Files:**
- Modify: `pnj-backend/src/models/index.js`

- [ ] **Step 1: Tambah require dan associations**

Di `models/index.js`, tambahkan setelah baris `const BankAccount = require('./BankAccount')(sequelize)`:
```js
const DeliveryOrderItem = require('./DeliveryOrderItem')(sequelize)
```

Tambahkan associations setelah blok `// ── Invoice associations`:
```js
// ── DeliveryOrderItem associations ────────────────────────────────────────
DeliveryOrder.hasMany(DeliveryOrderItem, {
  foreignKey: 'delivery_order_id',
  as:         'items',
  onDelete:   'CASCADE',
})
DeliveryOrderItem.belongsTo(DeliveryOrder, {
  foreignKey: 'delivery_order_id',
  as:         'delivery_order',
})
```

Tambahkan `DeliveryOrderItem` ke `module.exports`:
```js
module.exports = {
  // ... existing exports ...
  DeliveryOrderItem,
}
```

- [ ] **Step 2: Verify models load**

```bash
cd pnj-backend && node -e "require('./src/models/index.js'); console.log('OK')"
```

Expected: `OK`

---

## Task 3: Repository — Include Items

**Files:**
- Modify: `pnj-backend/src/repositories/deliveryOrder.repository.js`

- [ ] **Step 1: Tambah DeliveryOrderItem ke imports dan INCLUDES**

Ubah baris imports:
```js
const {
  DeliveryOrder,
  Project,
  Customer,
  Fleet,
  Driver,
  Invoice,
  DeliveryOrderItem,
} = require('../models')
```

Tambahkan `ITEM_INCLUDE` dan masukkan ke `INCLUDES`:
```js
const ITEM_INCLUDE = {
  model:    DeliveryOrderItem,
  as:       'items',
  required: false,
  order:    [['sort_order', 'ASC'], ['id', 'ASC']],
}

const INCLUDES = [
  // ... existing includes (Project, Customer, Fleet, Driver, Invoice) ...
  ITEM_INCLUDE,
]
```

Tambahkan `order` eksplisit pada `findByUuid` dan `findById` untuk items:
```js
function findByUuid(uuid, options = {}) {
  return DeliveryOrder.findOne({
    where:   { uuid },
    include: INCLUDES,
    order:   [[{ model: DeliveryOrderItem, as: 'items' }, 'sort_order', 'ASC'],
              [{ model: DeliveryOrderItem, as: 'items' }, 'id', 'ASC']],
    ...options,
  })
}

function findById(id, options = {}) {
  return DeliveryOrder.findByPk(id, {
    include: INCLUDES,
    order:   [[{ model: DeliveryOrderItem, as: 'items' }, 'sort_order', 'ASC'],
              [{ model: DeliveryOrderItem, as: 'items' }, 'id', 'ASC']],
  })
}
```

---

## Task 4: Validator — Terima Items

**Files:**
- Modify: `pnj-backend/src/validators/suratJalan.validator.js`

- [ ] **Step 1: Tambah itemSchema dan field items ke createSJSchema dan updateSJSchema**

Tambahkan di atas `createSJSchema`:
```js
const itemSchema = Joi.object({
  description: Joi.string().trim().min(1).max(500).required().messages({
    'string.empty': 'Deskripsi item wajib diisi.',
    'any.required': 'Deskripsi item wajib diisi.',
  }),
  qty:         Joi.number().precision(2).min(0.01).required().messages({
    'number.min': 'Qty harus lebih dari 0.',
  }),
  unit:        Joi.string().trim().max(30).default('Unit'),
  unit_price:  Joi.number().precision(2).min(0).required(),
  sort_order:  Joi.number().integer().min(0).default(0),
})
```

Di `createSJSchema`, tambahkan field:
```js
items: Joi.array().items(itemSchema).default([]),
```

Di `updateSJSchema`, tambahkan field:
```js
items: Joi.array().items(itemSchema).min(0),
```

---

## Task 5: Service — Handle Items Create/Update

**Files:**
- Modify: `pnj-backend/src/services/suratJalan.service.js`

- [ ] **Step 1: Tambah DeliveryOrderItem ke imports**

```js
const {
  sequelize,
  DeliveryOrder,
  DeliveryOrderItem,
  Project,
  Customer,
  Fleet,
  Driver,
  Invoice,
} = require('../models')
```

- [ ] **Step 2: Tambah helper buildItemRows**

Tambahkan setelah fungsi `resolveMasters`:
```js
function buildItemRows(items, deliveryOrderId) {
  return (items || []).map((it, idx) => ({
    delivery_order_id: deliveryOrderId,
    description:       it.description.trim(),
    qty:               Number(it.qty),
    unit:              it.unit || 'Unit',
    unit_price:        Number(it.unit_price),
    subtotal:          Math.round(Number(it.qty) * Number(it.unit_price)),
    sort_order:        it.sort_order !== undefined ? it.sort_order : idx,
  }))
}
```

- [ ] **Step 3: Update fungsi `create` — simpan items setelah DeliveryOrder dibuat**

Setelah baris `await DeliveryOrder.create({...}, { transaction: t })`, tambahkan:
```js
if (payload.items && payload.items.length > 0) {
  const itemRows = buildItemRows(payload.items, sj.id)
  await DeliveryOrderItem.bulkCreate(itemRows, { transaction: t })
}

return repo.findByUuid(sj.uuid, { transaction: t })
```

Ganti baris `return repo.findByUuid(sj.uuid, { transaction: t })` yang sudah ada.

- [ ] **Step 4: Update fungsi `update` — upsert items jika dikirim**

Di bagian `const passthrough = [...]` dalam fungsi `update`, setelah blok `lampiran_paths` handling, tambahkan:
```js
// Replace items kalau payload.items dikirim (array baru menggantikan lama).
if ('items' in payload && Array.isArray(payload.items)) {
  await DeliveryOrderItem.destroy({ where: { delivery_order_id: sj.id }, transaction: t })
  if (payload.items.length > 0) {
    const itemRows = buildItemRows(payload.items, sj.id)
    await DeliveryOrderItem.bulkCreate(itemRows, { transaction: t })
  }
}
```

---

## Task 6: FE — Domain Entity + DTOs

**Files:**
- Modify: `features/surat-jalan/domain/entities/SuratJalan.ts`
- Modify: `features/surat-jalan/application/dto/CreateSJDto.ts`
- Modify: `features/surat-jalan/application/dto/UpdateSJDto.ts`

- [ ] **Step 1: Tambah SJItem interface dan field items ke SuratJalan entity**

Di `SuratJalan.ts`, tambahkan sebelum `export interface SuratJalan`:
```ts
export interface SJItem {
  id?: number
  uuid: string
  delivery_order_id?: number
  description: string
  qty: number
  unit: string
  unit_price: number
  subtotal: number
  sort_order: number
}
```

Di `SuratJalan` interface, tambahkan setelah `internal_notes`:
```ts
items: SJItem[]
```

- [ ] **Step 2: Tambah CreateSJItemDto dan field items ke CreateSJDto**

Di `CreateSJDto.ts`:
```ts
export interface CreateSJItemDto {
  description: string
  qty: number
  unit: string
  unit_price: number
  sort_order: number
}

export interface CreateSJDto {
  project_id: number
  fleet_id: number
  driver_id: number | null
  driver_name_manual: string | null
  sj_date: string
  origin: string
  destination: string
  cargo_description: string | null
  operational_cost: number
  internal_notes: string | null
  items: CreateSJItemDto[]
  publish: boolean
}
```

- [ ] **Step 3: Tambah field items ke UpdateSJDto**

Di `UpdateSJDto.ts`:
```ts
import { CreateSJItemDto } from './CreateSJDto'

export interface UpdateSJDto {
  fleet_id?: number
  driver_id?: number | null
  driver_name_manual?: string | null
  sj_date?: string
  origin?: string
  destination?: string
  cargo_description?: string | null
  operational_cost?: number
  internal_notes?: string | null
  lampiran_paths?: string[] | null
  items?: CreateSJItemDto[]
}
```

---

## Task 7: FE — Repository Normalize Items

**Files:**
- Modify: `features/surat-jalan/infrastructure/repositories/MockSuratJalanRepository.ts`

- [ ] **Step 1: Tambah ApiSJItem type, normalize, dan mapping**

Di bagian type `ApiSJ`, tambahkan field setelah `operational_cost`:
```ts
items?: ApiSJItem[]
```

Tambahkan interface dan fungsi normalize sebelum `normalizeSJ`:
```ts
interface ApiSJItem {
  id?: number | string
  uuid: string
  delivery_order_id?: number | string
  description: string
  qty: number | string
  unit: string
  unit_price: number | string
  subtotal: number | string
  sort_order: number | string
}

function normalizeSJItem(item: ApiSJItem): SJItem {
  return {
    id:                 item.id !== undefined ? Number(item.id) : undefined,
    uuid:               item.uuid,
    delivery_order_id:  item.delivery_order_id !== undefined ? Number(item.delivery_order_id) : undefined,
    description:        item.description,
    qty:                Number(item.qty || 0),
    unit:               item.unit || 'Unit',
    unit_price:         Number(item.unit_price || 0),
    subtotal:           Number(item.subtotal || 0),
    sort_order:         Number(item.sort_order || 0),
  }
}
```

Di `normalizeSJ`, tambahkan setelah `lampiran_paths: sj.lampiran_paths ?? null`:
```ts
items: (sj.items || []).map(normalizeSJItem),
```

Import `SJItem` ke dalam type import dari entity:
```ts
import { SuratJalan, SJItem, StatusLampiran, SJFilterState, PaginationState } from '../../domain/entities/SuratJalan'
```

- [ ] **Step 2: Kirim items saat create dan update**

Fungsi `create` sudah kirim spread `...dto` jadi otomatis terkirim. Pastikan `UpdateSJDto` juga dikirim dengan items jika ada.

---

## Task 8: FE — useSJItems Hook

**Files:**
- Create: `features/surat-jalan/presentation/hooks/useSJItems.ts`

- [ ] **Step 1: Buat hook**

```ts
// features/surat-jalan/presentation/hooks/useSJItems.ts
import { useState, useMemo } from 'react'
import { SJItem } from '../../domain/entities/SuratJalan'
import { CreateSJItemDto } from '../../application/dto/CreateSJDto'

type PartialSJItem = Omit<SJItem, 'id' | 'delivery_order_id'>

export function useSJItems(initialItems: PartialSJItem[] = []) {
  const [items, setItems] = useState<PartialSJItem[]>(initialItems)

  const subtotalAmount = useMemo(
    () => items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0),
    [items]
  )

  const addItem = () => {
    const newItem: PartialSJItem = {
      uuid:        crypto.randomUUID(),
      description: '',
      qty:         1,
      unit:        'Unit',
      unit_price:  0,
      subtotal:    0,
      sort_order:  items.length,
    }
    setItems(prev => [...prev, newItem])
  }

  const updateItem = (uuid: string, field: string, value: unknown) => {
    setItems(prev => prev.map(item => {
      if (item.uuid !== uuid) return item
      const updated = { ...item, [field]: value }
      updated.subtotal = Math.round(Number(updated.qty || 0) * Number(updated.unit_price || 0))
      return updated
    }))
  }

  const removeItem = (uuid: string) =>
    setItems(prev => prev.filter(item => item.uuid !== uuid))

  const reorderItems = (fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const result = [...prev]
      const [moved] = result.splice(fromIndex, 1)
      result.splice(toIndex, 0, moved)
      return result.map((item, i) => ({ ...item, sort_order: i }))
    })
  }

  const resetItems = (newItems: PartialSJItem[]) => setItems(newItems)

  const toDto = (): CreateSJItemDto[] =>
    items.map((item, idx) => ({
      description: item.description,
      qty:         item.qty,
      unit:        item.unit,
      unit_price:  item.unit_price,
      sort_order:  idx,
    }))

  return { items, subtotalAmount, addItem, updateItem, removeItem, reorderItems, resetItems, toDto }
}
```

---

## Task 9: FE — SJItemRow Component

**Files:**
- Create: `features/surat-jalan/presentation/components/SJItemRow.tsx`

- [ ] **Step 1: Buat komponen**

```tsx
// features/surat-jalan/presentation/components/SJItemRow.tsx
'use client'

import { useState } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { SJItem } from '../../domain/entities/SuratJalan'

type PartialSJItem = Omit<SJItem, 'id' | 'delivery_order_id'>

interface Props {
  item: PartialSJItem
  index: number
  onChange: (uuid: string, field: string, value: unknown) => void
  onRemove: (uuid: string) => void
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: () => void
  errors?: Record<string, string>
}

const UNIT_OPTIONS = ['Unit', 'Hari', 'Bulan', 'Trip', 'Paket', 'Meter Kubik', 'Kilogram', 'Ton', 'Karton', 'Lembar', 'Liter', 'Meter']

function parseNumber(val: string): number {
  return Number(val.replace(/\D/g, '')) || 0
}

function formatNumber(n: number): string {
  return n > 0 ? n.toLocaleString('id-ID') : ''
}

export default function SJItemRow({ item, index, onChange, onRemove, onDragStart, onDragOver, onDrop, errors = {} }: Props) {
  const [priceDisplay, setPriceDisplay] = useState(() => formatNumber(item.unit_price))

  const descKey   = `items.${index}.description`
  const qtyKey    = `items.${index}.qty`
  const priceKey  = `items.${index}.unit_price`

  return (
    <div
      className="rounded-xl border p-4 space-y-3 bg-white"
      style={{ borderColor: 'var(--border-card)' }}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index) }}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-400 cursor-grab" />
          <span className="text-xs font-semibold text-gray-500">Item {index + 1}</span>
        </div>
        <button type="button" onClick={() => onRemove(item.uuid)} className="p-1 rounded hover:bg-red-50">
          <Trash2 size={14} className="text-red-400" />
        </button>
      </div>

      {/* Deskripsi */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">
          Deskripsi <span className="text-red-500">*</span>
        </label>
        <input
          className={`form-input w-full text-sm ${errors[descKey] ? 'border-red-400' : ''}`}
          value={item.description}
          onChange={e => onChange(item.uuid, 'description', e.target.value)}
          placeholder="contoh: Jasa Pengiriman Barang"
        />
        {errors[descKey] && <p className="text-xs text-red-500 mt-1">{errors[descKey]}</p>}
      </div>

      {/* Qty, Satuan, Harga */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Qty <span className="text-red-500">*</span></label>
          <input
            type="number"
            min="0.01"
            step="0.01"
            className={`form-input w-full text-sm ${errors[qtyKey] ? 'border-red-400' : ''}`}
            value={item.qty}
            onChange={e => onChange(item.uuid, 'qty', Number(e.target.value) || 0)}
          />
          {errors[qtyKey] && <p className="text-xs text-red-500 mt-1">{errors[qtyKey]}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Satuan</label>
          <select
            className="form-input w-full text-sm"
            value={item.unit}
            onChange={e => onChange(item.uuid, 'unit', e.target.value)}
          >
            {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Harga Satuan <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              className={`form-input w-full text-sm pl-8 font-mono ${errors[priceKey] ? 'border-red-400' : ''}`}
              value={priceDisplay}
              onChange={e => {
                const raw = e.target.value.replace(/\D/g, '')
                setPriceDisplay(raw)
                onChange(item.uuid, 'unit_price', Number(raw) || 0)
              }}
              onBlur={() => setPriceDisplay(formatNumber(item.unit_price))}
              onFocus={() => setPriceDisplay(item.unit_price > 0 ? String(item.unit_price) : '')}
              placeholder="0"
            />
          </div>
          {errors[priceKey] && <p className="text-xs text-red-500 mt-1">{errors[priceKey]}</p>}
        </div>
      </div>

      {/* Subtotal */}
      <div className="flex justify-end">
        <div className="text-xs text-gray-500">
          Subtotal: <span className="font-semibold text-gray-800 font-mono">
            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.subtotal)}
          </span>
        </div>
      </div>
    </div>
  )
}
```

---

## Task 10: FE — CreateSuratJalanPage — Tambah Section Items

**Files:**
- Modify: `features/surat-jalan/presentation/pages/CreateSuratJalanPage.tsx`

- [ ] **Step 1: Import useSJItems dan SJItemRow**

Tambahkan imports:
```tsx
import { useSJItems } from '../hooks/useSJItems'
import SJItemRow from '../components/SJItemRow'
import { Plus } from 'lucide-react'  // sudah ada ArrowLeft dan ArrowRightLeft
```

- [ ] **Step 2: Inisialisasi hook**

Di dalam component setelah `useSuratJalanForm`:
```tsx
const { items, subtotalAmount, addItem, updateItem, removeItem, reorderItems, toDto } = useSJItems()
const [dragFrom, setDragFrom] = useState<number | null>(null)
const [dragOver, setDragOver] = useState<number | null>(null)
```

- [ ] **Step 3: Sertakan items di handleSubmit**

Di `handleSubmit`, ubah dispatch call:
```tsx
const result = await dispatch(createSuratJalan({
  ...form,
  project_id: selectedProject?.id || 0,
  fleet_id: selectedArmada?.id || 0,
  driver_id: driverMode === 'master' ? selectedDriver?.id || null : null,
  driver_name_manual: driverMode === 'tbd' ? 'Belum Ditentukan' : null,
  items: toDto(),
  publish,
}))
```

- [ ] **Step 4: Tambah section items di JSX — setelah section "Rute & Muatan"**

Tambahkan sebelum section "Catatan Internal":
```tsx
{/* Rincian Item */}
<div className="rounded-xl bg-white p-6 border mt-4" style={{ borderColor: 'var(--border-card)' }}>
  <div className="flex items-center justify-between mb-4">
    <div className="text-sm font-semibold">Rincian Item</div>
    <button
      type="button"
      onClick={addItem}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
      style={{ backgroundColor: 'var(--green-primary)' }}
    >
      <Plus size={13} /> Tambah Item
    </button>
  </div>

  {items.length === 0 ? (
    <div className="text-center py-6 border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--border-card)' }}>
      <p className="text-sm text-gray-400">Belum ada item. Klik "Tambah Item" untuk menambahkan.</p>
    </div>
  ) : (
    <div className="space-y-3">
      {items.map((item, index) => (
        <SJItemRow
          key={item.uuid}
          item={item}
          index={index}
          onChange={updateItem}
          onRemove={removeItem}
          onDragStart={i => setDragFrom(i)}
          onDragOver={i => setDragOver(i)}
          onDrop={() => {
            if (dragFrom !== null && dragOver !== null && dragFrom !== dragOver) {
              reorderItems(dragFrom, dragOver)
            }
            setDragFrom(null)
            setDragOver(null)
          }}
        />
      ))}
    </div>
  )}

  {items.length > 0 && (
    <div className="mt-3 flex justify-end text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
      Total Item: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(subtotalAmount)}
    </div>
  )}
</div>
```

---

## Task 11: FE — EditSuratJalanPage — Tambah Section Items

**Files:**
- Modify: `features/surat-jalan/presentation/pages/EditSuratJalanPage.tsx`

- [ ] **Step 1: Import + init hook**

Tambahkan imports:
```tsx
import { useSJItems } from '../hooks/useSJItems'
import SJItemRow from '../components/SJItemRow'
import { Plus } from 'lucide-react'
```

Inisialisasi hook di dalam component:
```tsx
const { items, subtotalAmount, addItem, updateItem, removeItem, reorderItems, resetItems, toDto } = useSJItems()
const [dragFrom, setDragFrom] = useState<number | null>(null)
const [dragOver, setDragOver] = useState<number | null>(null)
```

- [ ] **Step 2: Pre-fill items dari selectedSJ**

Di `useEffect` yang sudah ada untuk pre-fill form dari `selectedSJ`, tambahkan:
```tsx
if (selectedSJ.items && selectedSJ.items.length > 0) {
  resetItems(selectedSJ.items.map(item => ({
    uuid:        item.uuid,
    description: item.description,
    qty:         item.qty,
    unit:        item.unit,
    unit_price:  item.unit_price,
    subtotal:    item.subtotal,
    sort_order:  item.sort_order,
  })))
}
```

- [ ] **Step 3: Sertakan items di handleSave**

Di `dispatch(updateSuratJalan(...))`, tambahkan `items: toDto()` ke dalam dto.

- [ ] **Step 4: Tambah section items di JSX**

Sama persis dengan struktur di CreateSuratJalanPage (Task 10 Step 4) — ditempatkan setelah section "Rute & Muatan", sebelum section lampiran/catatan.

---

## Task 12: FE — DetailSuratJalanPage — Tampilkan Items

**Files:**
- Modify: `features/surat-jalan/presentation/pages/DetailSuratJalanPage.tsx`

- [ ] **Step 1: Tambah tabel items di tab "Informasi SJ"**

Di `{tab === 'info' && (...)}`, setelah grid 2-column yang ada (setelah `</div>` penutup grid), tambahkan:

```tsx
{/* Rincian Item */}
{selectedSJ.items && selectedSJ.items.length > 0 && (
  <div className="mt-4 rounded-xl bg-gray-50 p-4">
    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rincian Item</div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-500 border-b" style={{ borderColor: 'var(--border-card)' }}>
            <th className="text-left py-2 pr-4 font-medium">Deskripsi</th>
            <th className="text-right py-2 px-3 font-medium w-16">Qty</th>
            <th className="text-left py-2 px-3 font-medium w-20">Satuan</th>
            <th className="text-right py-2 px-3 font-medium w-36">Harga Satuan</th>
            <th className="text-right py-2 pl-3 font-medium w-36">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {selectedSJ.items.map(item => (
            <tr key={item.uuid} className="border-b last:border-0" style={{ borderColor: 'var(--border-card)' }}>
              <td className="py-2 pr-4 text-gray-800">{item.description}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-700">{item.qty}</td>
              <td className="py-2 px-3 text-gray-500">{item.unit}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-700">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.unit_price)}
              </td>
              <td className="py-2 pl-3 text-right font-mono font-semibold text-gray-800">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4} className="pt-3 text-right text-xs font-semibold text-gray-500 pr-3">Total</td>
            <td className="pt-3 pl-3 text-right font-mono font-bold text-gray-800">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
                selectedSJ.items.reduce((s, i) => s + i.subtotal, 0)
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
)}
```

---

## Task 13: Restart BE + Smoke Test

- [ ] **Step 1: Kill dan restart backend**

```bash
kill $(lsof -ti:3001) && sleep 1 && cd pnj-backend && node server.js &
sleep 2 && curl -s http://localhost:3001/health
```

Expected: `{"success":true,...}`

- [ ] **Step 2: TypeScript check FE**

```bash
npx tsc --noEmit 2>&1 | grep "error TS"
```

Expected: no output (no errors)

- [ ] **Step 3: Verify items kolom ada di DB**

```bash
cd pnj-backend && node -e "
const { sequelize } = require('./src/config/database')
sequelize.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='delivery_order_items' ORDER BY ordinal_position\", { type: require('sequelize').QueryTypes.SELECT })
  .then(cols => { cols.forEach(c => console.log(c.column_name)); process.exit(0) })
" 2>&1 | grep -v dotenv
```

Expected: `id, uuid, delivery_order_id, description, qty, unit, unit_price, subtotal, sort_order, created_at, updated_at`

---

## Self-Review Checklist

- [x] Migration buat tabel `delivery_order_items` ✓
- [x] Model Sequelize `DeliveryOrderItem` ✓
- [x] Associations di models/index.js ✓
- [x] Repository include items ✓
- [x] Validator menerima items di create dan update ✓
- [x] Service simpan items saat create, replace saat update ✓
- [x] FE entity `SJItem` + field `items` di `SuratJalan` ✓
- [x] FE DTOs updated ✓
- [x] FE repository normalize items ✓
- [x] Hook `useSJItems` ✓
- [x] Komponen `SJItemRow` (tanpa fleet, tanpa periode) ✓
- [x] CreateSuratJalanPage section items ✓
- [x] EditSuratJalanPage section items + pre-fill ✓
- [x] DetailSuratJalanPage tampil tabel items ✓
