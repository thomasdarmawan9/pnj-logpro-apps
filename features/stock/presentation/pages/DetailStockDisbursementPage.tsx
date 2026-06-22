'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Pencil, Check, X } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import {
  fetchDisbursementDetail, deleteStockDisbursement, updateStockDisbursement,
  openDeleteConfirm, closeDeleteConfirm, clearSelectedDisbursement, fetchStockItems,
} from '@/store/slices/stockSlice'
import { fetchCustomers } from '@/store/slices/masterSlice'
import { useToast } from '@/components/toast/useToast'
import { apiRequest } from '@/lib/apiClient'
import { CustomerStockAvailableItem } from '@/features/stock/application/use-cases/GetCustomerStockDetail'
import { CreateStockDisbursementDto } from '@/features/stock/application/dto/CreateStockDisbursementDto'
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

export default function DetailStockDisbursementPage({ uuid }: Props) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { selectedDisbursement, isDetailLoading, isSubmitting, modals, items } = useSelector((state: RootState) => state.stock)
  const { customers } = useSelector((state: RootState) => state.master)

  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState({
    disbursement_date: '',
    stock_item_id: '',
    qty: '',
    kategori_name: null as string | null,
    customer_id: '',
    driver_name: '',
    vehicle_plate: '',
    destination: '',
    sj_number_manual: '',
    invoice_number_manual: '',
    notes: '',
  })
  const [availableItems, setAvailableItems] = useState<CustomerStockAvailableItem[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [isLoadingCats, setIsLoadingCats] = useState(false)

  useEffect(() => {
    dispatch(fetchDisbursementDetail(uuid))
    dispatch(fetchStockItems())
    return () => { dispatch(clearSelectedDisbursement()) }
  }, [dispatch, uuid])

  useEffect(() => {
    if (!customers.length) dispatch(fetchCustomers())
  }, [dispatch, customers.length])

  const customerUuidById = (id: string): string | undefined =>
    id ? customers.find(c => c.id === Number(id))?.uuid : undefined

  const loadAvailableItems = async (customerId: string) => {
    const cuuid = customerUuidById(customerId)
    if (!cuuid) { setAvailableItems([]); return }
    try {
      const res = await apiRequest<CustomerStockAvailableItem[]>(`/stock/customers/${cuuid}/available-items`, { method: 'GET' })
      setAvailableItems(res.data)
    } catch { setAvailableItems([]) }
  }

  const loadCategories = async (stockItemId: string, customerId: string) => {
    const it = items.find(i => i.id === Number(stockItemId))
    if (!it) { setCategories([]); return }
    setIsLoadingCats(true)
    try {
      const cuuid = customerUuidById(customerId)
      const qs = cuuid ? `?customer_uuid=${cuuid}` : ''
      const res = await apiRequest<{ unit: string; categories: CategoryOption[] }>(`/stock/items/${it.uuid}/categories${qs}`, { method: 'GET' })
      setCategories(res.data.categories)
    } catch { setCategories([]) }
    finally { setIsLoadingCats(false) }
  }

  const enterEditMode = async () => {
    const d = selectedDisbursement
    if (!d) return
    const next = {
      disbursement_date: d.disbursement_date.slice(0, 10),
      stock_item_id: String(d.stock_item_id),
      qty: String(d.qty),
      kategori_name: d.kategori_name ?? null,
      customer_id: d.customer_id ? String(d.customer_id) : '',
      driver_name: d.driver_name ?? '',
      vehicle_plate: d.vehicle_plate ?? '',
      destination: d.destination ?? '',
      sj_number_manual: d.sj_number_manual ?? '',
      invoice_number_manual: d.invoice_number_manual ?? '',
      notes: d.notes ?? '',
    }
    setForm(next)
    setIsEditing(true)
    await Promise.all([
      loadAvailableItems(next.customer_id),
      loadCategories(next.stock_item_id, next.customer_id),
    ])
  }

  const handleCustomerChange = async (customerId: string) => {
    setForm(prev => ({ ...prev, customer_id: customerId }))
    await loadAvailableItems(customerId)
    // re-scope kategori untuk item terpilih ke customer baru
    await loadCategories(form.stock_item_id, customerId)
  }

  const handleItemChange = async (stockItemId: string) => {
    setForm(prev => ({ ...prev, stock_item_id: stockItemId, kategori_name: null }))
    await loadCategories(stockItemId, form.customer_id)
  }

  // Opsi jenis barang: dari stok customer (kalau ada), kalau tidak dari master aktif.
  // Selalu sertakan item yang sedang terpilih agar tetap bisa dipertahankan.
  const itemOptions = useMemo(() => {
    let base: { id: number; name: string; unit: string }[]
    if (form.customer_id) {
      const seen = new Map<number, { id: number; name: string; unit: string }>()
      for (const a of availableItems) {
        if (!seen.has(a.stockItemId)) seen.set(a.stockItemId, { id: a.stockItemId, name: a.name, unit: a.unit })
      }
      base = Array.from(seen.values())
    } else {
      base = items.filter(i => i.is_active).map(i => ({ id: i.id, name: i.name, unit: i.unit }))
    }
    const curId = Number(form.stock_item_id)
    if (curId && !base.some(o => o.id === curId)) {
      const it = items.find(i => i.id === curId)
      if (it) base.push({ id: it.id, name: it.name, unit: it.unit })
    }
    return base
  }, [form.customer_id, form.stock_item_id, availableItems, items])

  const namedCategories = categories.filter(c => c.kategori_name)

  const handleDelete = async () => {
    const res = await dispatch(deleteStockDisbursement(uuid))
    if (deleteStockDisbursement.fulfilled.match(res)) {
      pushToast({ title: 'Data Dihapus', description: 'Stok keluar berhasil dihapus dan stok telah dikembalikan.', variant: 'info' })
      router.push('/stok/keluar')
    } else {
      pushToast({ title: 'Gagal Menghapus', description: 'Terjadi kesalahan saat menghapus data.', variant: 'error' })
    }
  }

  const handleSave = async () => {
    if (!form.stock_item_id || !form.qty || Number(form.qty) <= 0) {
      pushToast({ title: 'Form Tidak Lengkap', description: 'Barang dan jumlah wajib diisi dengan benar.', variant: 'error' })
      return
    }
    const dto: Partial<CreateStockDisbursementDto> = {
      disbursement_date: form.disbursement_date,
      stock_item_id: Number(form.stock_item_id),
      qty: Number(form.qty),
      kategori_name: form.kategori_name || null,
      sj_number_manual: form.sj_number_manual || null,
      invoice_number_manual: form.invoice_number_manual || null,
      driver_name: form.driver_name || null,
      vehicle_plate: form.vehicle_plate || null,
      destination: form.destination || null,
      customer_id: form.customer_id ? Number(form.customer_id) : null,
      notes: form.notes || null,
    }
    const res = await dispatch(updateStockDisbursement({ uuid, dto }))
    if (updateStockDisbursement.fulfilled.match(res)) {
      dispatch(fetchStockItems()) // resync stok global setelah perubahan qty/barang
      pushToast({ title: 'Perubahan Disimpan', description: 'Stok keluar berhasil diperbarui dan stok disinkronkan.', variant: 'success' })
      setIsEditing(false)
    } else {
      pushToast({ title: 'Gagal Menyimpan', description: (res.payload as string) || 'Terjadi kesalahan saat menyimpan perubahan.', variant: 'error' })
    }
  }

  if (isDetailLoading || !selectedDisbursement) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-7 bg-gray-100 rounded w-48 animate-pulse" />
        </div>
        <div className="max-w-2xl space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border shadow-sm p-5 animate-pulse" style={{ borderColor: 'var(--border-card)' }}>
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((__, j) => (
                  <div key={j} className="h-4 bg-gray-100 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    )
  }

  const d = selectedDisbursement
  const isAuto = d.source_type === 'sj_auto'
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
            <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Stok Keluar / {isEditing ? 'Edit' : 'Detail'}</div>
            <h1 className="text-2xl font-bold">{d.disbursement_number}</h1>
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
            {!isAuto && (
              <button
                onClick={enterEditMode}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors hover:bg-green-50"
                style={{ borderColor: 'var(--green-primary)', color: 'var(--green-primary)' }}
              >
                <Pencil size={14} />
                Edit
              </button>
            )}
            <button
              onClick={() => dispatch(openDeleteConfirm({ type: 'disbursement', uuid: d.uuid }))}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium bg-red-600 hover:bg-red-700 transition-colors"
            >
              <Trash2 size={14} />
              Hapus
            </button>
          </div>
        )}
      </div>

      {isAuto && !isEditing && (
        <div className="max-w-2xl mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Stok keluar ini dibuat otomatis dari Surat Jalan, sehingga tidak dapat diedit langsung di sini.
        </div>
      )}

      <div className="max-w-2xl space-y-5">
        {/* Barang */}
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base mb-4">Barang Keluar</h2>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Jenis Barang *</label>
                <select
                  className={inputClass}
                  value={form.stock_item_id}
                  onChange={e => handleItemChange(e.target.value)}
                >
                  <option value="">— Pilih Barang —</option>
                  {itemOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name} ({opt.unit})</option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-gray-400">Hanya bisa memilih barang yang sudah ada pada customer ini.</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Kategori</label>
                {isLoadingCats ? (
                  <div className="form-input text-sm text-gray-400">Memuat kategori...</div>
                ) : (
                  <select
                    className={inputClass}
                    value={form.kategori_name ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, kategori_name: e.target.value || null }))}
                    disabled={!form.stock_item_id}
                  >
                    <option value="">— Tanpa Kategori —</option>
                    {namedCategories.map(c => (
                      <option key={c.kategori_name} value={c.kategori_name!}>{c.kategori_name}</option>
                    ))}
                  </select>
                )}
                <p className="mt-1 text-[11px] text-gray-400">Hanya kategori yang sudah ada (tidak bisa membuat baru).</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Jumlah Keluar *</label>
                <input
                  type="number"
                  min={0.0001}
                  step={0.0001}
                  className={inputClass}
                  value={form.qty}
                  onChange={e => setForm(prev => ({ ...prev, qty: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <StockItemBadge code={d.stock_item.code} />
                  <span className="font-semibold text-gray-900">{d.stock_item.name}</span>
                </div>
                <div className="mt-1">
                  <span className="text-xs text-gray-500 mr-1">Kategori:</span>
                  {d.kategori_name ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{d.kategori_name}</span>
                  ) : (
                    <span className="text-xs text-gray-400">Tanpa Kategori</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-red-600 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  -{d.qty.toLocaleString('id-ID')}
                </div>
                <div className="text-sm text-gray-500">{d.stock_item.unit}</div>
              </div>
            </div>
          )}
        </div>

        {/* Info pengiriman */}
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base mb-4">Informasi Pengiriman</h2>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">No. Pengeluaran</label>
                <div className="form-input text-sm text-gray-400 bg-gray-100 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{d.disbursement_number}</div>
                <p className="mt-1 text-[11px] text-gray-400">Nomor pengeluaran tidak dapat diubah.</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tanggal Keluar *</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.disbursement_date}
                  onChange={e => setForm(prev => ({ ...prev, disbursement_date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Customer</label>
                <SearchableSelect
                  options={customers.map(c => ({ id: c.id, label: c.name }))}
                  value={form.customer_id ? Number(form.customer_id) : null}
                  placeholder="Cari customer..."
                  emptyText="Customer tidak ditemukan"
                  onChange={id => handleCustomerChange(id !== null ? String(id) : '')}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nama Sopir</label>
                <input type="text" className={inputClass} value={form.driver_name} onChange={e => setForm(prev => ({ ...prev, driver_name: e.target.value }))} placeholder="Contoh: Wawan" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">No. Polisi Kendaraan</label>
                <input type="text" className={`${inputClass} font-mono uppercase`} style={{ fontFamily: 'JetBrains Mono, monospace' }} value={form.vehicle_plate} onChange={e => setForm(prev => ({ ...prev, vehicle_plate: e.target.value.toUpperCase() }))} placeholder="Contoh: KB 8693 HC" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Tujuan Pengiriman</label>
                <input type="text" className={inputClass} value={form.destination} onChange={e => setForm(prev => ({ ...prev, destination: e.target.value }))} placeholder="Contoh: Desa Nyin, Kab Landak" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">No. SJ (Manual)</label>
                <input type="text" className={inputClass} value={form.sj_number_manual} onChange={e => setForm(prev => ({ ...prev, sj_number_manual: e.target.value }))} placeholder="Contoh: 354" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">No. Invoice</label>
                <input type="text" className={inputClass} value={form.invoice_number_manual} onChange={e => setForm(prev => ({ ...prev, invoice_number_manual: e.target.value }))} placeholder="Contoh: 2650" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Catatan</label>
                <input type="text" className={inputClass} value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Opsional" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">No. Pengeluaran</div>
                <div className="font-mono font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{d.disbursement_number}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Tanggal</div>
                <div className="font-medium">{new Date(d.disbursement_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Sopir</div>
                <div className="font-medium">{d.driver_name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">No. Polisi</div>
                <div className="font-mono font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{d.vehicle_plate ?? '—'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-gray-500 mb-0.5">Tujuan</div>
                <div className="font-medium">{d.destination ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">No. SJ</div>
                <div className="font-medium">{d.delivery_order?.sj_number || d.sj_number_manual || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">No. Invoice</div>
                <div className="font-medium">{d.delivery_order?.invoice?.invoice_number || d.invoice_number_manual || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Customer</div>
                <div className="font-medium">{d.customer?.name ?? '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">Dibuat oleh</div>
                <div className="font-medium">{d.created_by_name}</div>
              </div>
              {d.notes && (
                <div className="col-span-2">
                  <div className="text-xs text-gray-500 mb-0.5">Catatan</div>
                  <div className="text-gray-700">{d.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        open={modals.deleteConfirm.open && modals.deleteConfirm.type === 'disbursement'}
        title="Hapus Stok Keluar"
        description={`Apakah Anda yakin ingin menghapus pengeluaran ${d.disbursement_number}? Stok akan dikembalikan sebesar ${d.qty} ${d.stock_item.unit}.`}
        isSubmitting={isSubmitting}
        onClose={() => dispatch(closeDeleteConfirm())}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  )
}
