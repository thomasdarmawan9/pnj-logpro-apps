'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Trash2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchDisbursementDetail, deleteStockDisbursement, openDeleteConfirm, closeDeleteConfirm, clearSelectedDisbursement } from '@/store/slices/stockSlice'
import { useToast } from '@/components/toast/useToast'
import StockItemBadge from '../components/StockItemBadge'
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal'

interface Props {
  uuid: string
}

export default function DetailStockDisbursementPage({ uuid }: Props) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { selectedDisbursement, isDetailLoading, isSubmitting, modals } = useSelector((state: RootState) => state.stock)

  useEffect(() => {
    dispatch(fetchDisbursementDetail(uuid))
    return () => { dispatch(clearSelectedDisbursement()) }
  }, [dispatch, uuid])

  const handleDelete = async () => {
    const res = await dispatch(deleteStockDisbursement(uuid))
    const { deleteStockDisbursement: deleteThunk } = await import('@/store/slices/stockSlice')
    if (deleteThunk.fulfilled.match(res)) {
      pushToast({ title: 'Data Dihapus', description: 'Stok keluar berhasil dihapus dan stok telah dikembalikan.', variant: 'info' })
      router.push('/stok/keluar')
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

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Stok Keluar / Detail</div>
            <h1 className="text-2xl font-bold">{d.disbursement_number}</h1>
          </div>
        </div>
        <button
          onClick={() => dispatch(openDeleteConfirm({ type: 'disbursement', uuid: d.uuid }))}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium bg-red-600 hover:bg-red-700 transition-colors"
        >
          <Trash2 size={14} />
          Hapus
        </button>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Barang */}
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base mb-4">Barang Keluar</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <StockItemBadge code={d.stock_item.code} />
                <span className="font-semibold text-gray-900">{d.stock_item.name}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-red-600 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                -{d.qty.toLocaleString('id-ID')}
              </div>
              <div className="text-sm text-gray-500">{d.stock_item.unit}</div>
            </div>
          </div>
        </div>

        {/* Info pengiriman */}
        <div className="bg-white rounded-xl border shadow-sm p-5" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base mb-4">Informasi Pengiriman</h2>
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
              <div className="font-medium">{d.sj_number_manual ? `SJ ${d.sj_number_manual}` : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">No. Invoice</div>
              <div className="font-medium">{d.invoice_number_manual ?? '—'}</div>
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
