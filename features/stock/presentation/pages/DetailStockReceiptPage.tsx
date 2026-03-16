'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchReceiptDetail, deleteStockReceipt, openDeleteConfirm, closeDeleteConfirm, clearSelectedReceipt } from '@/store/slices/stockSlice'
import { useToast } from '@/components/toast/useToast'
import StockItemBadge from '../components/StockItemBadge'
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal'

interface Props {
  uuid: string
}

export default function DetailStockReceiptPage({ uuid }: Props) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { selectedReceipt, isDetailLoading, isSubmitting, modals } = useSelector((state: RootState) => state.stock)

  useEffect(() => {
    dispatch(fetchReceiptDetail(uuid))
    return () => { dispatch(clearSelectedReceipt()) }
  }, [dispatch, uuid])

  const handleDelete = async () => {
    const res = await dispatch(deleteStockReceipt(uuid))
    const { deleteStockReceipt: deleteThunk } = await import('@/store/slices/stockSlice')
    if (deleteThunk.fulfilled.match(res)) {
      pushToast({ title: 'Data Dihapus', description: 'Stok masuk berhasil dihapus.', variant: 'info' })
      router.push('/stok/masuk')
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

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Stok Masuk / Detail</div>
            <h1 className="text-2xl font-bold">{r.receipt_number}</h1>
          </div>
        </div>
        <button
          onClick={() => dispatch(openDeleteConfirm({ type: 'receipt', uuid: r.uuid }))}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium bg-red-600 hover:bg-red-700 transition-colors"
        >
          <Trash2 size={14} />
          Hapus
        </button>
      </div>

      <div className="max-w-3xl space-y-5">
        {/* Info card */}
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base mb-4">Informasi Penerimaan</h2>
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
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
            <h2 className="font-bold text-base">Daftar Barang Diterima</h2>
          </div>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Kode</th>
                <th className="px-4 py-3 text-left">Nama Barang</th>
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
