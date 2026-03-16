'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { Plus, Search, Inbox, Eye, Trash2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchStockReceipts, deleteStockReceipt, openDeleteConfirm, closeDeleteConfirm } from '@/store/slices/stockSlice'
import { useToast } from '@/components/toast/useToast'
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal'

export default function StockReceiptListPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { receipts, isLoading, isSubmitting, modals } = useSelector((state: RootState) => state.stock)
  const [search, setSearch] = useState('')

  useEffect(() => {
    dispatch(fetchStockReceipts())
  }, [dispatch])

  const filtered = receipts.filter(r =>
    r.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
    (r.supplier_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.document_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (r.customer?.name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async () => {
    if (!modals.deleteConfirm.uuid) return
    const res = await dispatch(deleteStockReceipt(modals.deleteConfirm.uuid))
    const { deleteStockReceipt: deleteThunk } = await import('@/store/slices/stockSlice')
    if (deleteThunk.fulfilled.match(res)) {
      pushToast({ title: 'Stok Masuk Dihapus', description: 'Data stok masuk berhasil dihapus dan stok telah diperbarui.', variant: 'info' })
    } else {
      pushToast({ title: 'Gagal Menghapus', description: 'Terjadi kesalahan saat menghapus data.', variant: 'error' })
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Stok Masuk</div>
          <h1 className="text-2xl font-bold">Daftar Stok Masuk</h1>
        </div>
        <button
          onClick={() => router.push('/stok/masuk/create')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ backgroundColor: 'var(--green-primary)' }}
        >
          <Plus size={16} />
          Tambah Stok Masuk
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          className="form-input w-full pl-8"
          placeholder="Cari nomor, supplier, SPAL..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">No. Penerimaan</th>
              <th className="px-4 py-3 text-left">Tanggal</th>
              <th className="px-4 py-3 text-left">Supplier</th>
              <th className="px-4 py-3 text-left">No. Dok (SPAL)</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-center">Jml Barang</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
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
                  <Inbox size={40} className="mx-auto text-gray-200 mb-3" />
                  <div className="text-gray-500 font-medium">Tidak ada data stok masuk</div>
                </td>
              </tr>
            )}
            {!isLoading && filtered.map(receipt => (
              <tr
                key={receipt.uuid}
                className="border-t hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-card)' }}
                onClick={() => router.push(`/stok/masuk/${receipt.uuid}`)}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {receipt.receipt_number}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {new Date(receipt.receipt_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">{receipt.supplier_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{receipt.document_number ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{receipt.customer?.name ?? '—'}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    {receipt.items.length} item
                  </span>
                </td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => router.push(`/stok/masuk/${receipt.uuid}`)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                      title="Detail"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => dispatch(openDeleteConfirm({ type: 'receipt', uuid: receipt.uuid }))}
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
        open={modals.deleteConfirm.open && modals.deleteConfirm.type === 'receipt'}
        title="Hapus Stok Masuk"
        description="Apakah Anda yakin ingin menghapus data stok masuk ini? Stok barang yang terkait akan dikurangi kembali."
        isSubmitting={isSubmitting}
        onClose={() => dispatch(closeDeleteConfirm())}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  )
}
