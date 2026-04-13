'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Plus, Search, Package, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchStockItems, updateStockItem, openAddItemModal, closeAddItemModal, openEditItemModal, closeEditItemModal } from '@/store/slices/stockSlice'
import { useToast } from '@/components/toast/useToast'
import AddStockItemModal from '../components/modals/AddStockItemModal'
import StockItemBadge from '../components/StockItemBadge'

export default function StockItemListPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { items, isLoading, isSubmitting, modals } = useSelector((state: RootState) => state.stock)
  const [search, setSearch] = useState('')

  useEffect(() => {
    dispatch(fetchStockItems())
  }, [dispatch])

  const filtered = items.filter(item =>
    item.code.toLowerCase().includes(search.toLowerCase()) ||
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggleActive = async (uuid: string, currentActive: boolean) => {
    const res = await dispatch(updateStockItem({ uuid, dto: { is_active: !currentActive } }))
    const { updateStockItem: updateThunk } = await import('@/store/slices/stockSlice')
    if (updateThunk.fulfilled.match(res)) {
      pushToast({
        title: currentActive ? 'Barang Dinonaktifkan' : 'Barang Diaktifkan',
        description: currentActive ? 'Barang tidak akan muncul di form transaksi.' : 'Barang kembali aktif.',
        variant: 'info',
      })
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Master Barang</div>
          <h1 className="text-2xl font-bold">Master Barang</h1>
        </div>
        <button
          onClick={() => dispatch(openAddItemModal())}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          <Plus size={16} />
          Tambah Barang
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          className="form-input w-full pl-8"
          placeholder="Cari kode atau nama barang..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left w-8" />
              <th className="px-4 py-3 text-left">Kode</th>
              <th className="px-4 py-3 text-left">Nama Barang</th>
              <th className="px-4 py-3 text-left">Satuan</th>
              <th className="px-4 py-3 text-right">Stok Saat Ini</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <td key={j} className="px-4 py-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}

            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <Package size={40} className="mx-auto text-gray-200 mb-3" />
                  <div className="text-gray-500 font-medium">Tidak ada barang ditemukan</div>
                  <button
                    onClick={() => dispatch(openAddItemModal())}
                    className="mt-2 text-sm font-semibold"
                    style={{ color: 'var(--green-primary)' }}
                  >
                    Tambah Barang Baru &rarr;
                  </button>
                </td>
              </tr>
            )}

            {!isLoading && filtered.map(item => (
              <tr
                key={item.uuid}
                className={`border-t transition-colors hover:bg-gray-50 ${!item.is_active ? 'opacity-50' : ''}`}
                style={{ borderColor: 'var(--border-card)' }}
              >
                <td className="px-4 py-3" />
                <td className="px-4 py-3">
                  <StockItemBadge code={item.code} />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{item.name}</div>
                  {item.description && <div className="text-[11px] text-gray-400 mt-0.5">{item.description}</div>}
                </td>
                <td className="px-4 py-3 text-gray-600">{item.unit}</td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`font-bold font-mono text-base ${
                      item.current_stock === 0 ? 'text-red-600' :
                      item.peak_stock > 0 && item.current_stock / item.peak_stock < 0.2 ? 'text-amber-700' :
                      'text-green-700'
                    }`}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {item.current_stock.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">{item.unit}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => dispatch(openEditItemModal(item))}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(item.uuid, item.is_active)}
                      className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors ${item.is_active ? 'text-green-600' : 'text-gray-400'}`}
                      title={item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {item.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      <AddStockItemModal
        open={modals.addItem}
        existingItems={items}
        isSubmitting={isSubmitting}
        onClose={() => dispatch(closeAddItemModal())}
        onCreate={async (dto) => {
          const { createStockItem } = await import('@/store/slices/stockSlice')
          const res = await dispatch(createStockItem(dto))
          if (createStockItem.fulfilled.match(res)) {
            pushToast({ title: 'Barang Ditambahkan', description: `${dto.name} berhasil ditambahkan.`, variant: 'success' })
          }
        }}
        onUpdate={async (uuid, dto) => {
          const res = await dispatch(updateStockItem({ uuid, dto }))
          const { updateStockItem: updateThunk } = await import('@/store/slices/stockSlice')
          if (updateThunk.fulfilled.match(res)) {
            pushToast({ title: 'Berhasil Disimpan', description: 'Data barang berhasil diperbarui.', variant: 'success' })
          }
        }}
      />
      <AddStockItemModal
        open={modals.editItem.open}
        editingItem={modals.editItem.item}
        existingItems={items}
        isSubmitting={isSubmitting}
        onClose={() => dispatch(closeEditItemModal())}
        onCreate={async () => {}}
        onUpdate={async (uuid, dto) => {
          const res = await dispatch(updateStockItem({ uuid, dto }))
          const { updateStockItem: updateThunk } = await import('@/store/slices/stockSlice')
          if (updateThunk.fulfilled.match(res)) {
            pushToast({ title: 'Berhasil Disimpan', description: 'Data barang berhasil diperbarui.', variant: 'success' })
          }
        }}
      />
    </DashboardLayout>
  )
}
