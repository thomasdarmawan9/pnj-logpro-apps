'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Pencil, Trash2, X } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { apiRequest } from '@/lib/apiClient'
import { formatDate } from '@/lib/formatters'
import { useToast } from '@/components/toast/useToast'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import StockItemBadge from '../components/StockItemBadge'
import { CustomerStockCategoryRow, CustomerStockItemRow, CustomerStockTransactionRow } from '../../application/use-cases/GetCustomerStockDetail'
import { StockItem } from '../../domain/entities/StockItem'

interface Props {
  customerUuid: string
  stockItemCode: string
}

interface CustomerStockItemDetail {
  customerId: number
  customerUuid: string
  customerName: string
  stockItem: StockItem
  item: CustomerStockItemRow
  transactions: CustomerStockTransactionRow[]
}

function normalizeDetail(detail: CustomerStockItemDetail): CustomerStockItemDetail {
  return {
    ...detail,
    stockItem: {
      ...detail.stockItem,
      id: Number(detail.stockItem.id || 0),
      current_stock: Number(detail.stockItem.current_stock || 0),
      peak_stock: Number(detail.stockItem.peak_stock || 0),
    },
    item: {
      ...detail.item,
      stockItemId: Number(detail.item.stockItemId || 0),
      totalIn: Number(detail.item.totalIn || 0),
      totalOut: Number(detail.item.totalOut || 0),
      balance: Number(detail.item.balance || 0),
      categories: detail.item.categories || [],
      categoryRows: (detail.item.categoryRows || []).map(row => ({
        ...row,
        categoryName: row.categoryName || null,
        totalIn: Number(row.totalIn || 0),
        totalOut: Number(row.totalOut || 0),
        balance: Number(row.balance || 0),
      })),
    },
    transactions: (detail.transactions || []).map(row => ({
      ...row,
      qty: Number(row.qty || 0),
      sjNumber: row.sjNumber || null,
      invoiceNumber: row.invoiceNumber || null,
    })),
  }
}

