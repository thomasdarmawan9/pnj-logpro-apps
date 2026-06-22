'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Pencil, Check, X, Plus } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import {
  fetchReceiptDetail, deleteStockReceipt, updateStockReceipt,
  openDeleteConfirm, closeDeleteConfirm, clearSelectedReceipt, fetchStockItems,
} from '@/store/slices/stockSlice'
import { fetchCustomers } from '@/store/slices/masterSlice'
import { useToast } from '@/components/toast/useToast'
import { apiRequest } from '@/lib/apiClient'
import { UpdateStockReceiptDto } from '@/features/stock/application/dto/CreateStockReceiptDto'
import SearchableSelect from '@/features/invoice/presentation/components/SearchableSelect'
import StockItemBadge from '../components/StockItemBadge'
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal'

interface Props {
  uuid: string
}

interface CategoryOption {
  kategori_name: string | null
  available_qty: number
}

interface ItemRow {
  key: string
  stock_item_id: string
  qty: string
  kategori_name: string | null
  notes: string
}

export default function DetailStockReceiptPage({ uuid }: Props) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { selectedReceipt, isDetailLoading, isSubmitting, modals, items } = useSelector((state: RootState) => state.stock)
  const { customers } = useSelector((state: RootState) => state.master)

  const [isEditing, setIsEditing] = useState(false)
  const [header, setHeader] = useState({
    receipt_date: '',
    supplier_name: '',
    document_number: '',
    customer_id: '',
    notes: '',
  })
  const [rows, setRows] = useState<ItemRow[]>([])
  const [catsByItem, setCatsByItem] = useState<Record<number, CategoryOption[]>>({})

  useEffect(() => {
    dispatch(fetchReceiptDetail(uuid))
    dispatch(fetchStockItems())
    return () => { dispatch(clearSelectedReceipt()) }
  }, [dispatch, uuid])

  useEffect(() => {
    if (!customers.length) dispatch(fetchCustomers())
  }, [dispatch, customers.length])

  const customerUuidById = (id: string): string | undefined =>
    id ? customers.find(c => c.id === Number(id))?.uuid : undefined

  const fetchCats = async (stockItemId: number, customerId: string): Promise<CategoryOption[]> => {
    const it = items.find(i => i.id === stockItemId)
    if (!it) return []
    try {
      const cuuid = customerUuidById(customerId)
      const qs = cuuid ? `?customer_uuid=${cuuid}` : ''
      const res = await apiRequest<{ unit: string; categories: CategoryOption[] }>(`/stock/items/${it.uuid}/categories${qs}`, { method: 'GET' })
      return res.data.categories
    } catch { return [] }
  }

  const loadCatsForItems = async (itemIds: number[], customerId: string) => {
    const unique = [...new Set(itemIds.filter(Boolean))]
    const entries = await Promise.all(unique.map(async id => [id, await fetchCats(id, customerId)] as const))
    setCatsByItem(Object.fromEntries(entries))
  }

  const enterEditMode = async () => {
    const r = selectedReceipt
    if (!r) return
    const custId = r.customer_id ? String(r.customer_id) : ''
    setHeader({
      receipt_date: r.receipt_date.slice(0, 10),
      supplier_name: r.supplier_name ?? '',
      document_number: r.document_number ?? '',
      customer_id: custId,
      notes: r.notes ?? '',
    })
    const initialRows: ItemRow[] = r.items.map((it, idx) => ({
      key: `${it.uuid || idx}`,
      stock_item_id: String(it.stock_item_id),
      qty: String(it.qty),
      kategori_name: it.kategori_name ?? null,
      notes: it.notes ?? '',
    }))
    setRows(initialRows)
    setIsEditing(true)
    await loadCatsForItems(initialRows.map(row => Number(row.stock_item_id)), custId)
  }

  const handleCustomerChange = async (customerId: string) => {
    setHeader(prev => ({ ...prev, customer_id: customerId }))
    await loadCatsForItems(rows.map(row => Number(row.stock_item_id)), customerId)
  }

  const handleItemChange = async (key: string, stockItemId: string) => {
    setRows(prev => prev.map(row => row.key === key ? { ...row, stock_item_id: stockItemId, kategori_name: null } : row))
    const id = Number(stockItemId)
    if (id && !catsByItem[id]) {
      const cats = await fetchCats(id, header.customer_id)
      setCatsByItem(prev => ({ ...prev, [id]: cats }))
    }
  }

  const updateRow = (key: string, field: keyof ItemRow, value: string | null) => {
    setRows(prev => prev.map(row => row.key === key ? { ...row, [field]: value } : row))
  }

  const addRow = () => {
    setRows(prev => [...prev, { key: `new-${Date.now()}`, stock_item_id: '', qty: '', kategori_name: null, notes: '' }])
  }

  const removeRow = (key: string) => {
    setRows(prev => prev.length === 1 ? prev : prev.filter(row => row.key !== key))
  }

  // Opsi jenis barang: master aktif + barang yang sedang dipakai di baris.
  const itemOptions = useMemo(() => {
    const base = items.filter(i => i.is_active).map(i => ({ id: i.id, name: i.name, unit: i.unit }))
    for (const row of rows) {
      const curId = Number(row.stock_item_id)
      if (curId && !base.some(o => o.id === curId)) {
        const it = items.find(i => i.id === curId)
        if (it) base.push({ id: it.id, name: it.name, unit: it.unit })
      }
    }
    return base
  }, [items, rows])

  const handleDelete = async () => {
    const res = await dispatch(deleteStockReceipt(uuid))
    if (deleteStockReceipt.fulfilled.match(res)) {
      pushToast({ title: 'Data Dihapus', description: 'Stok masuk berhasil dihapus.', variant: 'info' })
      router.push('/stok/masuk')
    } else {
      pushToast({ title: 'Gagal Menghapus', description: 'Terjadi kesalahan saat menghapus data.', variant: 'error' })
    }
  }

  const handleSave = async () => {
    if (!header.receipt_date) {
      pushToast({ title: 'Form Tidak Lengkap', description: 'Tanggal penerimaan wajib diisi.', variant: 'error' })
      return
    }
    if (rows.length === 0 || rows.some(row => !row.stock_item_id || !row.qty || Number(row.qty) <= 0)) {
      pushToast({ title: 'Form Tidak Lengkap', description: 'Setiap baris barang harus punya jenis barang dan jumlah yang benar.', variant: 'error' })
      return
    }
    const dto: UpdateStockReceiptDto = {
      receipt_date: header.receipt_date,
      supplier_name: header.supplier_name || null,
      document_number: header.document_number || null,
      customer_id: header.customer_id ? Number(header.customer_id) : null,
      notes: header.notes || null,
      items: rows.map(row => ({
        stock_item_id: Number(row.stock_item_id),
        qty: Number(row.qty),
        kategori_name: row.kategori_name || null,
        notes: row.notes || null,
      })),
    }
    const res = await dispatch(updateStockReceipt({ uuid, dto }))
    if (updateStockReceipt.fulfilled.match(res)) {
      dispatch(fetchStockItems()) // resync stok global setelah perubahan qty/barang
      pushToast({ title: 'Perubahan Disimpan', description: 'Stok masuk berhasil diperbarui dan stok disinkronkan.', variant: 'success' })
      setIsEditing(false)
    } else {
      pushToast({ title: 'Gagal Menyimpan', description: (res.payload as string) || 'Terjadi kesalahan saat menyimpan perubahan.', variant: 'error' })
    }
  }

  if (isDetailLoading || !selectedReceipt) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-7 bg-gray-100 rounded w-48 animate-pulse" />
        </div>
        <div className="max-w-3xl space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border shadow-sm p-5 animate-pulse" style={{ borderColor: 'var(--border-card)' }}>
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    )
  }

  const r = selectedReceipt
  const inputClass = 'form-input w-full text-sm'

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Stok Masuk / {isEditing ? 'Edit' : 'Detail'}</div>
            <h1 className="text-2xl font-bold">{r.receipt_number}</h1>
          </div>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(false)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-60"
              style={{ borderColor: 'var(--border-card)' }}
            >
              <X size={14} />
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-60 transition-colors"
              style={{ backgroundColor: 'var(--green-primary)' }}
            >
              <Check size={14} />
              {isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={enterEditMode}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-green-50"
              style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
            >
              <Pencil size={14} />
              Edit
            </button>
            <button
              onClick={() => dispatch(openDeleteConfirm({ type: 'receipt', uuid: r.uuid }))}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium bg-red-600 hover:bg-red-700 transition-colors"
            >
              <Trash2 size={14} />
              Hapus
            </button>
          </div>
        )}
      </div>

      <div className="max-w-3xl space-y-5">
        {/* Info card */}
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base mb-4">Informasi Penerimaan</h2>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">No. Penerimaan</label>
                <div className="form-input text-sm text-gray-400 bg-gray-100 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{r.receipt_number}</div>
                <p className="mt-1 text-[11px] text-gray-400">Nomor penerimaan tidak dapat diubah.</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tanggal *</label>
                <input type="date" className={inputClass} value={header.receipt_date} onChange={e => setHeader(prev => ({ ...prev, receipt_date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Supplier / Kapal</label>
                <input type="text" className={inputClass} value={header.supplier_name} onChange={e => setHeader(prev => ({ ...prev, supplier_name: e.target.value }))} placeholder="Opsional" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">No. Dokumen (SPAL)</label>
                <input type="text" className={inputClass} value={header.document_number} onChange={e => setHeader(prev => ({ ...prev, document_number: e.target.value }))} placeholder="Contoh: SPAL 141" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Customer</label>
                <SearchableSelect
                  options={customers.map(c => ({ id: c.id, label: c.name }))}
                  value={header.customer_id ? Number(header.customer_id) : null}
                  placeholder="Cari customer..."
                  emptyText="Customer tidak ditemukan"
                  onChange={id => handleCustomerChange(id !== null ? String(id) : '')}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Catatan</label>
                <input type="text" className={inputClass} value={header.notes} onChange={e => setHeader(prev => ({ ...prev, notes: e.target.value }))} placeholder="Opsional" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">No. Penerimaan</div>
                <div className="font-mono font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{r.receipt_number}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Tanggal</div>
                <div className="font-medium">{new Date(r.receipt_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Supplier / Kapal</div>
                <div className="font-medium">{r.supplier_name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">No. Dokumen (SPAL)</div>
                <div className="font-medium">{r.document_number ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Customer</div>
                <div className="font-medium">{r.customer?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Dibuat oleh</div>
                <div className="font-medium">{r.created_by_name}</div>
              </div>
              {r.notes && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-0.5">Catatan</div>
                  <div className="text-gray-700">{r.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="font-bold text-base">Daftar Barang Diterima</h2>
            {isEditing && (
              <button
                onClick={addRow}
                className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl border transition-colors hover:bg-green-50"
                style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
              >
                <Plus size={14} />
                Tambah Baris
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="p-4 space-y-3">
              {rows.map((row, idx) => {
                const named = (catsByItem[Number(row.stock_item_id)] || []).filter(c => c.kategori_name)
                return (
                  <div key={row.key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">Barang {idx + 1}</span>
                      <button
                        onClick={() => removeRow(row.key)}
                        disabled={rows.length === 1}
                        className="p-1 rounded hover:bg-red-100 text-red-400 disabled:opacity-30 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-5">
                        <label className="block text-xs text-gray-500 mb-1">Jenis Barang *</label>
                        <select className={inputClass} value={row.stock_item_id} onChange={e => handleItemChange(row.key, e.target.value)}>
                          <option value="">— Pilih Barang —</option>
                          {itemOptions.map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.name} ({opt.unit})</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs text-gray-500 mb-1">Kategori</label>
                        <select
                          className={inputClass}
                          value={row.kategori_name ?? ''}
                          onChange={e => updateRow(row.key, 'kategori_name', e.target.value || null)}
                          disabled={!row.stock_item_id}
                        >
                          <option value="">— Tanpa Kategori —</option>
                          {named.map(c => (
                            <option key={c.kategori_name} value={c.kategori_name!}>{c.kategori_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Qty *</label>
                        <input type="number" min={0.0001} step={0.0001} className={inputClass} value={row.qty} onChange={e => updateRow(row.key, 'qty', e.target.value)} placeholder="0" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Catatan</label>
                        <input type="text" className={inputClass} value={row.notes} onChange={e => updateRow(row.key, 'notes', e.target.value)} placeholder="Opsional" />
                      </div>
                    </div>
                  </div>
                )
              })}
              <p className="text-[11px] text-gray-400">Hanya bisa memilih barang & kategori yang sudah ada (tidak bisa membuat baru).</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Kode</th>
                  <th className="px-4 py-3 text-left">Nama Barang</th>
                  <th className="px-4 py-3 text-left">Kategori</th>
                  <th className="px-4 py-3 text-right">Qty Diterima</th>
                  <th className="px-4 py-3 text-left">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {r.items.map(item => (
                  <tr key={item.uuid} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                    <td className="px-4 py-3">
                      <StockItemBadge code={item.stock_item.code} />
                    </td>
                    <td className="px-4 py-3 font-medium">{item.stock_item.name}</td>
                    <td className="px-4 py-3">
                      {item.kategori_name ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{item.kategori_name}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-green-700 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        +{item.qty.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{item.stock_item.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{item.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        open={modals.deleteConfirm.open && modals.deleteConfirm.type === 'receipt'}
        title="Hapus Stok Masuk"
        description={`Apakah Anda yakin ingin menghapus penerimaan ${r.receipt_number}? Semua stok dari penerimaan ini akan dikurangi kembali.`}
        isSubmitting={isSubmitting}
        onClose={() => dispatch(closeDeleteConfirm())}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  )
}
