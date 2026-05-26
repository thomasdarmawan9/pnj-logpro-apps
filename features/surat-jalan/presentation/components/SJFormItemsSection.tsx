'use client'

import { Fragment } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SJItem } from '../../domain/entities/SuratJalan'
import type { CustomerStockAvailableItem } from '@/features/stock/application/use-cases/GetCustomerStockDetail'

const UNIT_OPTIONS = ['pcs', 'unit', 'set', 'kg', 'ton', 'liter', 'dus', 'karton', 'roll', 'meter', 'lainnya']

function createEmptyItem(): SJItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    qty: 1,
    unit: 'pcs',
    unit_price: 0,
    notes: '',
    source_type: 'manual',
    stock_item_id: null,
    stock_item_uuid: null,
    stock_item_code: null,
    stock_item_name: null,
    stock_kategori_name: null,
  }
}

function formatRupiah(n: number): string {
  if (!n) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function stockOptionKey(stockItemUuid: string | null | undefined, categoryName: string | null | undefined): string {
  if (!stockItemUuid) return ''
  return `${stockItemUuid}::${categoryName || ''}`
}

interface Props {
  items: SJItem[]
  onChange: (items: SJItem[]) => void
  availableStockItems?: CustomerStockAvailableItem[]
  selectedCustomerName?: string
  isLoadingStockItems?: boolean
  restoreSelectedStockQty?: boolean
  error?: string
}

export default function SJFormItemsSection({
  items,
  onChange,
  availableStockItems = [],
  selectedCustomerName,
  isLoadingStockItems = false,
  restoreSelectedStockQty = false,
  error,
}: Props) {
  const update = (id: string, field: keyof SJItem, value: string | number | null) => {
    onChange(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const updateItem = (id: string, patch: Partial<SJItem>) => {
    onChange(items.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  const handleSourceChange = (item: SJItem, source: 'manual' | 'stock') => {
    if (source === 'manual') {
      updateItem(item.id, {
        source_type: 'manual',
        stock_item_id: null,
        stock_item_uuid: null,
        stock_item_code: null,
        stock_item_name: null,
        stock_kategori_name: null,
      })
      return
    }

    updateItem(item.id, {
      source_type: 'stock',
      description: '',
      stock_item_id: null,
      stock_item_uuid: null,
      stock_item_code: null,
      stock_item_name: null,
      stock_kategori_name: null,
    })
  }

  const stockOptionsFor = (item: SJItem): CustomerStockAvailableItem[] => {
    if (!item.stock_item_uuid) return availableStockItems

    const existing = availableStockItems.find(row =>
      row.stockItemUuid === item.stock_item_uuid &&
      (row.categoryName || null) === (item.stock_kategori_name || null)
    )
    if (existing) {
      return availableStockItems.map(row =>
        row.stockItemUuid === item.stock_item_uuid &&
        (row.categoryName || null) === (item.stock_kategori_name || null)
        ? { ...row, availableQty: row.availableQty + (restoreSelectedStockQty ? Number(item.qty || 0) : 0) }
        : row
      )
    }

    if (!item.stock_item_name && !item.description) return availableStockItems
    return [
      ...availableStockItems,
      {
        stockItemId: item.stock_item_id || 0,
        stockItemUuid: item.stock_item_uuid,
        code: item.stock_item_code || '-',
        name: item.stock_item_name || item.description,
        unit: item.unit,
        categoryName: item.stock_kategori_name || null,
        categories: item.stock_kategori_name ? [item.stock_kategori_name] : [],
        availableQty: restoreSelectedStockQty ? Number(item.qty || 0) : 0,
      },
    ]
  }

  const otherQtyForOption = (currentItemId: string, optionKey: string) => items.reduce((sum, row) => {
    if (row.id === currentItemId || row.source_type !== 'stock') return sum
    if (stockOptionKey(row.stock_item_uuid, row.stock_kategori_name) !== optionKey) return sum
    return sum + Number(row.qty || 0)
  }, 0)

  const availableQtyForOption = (item: SJItem, stockItem: CustomerStockAvailableItem) => {
    const optionKey = stockOptionKey(stockItem.stockItemUuid, stockItem.categoryName)
    return Math.max(0, stockItem.availableQty - otherQtyForOption(item.id, optionKey))
  }

  const selectedStockOptionFor = (item: SJItem) => stockOptionsFor(item).find(row =>
    row.stockItemUuid === item.stock_item_uuid &&
    (row.categoryName || null) === (item.stock_kategori_name || null)
  )

  const maxStockQtyFor = (item: SJItem) => {
    const stockItem = selectedStockOptionFor(item)
    if (!stockItem) return null
    return availableQtyForOption(item, stockItem)
  }

  const handleStockSelect = (item: SJItem, optionKey: string) => {
    const stockItem = stockOptionsFor(item).find(row =>
      stockOptionKey(row.stockItemUuid, row.categoryName) === optionKey
    )
    if (!stockItem) {
      updateItem(item.id, {
        description: '',
        stock_item_id: null,
        stock_item_uuid: null,
        stock_item_code: null,
        stock_item_name: null,
        stock_kategori_name: null,
      })
      return
    }

    const maxAllowed = availableQtyForOption(item, stockItem)
    updateItem(item.id, {
      description: stockItem.name,
      unit: stockItem.unit,
      qty: Math.min(Math.max(1, item.qty || 1), maxAllowed),
      stock_item_id: stockItem.stockItemId,
      stock_item_uuid: stockItem.stockItemUuid,
      stock_item_code: stockItem.code,
      stock_item_name: stockItem.name,
      stock_kategori_name: stockItem.categoryName || null,
    })
  }

  const add = () => onChange([...items, createEmptyItem()])
  const remove = (id: string) => onChange(items.filter(item => item.id !== id))

  const grandTotal = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0)

  return (
    <div className="rounded-xl bg-white p-6 border mt-4" style={{ borderColor: 'var(--border-card)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">Rincian Item / Muatan</div>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border text-green-700 border-green-300 hover:bg-green-50 transition-colors"
        >
          <Plus size={12} />
          Tambah Item
        </button>
      </div>
      {error && <div className="text-xs text-red-600 mb-3">{error}</div>}

      {items.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--border-card)' }}>
          Belum ada item. Klik &ldquo;Tambah Item&rdquo; untuk menambahkan rincian muatan.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-sm border-collapse">
            <thead>
              <tr className="border-b text-[11px] font-medium text-gray-500" style={{ borderColor: 'var(--border-card)' }}>
                <th className="text-left pb-2 w-7">No</th>
                <th className="text-left pb-2 px-2 w-28">Sumber</th>
                <th className="text-left pb-2 px-2 min-w-[360px]">Deskripsi / Nama Barang *</th>
                <th className="text-center pb-2 px-2 w-28">Jumlah *</th>
                <th className="text-center pb-2 px-2 w-24">Satuan *</th>
                <th className="text-right pb-2 px-2 w-36">Harga Satuan</th>
                <th className="text-right pb-2 px-2 w-40">Subtotal</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const maxStockQty = item.source_type === 'stock' ? maxStockQtyFor(item) : null

                return (
                <Fragment key={item.id}>
                  <tr className="align-top">
                    <td className="pt-2 pr-1 text-xs text-gray-400">{idx + 1}</td>

                    <td className="pt-1.5 px-2">
                      <select
                        className="form-input w-full text-xs"
                        style={{ paddingLeft: 8, paddingRight: 8 }}
                        value={item.source_type || 'manual'}
                        onChange={e => handleSourceChange(item, e.target.value as 'manual' | 'stock')}
                      >
                        <option value="manual">Manual</option>
                        <option value="stock">Stok</option>
                      </select>
                    </td>

                    <td className="pt-1.5 px-2">
                      {item.source_type === 'stock' ? (
                        <div className="space-y-1">
                          <select
                            className="form-input w-full text-sm"
                            value={stockOptionKey(item.stock_item_uuid, item.stock_kategori_name)}
                            disabled={isLoadingStockItems || !selectedCustomerName}
                            onChange={e => handleStockSelect(item, e.target.value)}
                          >
                            <option value="">
                              {selectedCustomerName
                                ? isLoadingStockItems ? 'Memuat stok...' : 'Pilih barang dari stok customer'
                                : 'Pilih project/customer dulu'}
                            </option>
                            {stockOptionsFor(item).map(stockItem => {
                              const optionKey = stockOptionKey(stockItem.stockItemUuid, stockItem.categoryName)
                              const availableQty = availableQtyForOption(item, stockItem)
                              const isCurrentOption = optionKey === stockOptionKey(item.stock_item_uuid, item.stock_kategori_name)

                              return (
                                <option
                                  key={optionKey}
                                  value={optionKey}
                                  disabled={availableQty <= 0 && !isCurrentOption}
                                >
                                  {stockItem.name}
                                  {stockItem.categoryName ? ` - ${stockItem.categoryName}` : ''}
                                  {` (${stockItem.code}) - tersedia ${availableQty} ${stockItem.unit}`}
                                </option>
                              )
                            })}
                          </select>
                          {item.stock_item_uuid && (
                            <div className="text-[11px] text-gray-400">
                              Stok customer {selectedCustomerName}
                              {item.stock_kategori_name ? ` kategori ${item.stock_kategori_name}` : ''}
                              : {maxStockQty ?? 0} {item.unit}
                            </div>
                          )}
                        </div>
                      ) : (
                        <input
                          className="form-input w-full text-sm"
                          placeholder="contoh: Besi beton 10mm"
                          value={item.description}
                          onChange={e => update(item.id, 'description', e.target.value)}
                        />
                      )}
                    </td>

                    <td className="pt-1.5 px-1">
                      <input
                        type="number"
                        min={1}
                        max={maxStockQty ?? undefined}
                        className="form-input w-full text-sm text-center"
                        value={item.qty}
                        onChange={e => {
                          const requestedQty = Math.max(1, Number(e.target.value))
                          if (item.source_type !== 'stock') {
                            update(item.id, 'qty', requestedQty)
                            return
                          }
                          const maxAllowed = maxStockQtyFor(item)
                          update(item.id, 'qty', maxAllowed !== null ? Math.min(requestedQty, maxAllowed) : requestedQty)
                        }}
                      />
                      {maxStockQty !== null && (
                        <div className="mt-1 text-[10px] text-gray-400 text-center">
                          Maks. {maxStockQty}
                        </div>
                      )}
                    </td>

                    <td className="pt-1.5 px-1">
                      <select
                        className="form-input w-full text-sm"
                        value={item.unit}
                        onChange={e => update(item.id, 'unit', e.target.value)}
                      >
                        {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>

                    <td className="pt-1.5 px-2">
                      <input
                        type="number"
                        min={0}
                        className="form-input w-full text-sm text-right font-mono"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                        value={item.unit_price || ''}
                        placeholder="0"
                        onChange={e => update(item.id, 'unit_price', Math.max(0, Number(e.target.value)))}
                      />
                    </td>

                    <td className="pt-1.5 px-2">
                      <div
                        className="form-input w-full text-sm text-right bg-gray-50 select-none font-mono whitespace-nowrap"
                        style={{
                          color: item.unit_price > 0 ? '#166534' : '#9CA3AF',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {item.unit_price > 0 ? formatRupiah(item.qty * item.unit_price) : '-'}
                      </div>
                    </td>

                    <td className="pt-1.5 pl-1">
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus item"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>

                  {/* Baris keterangan (opsional, di bawah deskripsi) */}
                  <tr>
                    <td />
                    <td />
                    <td colSpan={5} className="pb-2 px-2 pt-1">
                      <input
                        className="form-input w-full text-xs"
                        placeholder="Keterangan (opsional)"
                        value={item.notes}
                        onChange={e => update(item.id, 'notes', e.target.value)}
                      />
                    </td>
                    <td />
                  </tr>
                </Fragment>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                <td colSpan={5} />
                <td className="pt-3 px-2 text-xs font-semibold text-right text-gray-600">Total</td>
                <td className="pt-3 px-2 text-sm font-bold text-right" style={{ color: grandTotal > 0 ? '#166534' : '#9CA3AF' }}>
                  {grandTotal > 0 ? formatRupiah(grandTotal) : '-'}
                </td>
                <td />
              </tr>
              <tr>
                <td colSpan={8} className="pt-2 text-xs text-gray-400">
                  {items.length} item · Data ini akan tampil di PDF Surat Jalan
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