export default function CustomerStockItemDetailPage({ customerUuid, stockItemCode }: Props) {
  const router = useRouter()
  const { push: pushToast } = useToast()
  const role = useSelector((state: RootState) => state.auth.user?.role ?? null)
  const [detail, setDetail] = useState<CustomerStockItemDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null | '__UNCATEGORIZED__'>(null)
  const [qtyValue, setQtyValue] = useState('')
  const [notes, setNotes] = useState('')
  // delete confirm: key = categoryName atau '__UNCATEGORIZED__'
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isReadOnly = role === 'admin_finance'

  useEffect(() => {
    let mounted = true
    setIsLoading(true)
    apiRequest<CustomerStockItemDetail>(`/stock/customers/${customerUuid}/items/${encodeURIComponent(stockItemCode)}`)
      .then(response => {
        if (mounted) setDetail(normalizeDetail(response.data))
      })
      .catch(() => {
        if (mounted) {
          pushToast({ title: 'Gagal Memuat', description: 'Detail stok barang customer tidak dapat dimuat.', variant: 'error' })
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => { mounted = false }
  }, [customerUuid, stockItemCode, pushToast])

  const categoryRows = useMemo<CustomerStockCategoryRow[]>(() => {
    if (!detail) return []
    if (detail.item.categoryRows.length > 0) return detail.item.categoryRows
    return [{ categoryName: null, totalIn: 0, totalOut: 0, balance: 0 }]
  }, [detail])

  const startEdit = (row: CustomerStockCategoryRow) => {
    if (isReadOnly) return
    setEditingCategory(row.categoryName || '__UNCATEGORIZED__')
    setQtyValue(String(row.balance))
    setNotes('')
  }

  const cancelEdit = () => {
    setEditingCategory(null)
    setQtyValue('')
    setNotes('')
  }

  const handleDeleteCategory = async (categoryName: string | null) => {
    if (isReadOnly || !detail) return
    setIsDeleting(true)
    try {
      const params = categoryName !== null ? `?category_name=${encodeURIComponent(categoryName)}` : ''
      await apiRequest(
        `/stock/customers/${customerUuid}/items/${encodeURIComponent(stockItemCode)}/category${params}`,
        { method: 'DELETE' },
      )
      // reload detail
      const response = await apiRequest<CustomerStockItemDetail>(
        `/stock/customers/${customerUuid}/items/${encodeURIComponent(stockItemCode)}`,
      )
      setDetail(normalizeDetail(response.data))
      setConfirmDelete(null)
      pushToast({
        title: 'Data Dihapus',
        description: categoryName
          ? `Stok kategori "${categoryName}" berhasil dihapus.`
          : 'Stok tanpa kategori berhasil dihapus.',
        variant: 'success',
      })
    } catch (error) {
      pushToast({
        title: 'Gagal Menghapus',
        description: error instanceof Error ? error.message : 'Data stok tidak dapat dihapus.',
        variant: 'error',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const saveEdit = async (row: CustomerStockCategoryRow) => {
    const targetQty = Number(qtyValue)
    if (isReadOnly) return
    if (!Number.isFinite(targetQty) || targetQty < 0) {
      pushToast({ title: 'Qty Tidak Valid', description: 'Saldo (sisa stock) akhir harus berupa angka dan tidak boleh negatif.', variant: 'error' })
      return
    }

    setIsSaving(true)
    try {
      const response = await apiRequest<CustomerStockItemDetail>(`/stock/customers/${customerUuid}/items/${encodeURIComponent(stockItemCode)}/balance`, {
        method: 'PUT',
        body: {
          category_name: row.categoryName,
          qty: targetQty,
          notes: notes.trim() || null,
        },
      })
      setDetail(normalizeDetail(response.data))
      cancelEdit()
      pushToast({ title: 'Saldo (sisa stock) Diperbarui', description: 'Adjustment stok customer berhasil disimpan.', variant: 'success' })
    } catch (error) {
      pushToast({
        title: 'Gagal Menyimpan',
        description: error instanceof Error ? error.message : 'Saldo (sisa stock) customer gagal diperbarui.',
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push(`/stok/customer/${customerUuid}`)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Customer / Barang</div>
          <h1 className="text-2xl font-bold">{detail ? detail.stockItem.name : 'Detail Barang'}</h1>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-24 bg-white rounded-xl border shadow-sm animate-pulse" style={{ borderColor: 'var(--border-card)' }} />
          <div className="h-72 bg-white rounded-xl border shadow-sm animate-pulse" style={{ borderColor: 'var(--border-card)' }} />
        </div>
      ) : !detail ? (
        <div className="bg-white rounded-xl border shadow-sm py-16 text-center text-gray-500" style={{ borderColor: 'var(--border-card)' }}>
          Data barang customer tidak ditemukan
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border shadow-sm p-4 md:col-span-2" style={{ borderColor: 'var(--border-card)' }}>
              <div className="text-xs text-gray-500 mb-2">Customer</div>
              <div className="font-bold text-gray-900">{detail.customerName}</div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
              <div className="text-xs text-gray-500 mb-2">Kode Barang</div>
              <StockItemBadge code={detail.stockItem.code} />
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
              <div className="text-xs text-gray-500 mb-2">Saldo (sisa stock) Customer</div>
              <div className="text-2xl font-bold text-gray-900">
                {detail.item.balance.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-400">{detail.stockItem.unit}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6" style={{ borderColor: 'var(--border-card)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
              <h2 className="font-bold text-base">Saldo (sisa stock) per Kategori</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Nama Barang</th>
                    <th className="px-4 py-3 text-left">Kategori</th>
                    <th className="px-4 py-3 text-right">Masuk</th>
                    <th className="px-4 py-3 text-right">Keluar</th>
                    <th className="px-4 py-3 text-right">Saldo (sisa stock) Akhir</th>
                    {!isReadOnly && <th className="px-4 py-3 text-left">Catatan Adjustment</th>}
                    {!isReadOnly && <th className="px-4 py-3 text-right">Aksi</th>}
                    {!isReadOnly && <th className="px-4 py-3 text-right">Hapus</th>}
                  </tr>
                </thead>
                <tbody>
                  {categoryRows.map(row => {
                    const key = row.categoryName || '__UNCATEGORIZED__'
                    const isEditing = editingCategory === key
                    return (
                      <tr key={key} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-800">{detail.stockItem.name}</div>
                          <div className="text-xs text-gray-400">{detail.stockItem.code}</div>
                        </td>
                        <td className="px-4 py-3">
                          {row.categoryName
                            ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{row.categoryName}</span>
                            : <span className="text-xs text-gray-400">Tanpa Kategori</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">+{row.totalIn.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">-{row.totalOut.toLocaleString('id-ID')}</td>
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              className="form-input w-32 text-right ml-auto"
                              value={qtyValue}
                              onChange={event => setQtyValue(event.target.value)}
                              disabled={isSaving}
                            />
                          ) : (
                            <span className="font-bold text-gray-900">{row.balance.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-400">{detail.stockItem.unit}</span></span>
                          )}
                        </td>
                        {!isReadOnly && (
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-input w-full text-sm"
                                value={notes}
                                onChange={event => setNotes(event.target.value)}
                                placeholder="Opsional"
                                disabled={isSaving}
                              />
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        )}
                        {!isReadOnly && <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => saveEdit(row)}
                                disabled={isSaving}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-green-700 hover:bg-green-50 disabled:opacity-50"
                                title="Simpan saldo (sisa stock)"
                              >
                                <Check size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={isSaving}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                                title="Batal"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEdit(row)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Edit saldo (sisa stock) akhir"
                            >
                              <Pencil size={14} className="text-gray-500" />
                            </button>
                          )}
                        </td>}
                        {!isReadOnly && (
                          <td className="px-4 py-3 text-right">
                            {confirmDelete === key ? (
                              <div className="flex justify-end items-center gap-1">
                                <span className="text-xs text-red-600 font-medium mr-1">Yakin?</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(row.categoryName)}
                                  disabled={isDeleting}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 text-xs font-bold"
                                  title="Konfirmasi hapus"
                                >
                                  <Check size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(null)}
                                  disabled={isDeleting}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                                  title="Batal"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(key)}
                                disabled={isEditing || isDeleting}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30"
                                title={row.categoryName ? `Hapus stok kategori "${row.categoryName}"` : 'Hapus stok tanpa kategori'}
                              >
                                <Trash2 size={14} className="text-red-400" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
              <h2 className="font-bold text-base">Riwayat Barang Ini</h2>
            </div>
            {detail.transactions.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">Belum ada transaksi</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Tanggal</th>
                      <th className="px-4 py-3 text-left">Tipe</th>
                      <th className="px-4 py-3 text-left">Nomor</th>
                      <th className="px-4 py-3 text-left">Kategori</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-left">Referensi</th>
                      <th className="px-4 py-3 text-left">Catatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.transactions.map((txn, idx) => (
                      <tr key={txn.id} className={`border-t ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`} style={{ borderColor: 'var(--border-card)' }}>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(txn.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${txn.type === 'masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {txn.type === 'masuk' ? 'Masuk' : 'Keluar'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{txn.number}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{txn.category || 'Tanpa Kategori'}</td>
                        <td className={`px-4 py-3 text-right font-bold ${txn.type === 'masuk' ? 'text-green-700' : 'text-red-600'}`}>
                          {txn.type === 'masuk' ? '+' : '-'}{txn.qty.toLocaleString('id-ID')} {txn.unit}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{txn.reference}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{txn.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
