'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { Plus, Search, Inbox, Eye, Trash2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchStockDisbursements, deleteStockDisbursement, openDeleteConfirm, closeDeleteConfirm } from '@/store/slices/stockSlice'
import { useToast } from '@/components/toast/useToast'
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal'
import StockItemBadge from '../components/StockItemBadge'

export default function StockDisbursementListPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { disbursements, isLoading, isSubmitting, modals } = useSelector((state: RootState) => state.stock)
  const [search, setSearch] = useState('')

  useEffect(() => {
    dispatch(fetchStockDisbursements())
  }, [dispatch])

  const filtered = disbursements.filter(d =>
    d.disbursement_number.toLowerCase().includes(search.toLowerCase()) ||
    (d.driver_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.vehicle_plate ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.destination ?? '').toLowerCase().includes(search.toLowerCase()) ||
    d.stock_item.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async () => {
    if (!modals.deleteConfirm.uuid) return
    const res = await dispatch(deleteStockDisbursement(modals.deleteConfirm.uuid))
    const { deleteStockDisbursement: deleteThunk } = await import('@/store/slices/stockSlice')
    if (deleteThunk.fulfilled.match(res)) {
      pushToast({ title: 'Data Dihapus', description: 'Data stok keluar berhasil dihapus dan stok telah dikembalikan.', variant: 'info' })
    } else {
      pushToast({ title: 'Gagal Menghapus', description: 'Terjadi kesalahan.', variant: 'error' })
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Stok Keluar</div>
          <h1 className="text-2xl font-bold">Daftar Stok Keluar</h1>
        </div>
        <button
          onClick={() => router.push('/stok/keluar/create')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium bg-red-600 hover:bg-red-700 transition-colors"
        >
          <Plus size={16} />
          Tambah Stok Keluar
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          className="form-input w-full pl-8"
          placeholder="Cari nomor, sopir, tujuan, barang..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">No. Pengeluaran</th>
              <th className="px-4 py-3 text-left">Tanggal</th>
              <th className="px-4 py-3 text-left">Barang</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-left">Sopir</th>
              <th className="px-4 py-3 text-left">No. Pol</th>
              <th className="px-4 py-3 text-left">Tujuan</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                {Array.from({ length: 8 }).map((__, j) => (
                  <td key={j} className="px-4 py-4">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <Inbox size={40} className="mx-auto text-gray-200 mb-3" />
                  <div className="text-gray-500 font-medium">Tidak ada data stok keluar</div>
                </td>
              </tr>
            )}
            {!isLoading && filtered.map(d => (
              <tr
                key={d.uuid}
                className="border-t hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-card)' }}
                onClick={() => router.push(`/stok/keluar/${d.uuid}`)}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {d.disbursement_number}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {new Date(d.disbursement_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StockItemBadge code={d.stock_item.code} size="sm" />
                    <span className="text-gray-700 text-xs">{d.stock_item.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-bold text-red-600 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    -{d.qty.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">{d.stock_item.unit}</span>
                </td>
                <td className="px-4 py-3 text-gray-700">{d.driver_name ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {d.vehicle_plate ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{d.destination ?? '—'}</td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => router.push(`/stok/keluar/${d.uuid}`)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                      title="Detail"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => dispatch(openDeleteConfirm({ type: 'disbursement', uuid: d.uuid }))}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-500"
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteConfirmModal
        open={modals.deleteConfirm.open && modals.deleteConfirm.type === 'disbursement'}
        title="Hapus Stok Keluar"
        description="Apakah Anda yakin ingin menghapus data stok keluar ini? Stok barang yang terkait akan dikembalikan."
        isSubmitting={isSubmitting}
        onClose={() => dispatch(closeDeleteConfirm())}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  )
}
