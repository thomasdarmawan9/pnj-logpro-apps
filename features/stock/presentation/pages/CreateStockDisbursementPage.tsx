'use client'

import { useState, useEffect } from 'react'
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

interface DisbursementItemRow {
  id: string
  stock_item_id: string
  kategori_name: string | null
  qty: string
}

interface StockOption {
  key: string
  stock_item_id: number
  name: string
  unit: string
  current_stock: number
  kategori_name: string | null
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
    ? customers.find(customer => customer.id === Number(form.customer_id)) || null
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
      .then(response => {
        if (!cancelled) setCustomerAvailableItems(response.data)
      })
      .catch(() => {
        if (!cancelled) setCustomerAvailableItems([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAvailableItems(false)
      })

    return () => { cancelled = true }
  }, [selectedCustomer?.uuid])

  const stockOptions: StockOption[] = selectedCustomer
    ? customerAvailableItems.map(item => ({
        key: `${item.stockItemId}::${item.categoryName ?? ''}`,
        stock_item_id: item.stockItemId,
        name: item.name,
        unit: item.unit,
        current_stock: Number(item.availableQty || 0),
        kategori_name: item.categoryName ?? null,
      }))
    : items
      .filter(i => i.is_active)
      .map(item => ({
        key: `${item.id}::`,
        stock_item_id: item.id,
        name: item.name,
        unit: item.unit,
        current_stock: item.current_stock,
        kategori_name: null,
      }))

  const selectedOptionKeys = itemRows
    .map(r => r.stock_item_id ? `${r.stock_item_id}::${r.kategori_name ?? ''}` : '')
    .filter(Boolean)

  const addRow = () => {
    setItemRows(prev => [...prev, { id: Date.now().toString(), stock_item_id: '', kategori_name: null, qty: '' }])
  }

  const removeRow = (id: string) => {
    if (itemRows.length === 1) return
    setItemRows(prev => prev.filter(r => r.id !== id))
  }

  const updateRow = (id: string, field: keyof DisbursementItemRow, value: string) => {
    setItemRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const updateItemSelection = (id: string, optionKey: string) => {
    const option = stockOptions.find(row => row.key === optionKey)
    setItemRows(prev => prev.map(row => row.id === id
      ? {
          ...row,
          stock_item_id: option ? String(option.stock_item_id) : '',
          kategori_name: option?.kategori_name ?? null,
          qty: '',
        }
      : row
    ))
  }

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: field === 'vehicle_plate' ? value.toUpperCase() : value,
    }))
    if (field === 'customer_id') {
      setItemRows([{ id: '1', stock_item_id: '', kategori_name: null, qty: '' }])
    }
  }

  const getRowValidation = (row: DisbursementItemRow) => {
    const item = stockOptions.find(i => i.key === `${row.stock_item_id}::${row.kategori_name ?? ''}`)
    const qty = Number(row.qty)
    if (!item || !qty || qty <= 0) return null
    return validateDisbursement(item, qty)
  }

  const isValid = () => {
    if (!form.disbursement_date) return false
    if (itemRows.some(r => !r.stock_item_id || !r.qty || Number(r.qty) <= 0)) return false
    if (itemRows.some(r => {
      const v = getRowValidation(r)
      return v && !v.valid
    })) return false
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
        disbursement_date: form.disbursement_date,
        stock_item_id: Number(row.stock_item_id),
        qty: Number(row.qty),
        kategori_name: row.kategori_name,
        delivery_order_id: null,
        sj_number_manual: form.sj_number_manual || null,
        invoice_number_manual: form.invoice_number_manual || null,
        driver_name: form.driver_name || null,
        vehicle_plate: form.vehicle_plate || null,
        destination: form.destination || null,
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        notes: form.notes || null,
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
      {/* Header */}
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
        <>
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
                  const rowKey = row.stock_item_id ? `${row.stock_item_id}::${row.kategori_name ?? ''}` : ''
                  const selectedItem = stockOptions.find(i => i.key === rowKey)
                  const qty = Number(row.qty)
                  const rowValidation = selectedItem && qty > 0 ? validateDisbursement(selectedItem, qty) : null
                  const remainingAfter = selectedItem && qty > 0 && rowValidation?.valid
                    ? selectedItem.current_stock - qty
                    : null
                  const isDuplicate = itemRows.filter(r => r.stock_item_id && `${r.stock_item_id}::${r.kategori_name ?? ''}` === rowKey).length > 1

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

                      <div className="grid grid-cols-12 gap-3 items-start">
                        {/* Item select */}
                        <div className="col-span-7">
                          <label className="block text-xs text-gray-500 mb-1">Pilih Barang *</label>
                          <select
                            className={`form-input w-full text-sm ${isDuplicate ? 'error' : ''}`}
                            value={rowKey}
                            onChange={e => updateItemSelection(row.id, e.target.value)}
                            disabled={isLoadingAvailableItems}
                          >
                            <option value="">{isLoadingAvailableItems ? 'Memuat stok customer...' : '— Pilih Barang —'}</option>
                            {stockOptions.map(item => (
                              <option
                                key={item.key}
                                value={item.key}
                                disabled={selectedOptionKeys.includes(item.key) && item.key !== rowKey}
                              >
                                {item.name}{item.kategori_name ? ` - ${item.kategori_name}` : ''} (Stok: {item.current_stock} {item.unit})
                              </option>
                            ))}
                          </select>
                          {isDuplicate && <p className="text-xs text-red-600 mt-1">Barang sudah dipilih di baris lain</p>}
                          {selectedItem && (
                            <div className="mt-1.5 text-xs text-gray-500">
                              Stok tersedia:&nbsp;
                              <span className={`font-bold font-mono ${selectedItem.current_stock === 0 ? 'text-red-600' : 'text-green-700'}`}
                                style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                {selectedItem.current_stock.toLocaleString('id-ID')} {selectedItem.unit}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Qty */}
                        <div className="col-span-3">
                          <label className="block text-xs text-gray-500 mb-1">Jumlah *</label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={selectedItem?.current_stock}
                              className={`form-input w-full text-sm ${rowValidation && !rowValidation.valid ? 'error' : ''}`}
                              value={row.qty}
                              onChange={e => updateRow(row.id, 'qty', e.target.value)}
                              placeholder="0"
                            />
                            <span className="text-xs text-gray-400 shrink-0">{selectedItem?.unit ?? ''}</span>
                          </div>
                          {rowValidation && !rowValidation.valid && (
                            <div className="flex items-start gap-1 mt-1 text-red-600 text-xs">
                              <AlertCircle size={11} className="mt-0.5 shrink-0" />
                              <span>{rowValidation.message}</span>
                            </div>
                          )}
                        </div>

                        {/* Remaining */}
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Sisa</label>
                          <div className={`form-input text-sm text-center font-mono ${
                            remainingAfter === null ? 'text-gray-300' :
                            remainingAfter === 0 ? 'text-amber-600' :
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
                    const item = stockOptions.find(i => i.key === `${row.stock_item_id}::${row.kategori_name ?? ''}`)
                    if (!item) return null
                    return (
                      <div key={row.id} className="flex justify-between text-xs text-gray-700 mb-1">
                        <span>{item.name}{item.kategori_name ? ` - ${item.kategori_name}` : ''}</span>
                        <span className="font-bold text-red-600">−{row.qty} {item.unit}</span>
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
                  <select
                    className="form-input w-full"
                    value={form.customer_id}
                    onChange={e => handleChange('customer_id', e.target.value)}
                  >
                    <option value="">— Pilih Customer —</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
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
        </>
      </div>
    </DashboardLayout>
  )
}
