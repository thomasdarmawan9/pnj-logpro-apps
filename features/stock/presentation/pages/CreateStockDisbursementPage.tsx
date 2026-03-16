'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchStockItems, createStockDisbursement } from '@/store/slices/stockSlice'
import { useToast } from '@/components/toast/useToast'
import { validateDisbursement } from '@/features/stock/application/validators/StockDisbursementValidator'
import { MOCK_CUSTOMERS } from '@/lib/mockData/stock'

export default function CreateStockDisbursementPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { items, isSubmitting } = useSelector((state: RootState) => state.stock)

  const [mode, setMode] = useState<'manual' | 'from_sj'>('manual')

  const [form, setForm] = useState({
    disbursement_date: new Date().toISOString().split('T')[0],
    stock_item_id: '',
    qty: '',
    driver_name: '',
    vehicle_plate: '',
    destination: '',
    sj_number_manual: '',
    invoice_number_manual: '',
    customer_id: '',
    notes: '',
  })

  useEffect(() => {
    dispatch(fetchStockItems())
  }, [dispatch])

  const activeItems = items.filter(i => i.is_active)
  const selectedItem = activeItems.find(i => i.id === Number(form.stock_item_id))
  const qty = Number(form.qty)
  const validation = selectedItem && qty > 0 ? validateDisbursement(selectedItem, qty) : null
  const remainingAfter = selectedItem && qty > 0 && validation?.valid ? selectedItem.current_stock - qty : null

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: field === 'vehicle_plate' ? value.toUpperCase() : value,
    }))
  }

  const isValid = () => {
    if (!form.disbursement_date || !form.stock_item_id || !form.qty) return false
    if (!validation || !validation.valid) return false
    return true
  }

  const handleSubmit = async () => {
    if (!isValid()) {
      pushToast({ title: 'Form Tidak Lengkap', description: validation?.message || 'Harap isi semua kolom yang wajib.', variant: 'error' })
      return
    }

    const dto = {
      disbursement_date: form.disbursement_date,
      stock_item_id: Number(form.stock_item_id),
      qty,
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
    const { createStockDisbursement: createThunk } = await import('@/store/slices/stockSlice')
    if (createThunk.fulfilled.match(res)) {
      pushToast({ title: 'Stok Keluar Disimpan', description: 'Data pengeluaran stok berhasil disimpan.', variant: 'success' })
      router.push('/stok/keluar')
    } else {
      pushToast({ title: 'Gagal Menyimpan', description: 'Terjadi kesalahan. Silakan coba lagi.', variant: 'error' })
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

      <div className="max-w-2xl space-y-5">
        {/* Mode toggle */}
        <div className="bg-white rounded-xl border shadow-sm p-4 flex gap-2" style={{ borderColor: 'var(--border-card)' }}>
          <button
            onClick={() => setMode('manual')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === 'manual' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
            style={mode === 'manual' ? { backgroundColor: 'var(--green-primary)' } : {}}
          >
            Input Manual
          </button>
          <button
            onClick={() => setMode('from_sj')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === 'from_sj' ? 'text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
            style={mode === 'from_sj' ? { backgroundColor: 'var(--green-primary)' } : {}}
          >
            Dari SJ PNJ
          </button>
        </div>

        {mode === 'from_sj' ? (
          <div className="bg-white rounded-xl border shadow-sm p-8 text-center" style={{ borderColor: 'var(--border-card)' }}>
            <div className="text-4xl mb-3">🚧</div>
            <div className="font-semibold text-gray-700">Fitur Segera Hadir</div>
            <div className="text-sm text-gray-500 mt-1">
              Integrasi dengan Surat Jalan PNJ akan tersedia pada pembaruan berikutnya.
            </div>
          </div>
        ) : (
          <>
            {/* Item selection */}
            <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'var(--border-card)' }}>
              <h2 className="font-bold text-base mb-4">Barang & Jumlah</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Barang <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="form-input w-full"
                    value={form.stock_item_id}
                    onChange={e => handleChange('stock_item_id', e.target.value)}
                  >
                    <option value="">— Pilih Barang —</option>
                    {activeItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.code} — {item.name} (Stok: {item.current_stock} {item.unit})
                      </option>
                    ))}
                  </select>
                  {selectedItem && (
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <span className="text-gray-500">Stok tersedia:</span>
                      <span className={`font-bold font-mono ${selectedItem.current_stock === 0 ? 'text-red-600' : 'text-green-700'}`}
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {selectedItem.current_stock.toLocaleString('id-ID')} {selectedItem.unit}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Jumlah (Qty) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={selectedItem?.current_stock}
                      className={`form-input w-40 ${validation && !validation.valid ? 'error' : ''}`}
                      value={form.qty}
                      onChange={e => handleChange('qty', e.target.value)}
                      placeholder="0"
                    />
                    <span className="text-gray-500 text-sm">{selectedItem?.unit ?? ''}</span>
                  </div>
                  {validation && !validation.valid && (
                    <div className="flex items-start gap-1.5 mt-2 text-red-600 text-xs">
                      <AlertCircle size={12} className="mt-0.5 shrink-0" />
                      <span>{validation.message}</span>
                    </div>
                  )}
                  {remainingAfter !== null && (
                    <div className="mt-2 p-2.5 bg-green-50 rounded-lg border border-green-100 text-xs">
                      <span className="text-gray-600">Sisa setelah keluar: </span>
                      <span className={`font-bold font-mono ${remainingAfter < 0 ? 'text-red-600' : remainingAfter === 0 ? 'text-amber-700' : 'text-green-700'}`}
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {remainingAfter.toLocaleString('id-ID')} {selectedItem?.unit}
                      </span>
                    </div>
                  )}
                </div>
              </div>
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
                    {MOCK_CUSTOMERS.map(c => (
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
          </>
        )}

        {/* Buttons */}
        {mode === 'manual' && (
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Stok Keluar'}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
