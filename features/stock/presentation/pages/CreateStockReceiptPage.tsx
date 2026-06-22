'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, PackagePlus, ChevronUp, Layers } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchStockItems, createStockReceipt, createStockItem } from '@/store/slices/stockSlice'
import { fetchCustomers } from '@/store/slices/masterSlice'
import { useToast } from '@/components/toast/useToast'
import AddStockItemModal from '../components/modals/AddStockItemModal'
import { CreateStockItemDto } from '@/features/stock/application/dto/CreateStockItemDto'
import { apiRequest } from '@/lib/apiClient'
import SearchableSelect from '@/features/invoice/presentation/components/SearchableSelect'

interface KategoriRow {
  id: string
  name: string
  qty: string
  notes: string
  input_mode: 'stock' | 'new'
}

interface ReceiptItemRow {
  id: string
  stock_item_id: number | ''
  qty: string
  notes: string
  use_kategorisasi: boolean
  kategorisasi: KategoriRow[]
}

function newKategoriRow(): KategoriRow {
  return { id: Date.now().toString() + Math.random(), name: '', qty: '', notes: '', input_mode: 'new' }
}

export default function CreateStockReceiptPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { items, isSubmitting } = useSelector((state: RootState) => state.stock)
  const { customers } = useSelector((state: RootState) => state.master)
  const role = useSelector((state: RootState) => state.auth.user?.role ?? null)

  const [form, setForm] = useState({
    receipt_date: new Date().toISOString().split('T')[0],
    supplier_name: '',
    document_number: '',
    sj_number_manual: '',
    invoice_number_manual: '',
    customer_id: '',
    notes: '',
  })

  const [itemRows, setItemRows] = useState<ReceiptItemRow[]>([
    { id: '1', stock_item_id: '', qty: '', notes: '', use_kategorisasi: false, kategorisasi: [] },
  ])

  const [newItemModal, setNewItemModal] = useState<{ open: boolean; rowId: string | null }>({ open: false, rowId: null })

  // kategori suggestions per row — key = rowId, value = nama kategori yang pernah dipakai untuk barang tsb
  const [rowKategoriSuggestions, setRowKategoriSuggestions] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (role === 'admin_finance') {
      pushToast({ title: 'Akses Ditolak', description: 'Anda tidak memiliki akses membuat stok masuk.', variant: 'error' })
      router.replace('/stok')
      return
    }
    dispatch(fetchStockItems())
    if (!customers.length) dispatch(fetchCustomers())
  }, [dispatch, customers.length, role, router, pushToast])

  const activeItems = items.filter(i => i.is_active)

  // --- Kategori suggestions ---
  // Terima UUID langsung supaya tidak perlu items dalam closure
  const loadKategoriSuggestions = useCallback(async (rowId: string, stockItemUuid: string, customerUuid?: string) => {
    try {
      const qs = customerUuid ? `?customer_uuid=${encodeURIComponent(customerUuid)}` : ''
      const res = await apiRequest<{ unit: string; categories: { kategori_name: string | null }[] }>(
        `/stock/items/${stockItemUuid}/categories${qs}`,
        { method: 'GET' },
      )
      const names = res.data.categories
        .map(c => c.kategori_name)
        .filter((n): n is string => Boolean(n))
      setRowKategoriSuggestions(prev => ({ ...prev, [rowId]: names }))
    } catch {
      setRowKategoriSuggestions(prev => ({ ...prev, [rowId]: [] }))
    }
  }, [])

  // --- Row helpers ---
  const addRow = () => {
    setItemRows(prev => [...prev, {
      id: Date.now().toString(),
      stock_item_id: '',
      qty: '',
      notes: '',
      use_kategorisasi: false,
      kategorisasi: [],
    }])
  }

  const removeRow = (id: string) => {
    if (itemRows.length === 1) return
    setItemRows(prev => prev.filter(r => r.id !== id))
    setRowKategoriSuggestions(prev => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleItemChange = (rowId: string, itemIdStr: string) => {
    updateRow(rowId, 'stock_item_id', itemIdStr)
    if (itemIdStr) {
      const stockItem = activeItems.find(i => i.id === Number(itemIdStr))
      if (stockItem?.uuid) {
        const customerUuid = customers.find(c => c.id === Number(form.customer_id))?.uuid
        loadKategoriSuggestions(rowId, stockItem.uuid, customerUuid)
      }
    } else {
      setRowKategoriSuggestions(prev => ({ ...prev, [rowId]: [] }))
    }
  }

  const updateRow = (id: string, field: keyof ReceiptItemRow, value: unknown) => {
    setItemRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const toggleKategorisasi = (rowId: string) => {
    // Cari row SEBELUM update state agar bisa pakai data terkini di luar callback
    const currentRow = itemRows.find(r => r.id === rowId)
    const enabling = currentRow ? !currentRow.use_kategorisasi : false

    setItemRows(prev => prev.map(r => {
      if (r.id !== rowId) return r
      const enable = !r.use_kategorisasi
      return {
        ...r,
        use_kategorisasi: enable,
        qty: enable ? '' : r.qty,
        kategorisasi: enable ? (r.kategorisasi.length === 0 ? [newKategoriRow()] : r.kategorisasi) : [],
      }
    }))

    // Load suggestions DI LUAR state updater (bukan side effect di dalam callback)
    if (enabling && currentRow?.stock_item_id) {
      const stockItem = activeItems.find(i => i.id === Number(currentRow.stock_item_id))
      if (stockItem?.uuid) {
        const customerUuid = customers.find(c => c.id === Number(form.customer_id))?.uuid
        loadKategoriSuggestions(rowId, stockItem.uuid, customerUuid)
      }
    }
  }

  // --- Kategorisasi helpers ---
  const addKategoriRow = (rowId: string) => {
    setItemRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, kategorisasi: [...r.kategorisasi, newKategoriRow()] } : r
    ))
  }

  const removeKategoriRow = (rowId: string, katId: string) => {
    setItemRows(prev => prev.map(r => {
      if (r.id !== rowId) return r
      const updated = r.kategorisasi.filter(k => k.id !== katId)
      if (updated.length === 0) {
        return { ...r, use_kategorisasi: false, kategorisasi: [], qty: '' }
      }
      return { ...r, kategorisasi: updated }
    }))
  }

  const updateKategoriRow = (rowId: string, katId: string, field: keyof KategoriRow, value: string) => {
    setItemRows(prev => prev.map(r => {
      if (r.id !== rowId) return r
      return {
        ...r,
        kategorisasi: r.kategorisasi.map(k => k.id === katId ? { ...k, [field]: value } : k),
      }
    }))
  }

  const switchKategoriMode = (rowId: string, katId: string, mode: 'stock' | 'new') => {
    setItemRows(prev => prev.map(r => {
      if (r.id !== rowId) return r
      return {
        ...r,
        kategorisasi: r.kategorisasi.map(k =>
          k.id === katId ? { ...k, input_mode: mode, name: '' } : k
        ),
      }
    }))
  }

  // --- Barang baru ---
  const handleCreateNewItem = async (dto: CreateStockItemDto) => {
    const res = await dispatch(createStockItem(dto))
    if (createStockItem.fulfilled.match(res)) {
      const newItem = res.payload
      if (newItemModal.rowId) {
        updateRow(newItemModal.rowId, 'stock_item_id', newItem.id)
      }
      setNewItemModal({ open: false, rowId: null })
      pushToast({ title: 'Barang Ditambahkan', description: `${newItem.name} berhasil dibuat dan dipilih.`, variant: 'success' })
    }
  }

  const selectedItemIds = itemRows.map(r => r.stock_item_id).filter(id => id !== '')

  // --- Validasi ---
  const validateForm = () => {
    if (!form.receipt_date) return 'Tanggal penerimaan wajib diisi.'
    if (!form.customer_id) return 'Customer wajib dipilih.'
    const ids = itemRows.map(r => r.stock_item_id).filter(id => id !== '')
    if (new Set(ids).size !== ids.length) return 'Barang tidak boleh duplikat.'
    for (const [idx, r] of itemRows.entries()) {
      if (!r.stock_item_id) return `Barang ${idx + 1} wajib dipilih.`
      if (r.use_kategorisasi) {
        if (r.kategorisasi.length === 0) return `Minimal satu kategori wajib diisi untuk barang ${idx + 1}.`
        for (const [kIdx, k] of r.kategorisasi.entries()) {
          if (!k.name.trim()) return `Nama kategori ${kIdx + 1} pada barang ${idx + 1} wajib diisi.`
          if (!k.qty || Number(k.qty) <= 0) return `Qty kategori ${kIdx + 1} pada barang ${idx + 1} harus lebih dari 0.`
        }
      } else {
        if (!r.qty || Number(r.qty) <= 0) return `Qty barang ${idx + 1} harus lebih dari 0.`
      }
    }
    return null
  }

  // --- Submit ---
  const handleSubmit = async () => {
    const validationError = validateForm()
    if (validationError) {
      pushToast({ title: 'Form Tidak Valid', description: validationError, variant: 'error' })
      return
    }

    const flatItems: { stock_item_id: number; qty: number; notes: string | null; kategori_name: string | null }[] = itemRows.flatMap(r => {
      if (r.use_kategorisasi) {
        return r.kategorisasi.map(k => ({
          stock_item_id: Number(r.stock_item_id),
          qty: Number(k.qty),
          notes: k.notes || null,
          kategori_name: k.name as string | null,
        }))
      }
      return [{
        stock_item_id: Number(r.stock_item_id),
        qty: Number(r.qty),
        notes: r.notes || null,
        kategori_name: null,
      }]
    })

    const dto = {
      receipt_date: form.receipt_date,
      supplier_name: form.supplier_name || null,
      document_number: form.document_number || null,
      sj_number_manual: form.sj_number_manual || null,
      invoice_number_manual: form.invoice_number_manual || null,
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      notes: form.notes || null,
      items: flatItems,
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

      <div className="max-w-5xl space-y-5">
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">No. SJ (Manual)</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Contoh: SJ-0354 atau 354"
                value={form.sj_number_manual}
                onChange={e => setForm(prev => ({ ...prev, sj_number_manual: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Invoice (Manual)</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Contoh: INV-2650 atau 2650"
                value={form.invoice_number_manual}
                onChange={e => setForm(prev => ({ ...prev, invoice_number_manual: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Customer <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={customers.map(c => ({ id: c.id, label: c.name }))}
                value={form.customer_id ? Number(form.customer_id) : null}
                placeholder="Cari customer..."
                emptyText="Customer tidak ditemukan"
                onChange={id => setForm(prev => ({ ...prev, customer_id: id !== null ? String(id) : '' }))}
              />
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

          <div className="space-y-4">
            {itemRows.map((row, idx) => {
              const selectedItem = activeItems.find(i => i.id === Number(row.stock_item_id))
              const isDuplicate = itemRows.filter(r => r.stock_item_id === row.stock_item_id && row.stock_item_id !== '').length > 1

              return (
                <div
                  key={row.id}
                  className={`rounded-xl border ${isDuplicate ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                >
                  {/* Baris utama barang */}
                  <div className="grid grid-cols-12 gap-3 items-start p-3 min-w-[820px]">
                    {/* Pilih barang */}
                    <div className="col-span-4">
                      <label className="block text-xs text-gray-500 mb-1">Barang {idx + 1} *</label>
                      <div className="flex gap-1.5">
                        <select
                          className={`form-input w-full text-sm ${isDuplicate ? 'error' : ''}`}
                          value={row.stock_item_id}
                          onChange={e => handleItemChange(row.id, e.target.value)}
                        >
                          <option value="">— Pilih Barang —</option>
                          {activeItems.map(item => (
                            <option
                              key={item.id}
                              value={item.id}
                              disabled={selectedItemIds.includes(item.id) && item.id !== Number(row.stock_item_id)}
                            >
                              {item.name} ({item.unit})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setNewItemModal({ open: true, rowId: row.id })}
                          className="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-xl border text-xs font-semibold transition-colors hover:bg-green-50"
                          style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
                          title="Buat barang baru"
                        >
                          <PackagePlus size={14} />
                          Baru
                        </button>
                      </div>
                      {isDuplicate && <p className="text-xs text-red-600 mt-1">Barang sudah dipilih di baris lain</p>}
                    </div>

                    {/* Qty — disembunyikan kalau kategorisasi aktif */}
                    {!row.use_kategorisasi ? (
                      <>
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
                          <div className="form-input w-full text-sm text-gray-400 bg-gray-100 whitespace-nowrap overflow-hidden text-ellipsis">{selectedItem?.unit ?? '—'}</div>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Catatan</label>
                          <input
                            type="text"
                            className="form-input w-full text-sm"
                            value={row.notes}
                            onChange={e => updateRow(row.id, 'notes', e.target.value)}
                            placeholder="Opsional"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="col-span-5 flex items-end pb-0.5">
                        <span className="text-xs text-blue-600 font-medium italic px-2">
                          Qty & catatan diatur per kategorisasi
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="col-span-3 flex items-end justify-end gap-1 pb-0.5">
                      <button
                        type="button"
                        onClick={() => toggleKategorisasi(row.id)}
                        title={row.use_kategorisasi ? 'Nonaktifkan kategorisasi' : 'Aktifkan kategorisasi'}
                        className={`shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-xl border text-xs font-semibold transition-colors hover:bg-green-50 ${row.use_kategorisasi ? 'bg-green-50' : ''}`}
                        style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
                      >
                        {row.use_kategorisasi ? <ChevronUp size={14} /> : <Layers size={14} />}
                        Kategorisasi
                      </button>
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={itemRows.length === 1}
                        className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-400 disabled:opacity-30"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Sub-baris kategorisasi */}
                  {row.use_kategorisasi && (
                    <div className="px-3 pb-3 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-px flex-1 bg-blue-100" />
                        <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Kategorisasi</span>
                        <div className="h-px flex-1 bg-blue-100" />
                      </div>

                      {row.kategorisasi.map((kat, kIdx) => {
                        const suggestions = rowKategoriSuggestions[row.id] ?? []
                        const catOptions = suggestions.map((name, i) => ({ id: i + 1, label: name }))
                        const catValueId = kat.name ? (catOptions.find(o => o.label === kat.name)?.id ?? null) : null
                        return (
                        <div key={kat.id} className="grid grid-cols-12 gap-3 items-start bg-blue-50 border border-blue-100 rounded-lg p-2.5 min-w-[820px]">
                          <div className="col-span-5">
                            <label className="block text-xs text-gray-500 mb-1">Nama Kategori {kIdx + 1} *</label>
                            <div className="flex gap-1.5">
                              {/* Mode selector */}
                              <select
                                className="form-input text-xs shrink-0 w-28 cursor-pointer"
                                value={kat.input_mode}
                                onChange={e => switchKategoriMode(row.id, kat.id, e.target.value as 'stock' | 'new')}
                              >
                                <option value="new">Input Baru</option>
                                <option value="stock" disabled={suggestions.length === 0}>
                                  {suggestions.length === 0 ? 'Dari Stok (-)' : 'Dari Stok'}
                                </option>
                              </select>
                              {/* Input sesuai mode */}
                              {kat.input_mode === 'stock' ? (
                                <div className="flex-1">
                                  <SearchableSelect
                                    options={catOptions}
                                    value={catValueId}
                                    placeholder="Cari kategori..."
                                    emptyText="Kategori tidak ditemukan"
                                    onChange={id => {
                                      const label = catOptions.find(o => o.id === id)?.label ?? ''
                                      updateKategoriRow(row.id, kat.id, 'name', label)
                                    }}
                                  />
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  className="form-input flex-1 text-sm"
                                  value={kat.name}
                                  onChange={e => updateKategoriRow(row.id, kat.id, 'name', e.target.value)}
                                  placeholder="Contoh: Ukuran 12m"
                                />
                              )}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Qty *</label>
                            <input
                              type="number"
                              min={1}
                              className="form-input w-full text-sm"
                              value={kat.qty}
                              onChange={e => updateKategoriRow(row.id, kat.id, 'qty', e.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Satuan</label>
                            <div className="form-input w-full text-sm text-gray-400 bg-white border-gray-200 whitespace-nowrap overflow-hidden text-ellipsis">{selectedItem?.unit ?? '—'}</div>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Catatan</label>
                            <input
                              type="text"
                              className="form-input w-full text-sm"
                              value={kat.notes}
                              onChange={e => updateKategoriRow(row.id, kat.id, 'notes', e.target.value)}
                              placeholder="Opsional"
                            />
                          </div>
                          <div className="col-span-1 flex items-end pb-0.5">
                            <button
                              type="button"
                              onClick={() => removeKategoriRow(row.id, kat.id)}
                              className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-400"
                              title="Hapus kategori"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        )
                      })}

                      <button
                        type="button"
                        onClick={() => addKategoriRow(row.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors mt-1"
                      >
                        <Plus size={12} />
                        Tambah Kategori
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Ringkasan */}
          <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-100">
            <div className="text-xs text-gray-600 font-semibold mb-2">Ringkasan</div>
            {itemRows.map(row => {
              const item = activeItems.find(i => i.id === Number(row.stock_item_id))
              if (!item) return null

              if (row.use_kategorisasi) {
                const filledKat = row.kategorisasi.filter(k => k.name && k.qty)
                if (filledKat.length === 0) return null
                return (
                  <div key={row.id} className="mb-2">
                    <div className="text-xs font-semibold text-gray-700 mb-1">{item.name}</div>
                    {filledKat.map(k => (
                      <div key={k.id} className="flex justify-between text-xs text-gray-600 pl-3 mb-0.5">
                        <span className="text-gray-500">↳ {k.name}</span>
                        <span className="font-bold text-green-700">+{k.qty} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                )
              }

              if (!row.qty) return null
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
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-60 transition-colors"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Stok Masuk'}
          </button>
        </div>
      </div>

      <AddStockItemModal
        open={newItemModal.open}
        existingItems={items}
        isSubmitting={isSubmitting}
        onClose={() => setNewItemModal({ open: false, rowId: null })}
        onCreate={handleCreateNewItem}
        onUpdate={() => {}}
      />
    </DashboardLayout>
  )
}
