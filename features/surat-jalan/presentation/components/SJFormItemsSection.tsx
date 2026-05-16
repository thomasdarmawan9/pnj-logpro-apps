'use client'

import { Fragment } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { SJItem } from '../../domain/entities/SuratJalan'

const UNIT_OPTIONS = ['pcs', 'unit', 'set', 'kg', 'ton', 'liter', 'dus', 'karton', 'roll', 'meter', 'lainnya']

function createEmptyItem(): SJItem {
  return {
    id: crypto.randomUUID(),
    description: '',
    qty: 1,
    unit: 'pcs',
    unit_price: 0,
    notes: '',
  }
}

function formatRupiah(n: number): string {
  if (!n) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  items: SJItem[]
  onChange: (items: SJItem[]) => void
}

export default function SJFormItemsSection({ items, onChange }: Props) {
  const update = (id: string, field: keyof SJItem, value: string | number) => {
    onChange(items.map(item => item.id === id ? { ...item, [field]: value } : item))
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

      {items.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed rounded-lg" style={{ borderColor: 'var(--border-card)' }}>
          Belum ada item. Klik &ldquo;Tambah Item&rdquo; untuk menambahkan rincian muatan.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b text-[11px] font-medium text-gray-500" style={{ borderColor: 'var(--border-card)' }}>
                <th className="text-left pb-2 w-6">No</th>
                <th className="text-left pb-2 px-2">Deskripsi / Nama Barang *</th>
                <th className="text-center pb-2 px-1 w-16">Jumlah *</th>
                <th className="text-center pb-2 px-1 w-20">Satuan *</th>
                <th className="text-right pb-2 px-2 w-32">Harga Satuan</th>
                <th className="text-right pb-2 px-2 w-32">Subtotal</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <Fragment key={item.id}>
                  <tr className="align-top">
                    <td className="pt-2 pr-1 text-xs text-gray-400">{idx + 1}</td>

                    <td className="pt-1.5 px-2">
                      <input
                        className="form-input w-full text-sm"
                        placeholder="contoh: Besi beton 10mm"
                        value={item.description}
                        onChange={e => update(item.id, 'description', e.target.value)}
                      />
                    </td>

                    <td className="pt-1.5 px-1">
                      <input
                        type="number"
                        min={1}
                        className="form-input w-full text-sm text-center"
                        value={item.qty}
                        onChange={e => update(item.id, 'qty', Math.max(1, Number(e.target.value)))}
                      />
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
                        className="form-input w-full text-sm text-right"
                        value={item.unit_price || ''}
                        placeholder="0"
                        onChange={e => update(item.id, 'unit_price', Math.max(0, Number(e.target.value)))}
                      />
                    </td>

                    <td className="pt-1.5 px-2">
                      <div
                        className="form-input w-full text-sm text-right bg-gray-50 select-none"
                        style={{ color: item.unit_price > 0 ? '#166534' : '#9CA3AF' }}
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
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                <td colSpan={4} />
                <td className="pt-3 px-2 text-xs font-semibold text-right text-gray-600">Total</td>
                <td className="pt-3 px-2 text-sm font-bold text-right" style={{ color: grandTotal > 0 ? '#166534' : '#9CA3AF' }}>
                  {grandTotal > 0 ? formatRupiah(grandTotal) : '-'}
                </td>
                <td />
              </tr>
              <tr>
                <td colSpan={7} className="pt-2 text-xs text-gray-400">
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
