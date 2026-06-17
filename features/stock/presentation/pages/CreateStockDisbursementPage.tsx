'use client'

import { useState, useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertCircle, Plus, Trash2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchStockItems, createStockDisbursement } from '@/store/slices/stockSlice'
import { fetchCustomers } from '@/store/slices/masterSlice'
import { useToast } from '@/components/toast/useToast'
import { validateDisbursement } from '@/features/stock/application/validators/StockDisbursementValidator'
import { apiRequest } from '@/lib/apiClient'
import { CustomerStockAvailableItem } from '@/features/stock/application/use-cases/GetCustomerStockDetail'
import SearchableSelect from '@/features/invoice/presentation/components/SearchableSelect'

interface DisbursementItemRow {
  id: string
  stock_item_id: string
  kategori_name: string | null
  qty: string
}

interface ItemCategoryOption {
  kategori_name: string | null
  available_qty: number
}

export default function CreateStockDisbursementPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { items, isSubmitting } = useSelector((state: RootState) => state.stock)
  const { customers } = useSelector((state: RootState) => state.master)
  const role = useSelector((state: RootState) => state.auth.user?.role ?? null)

  const [form, setForm] = useState({
    disbursement_date: new Date().toISOString().split('T')[0],
    driver_name: '',
    vehicle_plate: '',
    destination: '',
    sj_number_manual: '',
    invoice_number_manual: '',
    customer_id: '',
    notes: '',
  })

  const [itemRows, setItemRows] = useState<DisbursementItemRow[]>([
    { id: '1', stock_item_id: '', kategori_name: null, qty: '' },
  ])
  const [customerAvailableItems, setCustomerAvailableItems] = useState<CustomerStockAvailableItem[]>([])
  const [isLoadingAvailableItems, setIsLoadingAvailableItems] = useState(false)
  const [rowCategories, setRowCategories] = useState<Record<string, ItemCategoryOption[]>>({})
  const [loadingRowCategories, setLoadingRowCategories] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (role === 'admin_finance') {
      pushToast({ title: 'Akses Ditolak', description: 'Anda tidak memiliki akses membuat stok keluar.', variant: 'error' })
      router.replace('/stok')
      return
    }
    dispatch(fetchStockItems())
    if (!customers.length) dispatch(fetchCustomers())
  }, [dispatch, customers.length, role, router, pushToast])

  const selectedCustomer = form.customer_id
    ? customers.find(c => c.id === Number(form.customer_id)) || null
    : null

  useEffect(() => {
    let cancelled = false
    if (!selectedCustomer?.uuid) {
      setCustomerAvailableItems([])
      setIsLoadingAvailableItems(false)
      return
    }

    setIsLoadingAvailableItems(true)
    apiRequest<CustomerStockAvailableItem[]>(`/stock/customers/${selectedCustomer.uuid}/available-items`, { method: 'GET' })
      .then(response => { if (!cancelled) setCustomerAvailableItems(response.data) })
      .catch(() => { if (!cancelled) setCustomerAvailableItems([]) })
      .finally(() => { if (!cancelled) setIsLoadingAvailableItems(false) })

    return () => { cancelled = true }
  }, [selectedCustomer?.uuid])

  // First-dropdown options (unique items)
  const itemSelectOptions = useMemo(() => {
    if (selectedCustomer) {
      const seen = new Map<number, CustomerStockAvailableItem>()
      for (const a of customerAvailableItems) {
        if (!seen.has(a.stockItemId)) seen.set(a.stockItemId, a)
      }
      return Array.from(seen.values()).map(a => {
        const totalAvailable = customerAvailableItems
          .filter(ci => ci.stockItemId === a.stockItemId)
          .reduce((sum, ci) => sum + Number(ci.availableQty || 0), 0)
        return { id: String(a.stockItemId), uuid: a.stockItemUuid, name: a.name, unit: a.unit, current_stock: totalAvailable }
      })
    }
    return items.filter(i => i.is_active).map(i => ({
      id: String(i.id),
      uuid: i.uuid,
      name: i.name,
      unit: i.unit,
      current_stock: i.current_stock,
    }))
  }, [selectedCustomer, customerAvailableItems, items])

  const handleItemSelect = async (rowId: string, itemId: string) => {
    setItemRows(prev => prev.map(r => r.id === rowId
      ? { ...r, stock_item_id: itemId, kategori_name: null, qty: '' }
      : r
    ))
    setRowCategories(prev => ({ ...prev, [rowId]: [] }))

    if (!itemId) return

    if (selectedCustomer) {
      const numId = Number(itemId)
      const cats: ItemCategoryOption[] = customerAvailableItems
        .filter(a => a.stockItemId === numId)
        .map(a => ({ kategori_name: a.categoryName ?? null, available_qty: Number(a.availableQty || 0) }))
      setRowCategories(prev => ({ ...prev, [rowId]: cats }))
    } else {
      const stockItem = items.find(i => String(i.id) === itemId)
      if (!stockItem) return
      setLoadingRowCategories(prev => ({ ...prev, [rowId]: true }))
      try {
        const res = await apiRequest<{ unit: string; categories: ItemCategoryOption[] }>(
          `/stock/items/${stockItem.uuid}/categories`, { method: 'GET' }
        )
        setRowCategories(prev => ({ ...prev, [rowId]: res.data.categories }))
      } catch {
        setRowCategories(prev => ({ ...prev, [rowId]: [] }))
      } finally {
        setLoadingRowCategories(prev => ({ ...prev, [rowId]: false }))
      }
    }
  }

  const updateRow = (id: string, field: keyof DisbursementItemRow, value: string | null) => {
    setItemRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const addRow = () => {
    setItemRows(prev => [...prev, { id: Date.now().toString(), stock_item_id: '', kategori_name: null, qty: '' }])
  }

  const removeRow = (id: string) => {
    if (itemRows.length === 1) return
    setItemRows(prev => prev.filter(r => r.id !== id))
    setRowCategories(prev => { const next = { ...prev }; delete next[id]; return next })
  }

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: field === 'vehicle_plate' ? value.toUpperCase() : value,
    }))
    if (field === 'customer_id') {
      setItemRows([{ id: '1', stock_item_id: '', kategori_name: null, qty: '' }])
      setRowCategories({})
    }
  }

  const getAvailableForRow = (row: DisbursementItemRow): number | null => {
    if (!row.stock_item_id) return null
    if (selectedCustomer) {
      const catOpts = rowCategories[row.id] || []
      const match = catOpts.find(c => c.kategori_name === row.kategori_name)
      return match?.available_qty ?? null
    }
    const item = items.find(i => String(i.id) === row.stock_item_id)
    return item?.current_stock ?? null
  }

  const getRowValidation = (row: DisbursementItemRow) => {
    const qty = Number(row.qty)
    if (!row.stock_item_id || !qty || qty <= 0) return null
    const available = getAvailableForRow(row)
    if (available === null) return null
    if (selectedCustomer) {
      if (qty > available) {
        const item = itemSelectOptions.find(i => i.id === row.stock_item_id)
        return { valid: false, message: `Stok customer tidak mencukupi. Tersedia: ${available} ${item?.unit ?? ''}, diminta: ${qty} ${item?.unit ?? ''}` }
      }
      return { valid: true, message: '' }
    }
    const stockItem = items.find(i => String(i.id) === row.stock_item_id)
    if (!stockItem) return null
    return validateDisbursement(stockItem, qty)
  }

  const isValid = () => {
    if (!form.disbursement_date) return false
    if (itemRows.some(r => !r.stock_item_id || !r.qty || Number(r.qty) <= 0)) return false
    if (itemRows.some(r => { const v = getRowValidation(r); return v && !v.valid })) return false
    const keys = itemRows.map(r => `${r.stock_item_id}::${r.kategori_name ?? ''}`)
    if (new Set(keys).size !== keys.length) return false
    return true
  }

  const handleSubmit = async () => {
    if (!isValid()) {
      pushToast({ title: 'Form Tidak Lengkap', description: 'Harap isi semua kolom dan pastikan stok mencukupi.', variant: 'error' })
      return
    }

    const { createStockDisbursement: createThunk } = await import('@/store/slices/stockSlice')
    let allSuccess = true

    for (const row of itemRows) {
      const dto = {
        disbursement_date:     form.disbursement_date,
        stock_item_id:         Number(row.stock_item_id),
        qty:                   Number(row.qty),
        kategori_name:         row.kategori_name,
        delivery_order_id:     null,
        sj_number_manual:      form.sj_number_manual || null,
        invoice_number_manual: form.invoice_number_manual || null,
        driver_name:           form.driver_name || null,
        vehicle_plate:         form.vehicle_plate || null,
        destination:           form.destination || null,
        customer_id:           form.customer_id ? Number(form.customer_id) : null,
        notes:                 form.notes || null,
      }
      const res = await dispatch(createStockDisbursement(dto))
      if (!createThunk.fulfilled.match(res)) allSuccess = false
    }

    if (allSuccess) {
      pushToast({ title: 'Stok Keluar Disimpan', description: `${itemRows.length} barang berhasil dicatat keluar.`, variant: 'success' })
      router.push('/stok/keluar')
    } else {
      pushToast({ title: 'Sebagian Gagal', description: 'Ada data yang gagal disimpan. Silakan coba lagi.', variant: 'error' })
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Stok Keluar / Baru</div>
          <h1 className="text-2xl font-bold">Tambah Stok Keluar</h1>
        </div>
      </div>

      <div className="max-w-3xl space-y-5">
        {/* Item rows */}
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'var(--border-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base">Barang & Jumlah</h2>
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl border transition-colors hover:bg-red-50"
              style={{ borderColor: '#EF4444', color: '#EF4444' }}
            >
              <Plus size={14} />
              Tambah Baris
            </button>
          </div>

          <div className="space-y-3">
            {itemRows.map((row, idx) => {
              const rowKey       = `${row.stock_item_id}::${row.kategori_name ?? ''}`
              const isDuplicate  = row.stock_item_id
                ? itemRows.filter(r => `${r.stock_item_id}::${r.kategori_name ?? ''}` === rowKey).length > 1
                : false
              const selectedOpt  = itemSelectOptions.find(i => i.id === row.stock_item_id)
              const catOpts      = rowCategories[row.id] || []
              const namedCats    = catOpts.filter(c => c.kategori_name)
              const isLoadingCat = loadingRowCategories[row.id] ?? false
              const available    = getAvailableForRow(row)
              const qty          = Number(row.qty)
              const validation   = row.stock_item_id && qty > 0 ? getRowValidation(row) : null
              const remainingAfter = available !== null && qty > 0 && (validation?.valid !== false)
                ? available - qty
                : null

              return (
                <div
                  key={row.id}
                  className={`p-4 rounded-xl border space-y-3 ${isDuplicate ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Barang {idx + 1}</span>
                    <button
                      onClick={() => removeRow(row.id)}
                      disabled={itemRows.length === 1}
                      className="p-1 rounded hover:bg-red-100 text-red-400 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Row 1: Barang + Kategori */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Pilih Barang */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Pilih Barang *</label>
                      <select
                        className={`form-input w-full text-sm ${isDuplicate ? 'error' : ''}`}
                        value={row.stock_item_id}
                        onChange={e => handleItemSelect(row.id, e.target.value)}
                        disabled={isLoadingAvailableItems}
                      >
                        <option value="">
                          {isLoadingAvailableItems ? 'Memuat stok customer...' : '— Pilih Barang —'}
                        </option>
                        {itemSelectOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name} (Stok: {opt.current_stock.toLocaleString('id-ID')} {opt.unit})
                          </option>
                        ))}
                      </select>
                      {selectedOpt && (
                        <div className="mt-1 text-xs text-gray-500">
                          Stok tersedia:&nbsp;
                          <span className={`font-bold font-mono ${selectedOpt.current_stock === 0 ? 'text-red-600' : 'text-green-700'}`}
                            style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {selectedOpt.current_stock.toLocaleString('id-ID')} {selectedOpt.unit}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pilih Kategori */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Kategori</label>
                      {!row.stock_item_id ? (
                        <div className="form-input text-sm text-gray-400 cursor-not-allowed">Pilih barang dulu</div>
                      ) : isLoadingCat ? (
                        <div className="form-input text-sm text-gray-400">Memuat kategori...</div>
                      ) : (
                        <select
                          className="form-input w-full text-sm"
                          value={row.kategori_name ?? ''}
                          onChange={e => updateRow(row.id, 'kategori_name', e.target.value || null)}
                        >
                          <option value="">— Tanpa Kategori —</option>
                          {namedCats.map(c => (
                            <option key={c.kategori_name} value={c.kategori_name!}>
                              {c.kategori_name} ({c.available_qty.toLocaleString('id-ID')} {selectedOpt?.unit ?? ''})
                            </option>
                          ))}
                        </select>
                      )}
                      {row.kategori_name && (() => {
                        const catMatch = catOpts.find(c => c.kategori_name === row.kategori_name)
                        return catMatch ? (
                          <div className="mt-1 text-xs text-gray-500">
                            Tersedia kategori ini:&nbsp;
                            <span className={`font-bold font-mono ${catMatch.available_qty === 0 ? 'text-red-600' : 'text-blue-700'}`}
                              style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {catMatch.available_qty.toLocaleString('id-ID')} {selectedOpt?.unit ?? ''}
                            </span>
                          </div>
                        ) : null
                      })()}
                      {isDuplicate && <p className="text-xs text-red-600 mt-1">Kombinasi barang+kategori sudah dipilih di baris lain</p>}
                    </div>
                  </div>

                  {/* Row 2: Qty + Sisa */}
                  <div className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-5">
                      <label className="block text-xs text-gray-500 mb-1">Jumlah *</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0.0001}
                          step={0.0001}
                          disabled={!row.stock_item_id}
                          className={`form-input w-full text-sm ${validation && !validation.valid ? 'error' : ''}`}
                          value={row.qty}
                          onChange={e => updateRow(row.id, 'qty', e.target.value)}
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-400 shrink-0">{selectedOpt?.unit ?? ''}</span>
                      </div>
                      {validation && !validation.valid && (
                        <div className="flex items-start gap-1 mt-1 text-red-600 text-xs">
                          <AlertCircle size={11} className="mt-0.5 shrink-0" />
                          <span>{validation.message}</span>
                        </div>
                      )}
                    </div>

                    <div className="col-span-3">
                      <label className="block text-xs text-gray-500 mb-1">Sisa Setelah</label>
                      <div className={`form-input text-sm text-center font-mono ${
                        remainingAfter === null ? 'text-gray-300' :
                        remainingAfter === 0    ? 'text-amber-600' :
                        remainingAfter < 0      ? 'text-red-600' :
                        'text-green-700'
                      }`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {remainingAfter !== null ? remainingAfter.toLocaleString('id-ID') : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Ringkasan */}
          {itemRows.some(r => r.stock_item_id && r.qty && Number(r.qty) > 0) && (
            <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="text-xs font-semibold text-gray-600 mb-2">Ringkasan Keluar</div>
              {itemRows.filter(r => r.stock_item_id && r.qty && Number(r.qty) > 0).map(row => {
                const opt = itemSelectOptions.find(i => i.id === row.stock_item_id)
                if (!opt) return null
                return (
                  <div key={row.id} className="flex justify-between text-xs text-gray-700 mb-1">
                    <span>{opt.name}{row.kategori_name ? ` — ${row.kategori_name}` : ''}</span>
                    <span className="font-bold text-red-600">−{row.qty} {opt.unit}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Delivery info */}
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base mb-4">Informasi Pengiriman</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tanggal Keluar <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="form-input w-full"
                value={form.disbursement_date}
                onChange={e => handleChange('disbursement_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer</label>
              <SearchableSelect
                options={customers.map(c => ({ id: c.id, label: c.name }))}
                value={form.customer_id ? Number(form.customer_id) : null}
                placeholder="Cari customer..."
                emptyText="Customer tidak ditemukan"
                onChange={id => handleChange('customer_id', id !== null ? String(id) : '')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Sopir</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Contoh: Wawan"
                value={form.driver_name}
                onChange={e => handleChange('driver_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Polisi Kendaraan</label>
              <input
                type="text"
                className="form-input w-full font-mono uppercase"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
                placeholder="Contoh: KB 8693 HC"
                value={form.vehicle_plate}
                onChange={e => handleChange('vehicle_plate', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tujuan Pengiriman</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Contoh: Desa Nyin, Kab Landak"
                value={form.destination}
                onChange={e => handleChange('destination', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">No. SJ (Manual)</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Contoh: 354"
                value={form.sj_number_manual}
                onChange={e => handleChange('sj_number_manual', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">No. Invoice</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Contoh: 2650"
                value={form.invoice_number_manual}
                onChange={e => handleChange('invoice_number_manual', e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan</label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="Opsional"
                value={form.notes}
                onChange={e => handleChange('notes', e.target.value)}
              />
            </div>
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
            className="px-5 py-2.5 text-sm font-medium text-white rounded-xl disabled:opacity-60 transition-colors bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? 'Menyimpan...' : `Simpan Stok Keluar (${itemRows.length} barang)`}
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
