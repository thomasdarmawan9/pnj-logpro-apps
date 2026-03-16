'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchStockItems, createStockReceipt } from '@/store/slices/stockSlice'
import { useToast } from '@/components/toast/useToast'
import { MOCK_CUSTOMERS } from '@/lib/mockData/stock'

interface ReceiptItemRow {
  id: string
  stock_item_id: number | ''
  qty: string
  notes: string
}

export default function CreateStockReceiptPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { items, isSubmitting } = useSelector((state: RootState) => state.stock)

  const [form, setForm] = useState({
    receipt_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    document_number: '',
    customer_id: '',
    notes: '',
  })

  const [itemRows, setItemRows] = useState<ReceiptItemRow[]>([
    { id: '1', stock_item_id: '', qty: '', notes: '' },
  ])

  useEffect(() => {
    dispatch(fetchStockItems())
  }, [dispatch])

  const activeItems = items.filter(i => i.is_active)

  const addRow = () => {
    setItemRows(prev => [...prev, { id: Date.now().toString(), stock_item_id: '', qty: '', notes: '' }])
  }

  const removeRow = (id: string) => {
    if (itemRows.length === 1) return
    setItemRows(prev => prev.filter(r => r.id !== id))
  }

  const updateRow = (id: string, field: keyof ReceiptItemRow, value: string | number) => {
    setItemRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const selectedItemIds = itemRows.map(r => r.stock_item_id).filter(id => id !== '')

  const isValid = () => {
    if (!form.receipt_date) return false
    if (itemRows.some(r => !r.stock_item_id || !r.qty || Number(r.qty) <= 0)) return false
    // no duplicate items
    const ids = itemRows.map(r => r.stock_item_id)
    if (new Set(ids).size !== ids.length) return false
    return true
  }

  const handleSubmit = async () => {
    if (!isValid()) {
      pushToast({ title: 'Form Tidak Lengkap', description: 'Harap isi semua kolom yang wajib dan pastikan tidak ada barang duplikat.', variant: 'error' })
      return
    }

    const dto = {
      receipt_date: form.receipt_date,
      supplier_name: form.supplier_name || null,
      document_number: form.document_number || null,
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      notes: form.notes || null,
      items: itemRows.map(r => ({
        stock_item_id: Number(r.stock_item_id),
        qty: Number(r.qty),
        notes: r.notes || null,
      })),
    }

    const res = await dispatch(createStockReceipt(dto))
    const { createStockReceipt: createThunk } = await import('@/store/slices/stockSlice')
    if (createThunk.fulfilled.match(res)) {
      pushToast({ title: 'Stok Masuk Disimpan', description: 'Data penerimaan stok berhasil disimpan.', variant: 'success' })
      router.push('/stok/masuk')
    } else {
      pushToast({ title: 'Gagal Menyimpan', description: 'Terjadi kesalahan. Silakan coba lagi.', variant: 'error' })
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Stok Masuk / Baru</div>
          <h1 className="text-2xl font-bold">Tambah Stok Masuk</h1>
        </div>
      </div>

      <div className="max-w-3xl space-y-5">
        {/* Section A: Receipt info */}
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base mb-4">Informasi Penerimaan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tanggal Penerimaan <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="form-input w-full"
                value={form.receipt_date}
                onChange={e => setForm(prev => ({ ...prev, receipt_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Penerimaan</label>
              <input
                type="text"
                className="form-input w-full bg-gray-50 text-gray-400"
                value="(otomatis)"
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Supplier / Kapal</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Contoh: Kapal Bahari 27"
                value={form.supplier_name}
                onChange={e => setForm(prev => ({ ...prev, supplier_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Dokumen / SPAL</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Contoh: SPAL 141"
                value={form.document_number}
                onChange={e => setForm(prev => ({ ...prev, document_number: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer</label>
              <select
                className="form-input w-full"
                value={form.customer_id}
                onChange={e => setForm(prev => ({ ...prev, customer_id: e.target.value }))}
              >
                <option value="">— Pilih Customer —</option>
                {MOCK_CUSTOMERS.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Opsional"
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Section B: Items */}
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'var(--border-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">Daftar Barang</h2>
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl border transition-colors hover:bg-green-50"
              style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
            >
              <Plus size={14} />
              Tambah Baris
            </button>
          </div>

          <div className="space-y-3">
            {itemRows.map((row, idx) => {
              const selectedItem = activeItems.find(i => i.id === Number(row.stock_item_id))
              const isDuplicate = itemRows.filter(r => r.stock_item_id === row.stock_item_id && row.stock_item_id !== '').length > 1

              return (
                <div
                  key={row.id}
                  className={`grid grid-cols-12 gap-2 items-start p-3 rounded-xl border ${isDuplicate ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div className="col-span-5">
                    <label className="block text-xs text-gray-500 mb-1">Barang {idx + 1} *</label>
                    <select
                      className={`form-input w-full text-sm ${isDuplicate ? 'error' : ''}`}
                      value={row.stock_item_id}
                      onChange={e => updateRow(row.id, 'stock_item_id', e.target.value)}
                    >
                      <option value="">— Pilih Barang —</option>
                      {activeItems.map(item => (
                        <option
                          key={item.id}
                          value={item.id}
                          disabled={selectedItemIds.includes(item.id) && item.id !== Number(row.stock_item_id)}
                        >
                          {item.code} — {item.name}
                        </option>
                      ))}
                    </select>
                    {isDuplicate && <p className="text-xs text-red-600 mt-1">Barang sudah dipilih di baris lain</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Qty *</label>
                    <input
                      type="number"
                      min={1}
                      className="form-input w-full text-sm"
                      value={row.qty}
                      onChange={e => updateRow(row.id, 'qty', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs text-gray-500 mb-1">Satuan</label>
                    <div className="form-input w-full text-sm text-gray-400 bg-gray-100">{selectedItem?.unit ?? '—'}</div>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-xs text-gray-500 mb-1">Catatan</label>
                    <input
                      type="text"
                      className="form-input w-full text-sm"
                      value={row.notes}
                      onChange={e => updateRow(row.id, 'notes', e.target.value)}
                      placeholder="Opsional"
                    />
                  </div>
                  <div className="col-span-1 flex items-end pb-0.5">
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={itemRows.length === 1}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-400 disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Preview total */}
          <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-100">
            <div className="text-xs text-gray-600 font-semibold mb-2">Ringkasan</div>
            {itemRows.filter(r => r.stock_item_id && r.qty).map(row => {
              const item = activeItems.find(i => i.id === Number(row.stock_item_id))
              if (!item) return null
              return (
                <div key={row.id} className="flex justify-between text-xs text-gray-700 mb-1">
                  <span>{item.name}</span>
                  <span className="font-bold text-green-700">+{row.qty} {item.unit}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 rounded-xl border hover:bg-gray-50 transition-colors"
            style={{ borderColor: 'var(--border-card)' }}
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid()}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-60 transition-colors"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Stok Masuk'}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
