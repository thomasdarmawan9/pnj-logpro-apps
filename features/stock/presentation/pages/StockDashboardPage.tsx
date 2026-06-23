'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { ArrowRight, Download, Eye, FileBarChart2, PackagePlus, PackageMinus, Search, X, List, Trash2, Package } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchCustomerStockSummaries, fetchStockItems, fetchStockReceipts, fetchStockDisbursements, deleteStockItem, openDeleteConfirm, closeDeleteConfirm } from '@/store/slices/stockSlice'
import { apiDownload, apiRequest } from '@/lib/apiClient'
import { useToast } from '@/components/toast/useToast'
import DeleteConfirmModal from '../components/modals/DeleteConfirmModal'

export default function StockDashboardPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { push: pushToast } = useToast()
  const { items, receipts, disbursements, customerSummaries, isLoading, isSubmitting, modals } = useSelector((state: RootState) => state.stock)
  const role = useSelector((state: RootState) => state.auth.user?.role ?? null)
  const isReadOnly = role === 'admin_finance'

  useEffect(() => {
    dispatch(fetchStockItems())
    dispatch(fetchStockReceipts())
    dispatch(fetchStockDisbursements())
    dispatch(fetchCustomerStockSummaries())
  }, [dispatch])

  const GROUPS_PER_PAGE = 2
  const [customerPage, setCustomerPage] = useState(0)
  const [customerSearch, setCustomerSearch] = useState('')
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [selectedPdfCustomerUuid, setSelectedPdfCustomerUuid] = useState('')
  const [isPrintingPdf, setIsPrintingPdf] = useState(false)
  const [isItemListModalOpen, setIsItemListModalOpen] = useState(false)
  const [itemListSearch, setItemListSearch] = useState('')
  // Popup daftar kategori untuk satu jenis barang (sebelum konfirmasi hapus)
  const [categoryPopup, setCategoryPopup] = useState<{ uuid: string; name: string; id: number; unit: string } | null>(null)
  // Konfirmasi hapus satu kategori
  const [categoryConfirm, setCategoryConfirm] = useState<{ itemUuid: string; categoryName: string | null; label: string } | null>(null)
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)

  // Kategorisasi + customer terkait per jenis barang (diturunkan dari transaksi)
  const itemMeta = useMemo(() => {
    const map = new Map<number, { categories: Set<string>; customers: Set<string> }>()
    const ensure = (id: number) => {
      let meta = map.get(id)
      if (!meta) { meta = { categories: new Set(), customers: new Set() }; map.set(id, meta) }
      return meta
    }
    receipts.forEach(receipt => {
      receipt.items.forEach(item => {
        const meta = ensure(item.stock_item_id)
        if (item.kategori_name) meta.categories.add(item.kategori_name)
        if (receipt.customer?.name) meta.customers.add(receipt.customer.name)
      })
    })
    disbursements.forEach(d => {
      const meta = ensure(d.stock_item_id)
      if (d.kategori_name) meta.categories.add(d.kategori_name)
      if (d.customer?.name) meta.customers.add(d.customer.name)
    })
    return map
  }, [receipts, disbursements])

  const itemRowsWithMeta = useMemo(() => items.map(item => {
    const meta = itemMeta.get(item.id)
    return {
      item,
      categories: meta ? Array.from(meta.categories).sort() : [],
      customers: meta ? Array.from(meta.customers).sort() : [],
    }
  }), [items, itemMeta])

  const filteredItemRows = useMemo(() => {
    const q = itemListSearch.trim().toLowerCase()
    if (!q) return itemRowsWithMeta
    return itemRowsWithMeta.filter(row =>
      row.item.name.toLowerCase().includes(q) ||
      row.item.code.toLowerCase().includes(q) ||
      row.categories.some(c => c.toLowerCase().includes(q)) ||
      row.customers.some(c => c.toLowerCase().includes(q))
    )
  }, [itemRowsWithMeta, itemListSearch])

  const customerGroups = useMemo(() => customerSummaries
    .map((customer, idx) => ({ ...customer, no: idx + 1 })),
  [customerSummaries])

  // Semua transaksi manajemen stok (masuk + keluar), terbaru → terlama.
  const allTransactions = useMemo(() => {
    const receiptTxns = receipts.flatMap(r =>
      r.items.map(item => ({
        id: `r-${r.uuid}-${item.uuid}`,
        date: r.receipt_date,
        updatedAt: r.updated_at || r.created_at || r.receipt_date,
        type: 'masuk' as const,
        spalNumber: r.document_number ?? '',
        itemName: item.stock_item.name,
        kategori: item.kategori_name ?? null,
        qty: item.qty,
        unit: item.stock_item.unit,
        sjNumber: null as string | null,
        invoiceNumber: null as string | null,
        detailPath: `/stok/masuk/${r.uuid}`,
      }))
    )
    const disbTxns = disbursements.map(d => ({
      id: `d-${d.uuid}`,
      date: d.disbursement_date,
      updatedAt: d.updated_at || d.created_at || d.disbursement_date,
      type: 'keluar' as const,
      spalNumber: '',
      itemName: d.stock_item.name,
      kategori: d.kategori_name ?? null,
      qty: d.qty,
      unit: d.stock_item.unit,
      sjNumber: d.delivery_order?.sj_number || d.sj_number_manual || null,
      invoiceNumber: d.delivery_order?.invoice?.invoice_number || d.invoice_number_manual || null,
      detailPath: `/stok/keluar/${d.uuid}`,
    }))
    return [...receiptTxns, ...disbTxns]
      .sort((a, b) => {
        const byUpdated = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        if (byUpdated !== 0) return byUpdated
        return b.date.localeCompare(a.date)
      })
  }, [receipts, disbursements])

  const TXN_PER_PAGE = 15
  const [txnSearch, setTxnSearch] = useState('')
  const [txnPage, setTxnPage] = useState(0)

  const filteredTransactions = useMemo(() => {
    const q = txnSearch.trim().toLowerCase()
    if (!q) return allTransactions
    return allTransactions.filter(t =>
      t.itemName.toLowerCase().includes(q) ||
      (t.kategori ?? '').toLowerCase().includes(q) ||
      (t.spalNumber ?? '').toLowerCase().includes(q) ||
      (t.sjNumber ?? '').toLowerCase().includes(q) ||
      (t.invoiceNumber ?? '').toLowerCase().includes(q) ||
      (t.type === 'masuk' ? 'masuk' : 'keluar').includes(q)
    )
  }, [allTransactions, txnSearch])

  // Overview stats
  const totalIn = receipts.flatMap(r => r.items).reduce((s, i) => s + i.qty, 0)
  const totalOut = disbursements.reduce((s, d) => s + d.qty, 0)
  const totalItemTypes = useMemo(() => {
    const activeItemIds = new Set(items.filter(item => item.is_active).map(item => item.id))
    const itemTypeKeys = new Set<string>()
    const itemIdsWithCategory = new Set<number>()

    receipts.forEach(receipt => {
      receipt.items.forEach(item => {
        if (!activeItemIds.has(item.stock_item_id)) return
        const category = item.kategori_name || ''
        itemTypeKeys.add(`${item.stock_item_id}::${category}`)
        if (category) itemIdsWithCategory.add(item.stock_item_id)
      })
    })

    disbursements.forEach(disbursement => {
      if (!activeItemIds.has(disbursement.stock_item_id)) return
      const category = disbursement.kategori_name || ''
      itemTypeKeys.add(`${disbursement.stock_item_id}::${category}`)
      if (category) itemIdsWithCategory.add(disbursement.stock_item_id)
    })

    items.forEach(item => {
      if (!item.is_active || itemIdsWithCategory.has(item.id)) return
      itemTypeKeys.add(`${item.id}::`)
    })

    return itemTypeKeys.size
  }, [items, receipts, disbursements])
  const totalRemainingStock = items
    .filter(i => i.is_active)
    .reduce((sum, item) => sum + Number(item.current_stock || 0), 0)

  const selectedPdfCustomer = customerSummaries.find(customer => customer.customerUuid === selectedPdfCustomerUuid)

  const handleDeleteItem = async () => {
    if (!modals.deleteConfirm.uuid) return
    const res = await dispatch(deleteStockItem(modals.deleteConfirm.uuid))
    if (deleteStockItem.fulfilled.match(res)) {
      // Riwayat transaksi barang ikut terhapus → segarkan data terkait.
      dispatch(fetchStockReceipts())
      dispatch(fetchStockDisbursements())
      dispatch(fetchCustomerStockSummaries())
      pushToast({ title: 'Barang Dihapus', description: 'Jenis barang beserta riwayat transaksinya berhasil dihapus.', variant: 'info' })
    } else {
      pushToast({ title: 'Gagal Menghapus', description: (res.payload as string) || 'Terjadi kesalahan saat menghapus barang.', variant: 'error' })
    }
  }

  // Breakdown kategori (masuk/keluar/saldo) untuk satu jenis barang dari state.
  const getCategoryBreakdown = (stockItemId: number) => {
    const map = new Map<string, { name: string | null; totalIn: number; totalOut: number }>()
    const ensure = (name: string | null) => {
      const key = name ?? ''
      let entry = map.get(key)
      if (!entry) { entry = { name: name || null, totalIn: 0, totalOut: 0 }; map.set(key, entry) }
      return entry
    }
    receipts.forEach(r => r.items.forEach(it => {
      if (it.stock_item_id !== stockItemId) return
      ensure(it.kategori_name).totalIn += it.qty
    }))
    disbursements.forEach(d => {
      if (d.stock_item_id !== stockItemId) return
      ensure(d.kategori_name ?? null).totalOut += d.qty
    })
    return Array.from(map.values())
      .map(e => ({
        ...e,
        balance: e.totalIn - e.totalOut,
        // Bisa dihapus jika belum ada transaksi keluar, atau saldo sudah 0.
        deletable: e.totalOut === 0 || (e.totalIn - e.totalOut) === 0,
      }))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  }

  const handleDeleteCategory = async () => {
    if (!categoryConfirm) return
    setIsDeletingCategory(true)
    try {
      const q = categoryConfirm.categoryName !== null ? `?category_name=${encodeURIComponent(categoryConfirm.categoryName)}` : ''
      await apiRequest(`/stock/items/${categoryConfirm.itemUuid}/category${q}`, { method: 'DELETE' })
      await Promise.all([
        dispatch(fetchStockItems()),
        dispatch(fetchStockReceipts()),
        dispatch(fetchStockDisbursements()),
        dispatch(fetchCustomerStockSummaries()),
      ])
      pushToast({ title: 'Kategori Dihapus', description: `Kategori "${categoryConfirm.label}" berhasil dihapus.`, variant: 'info' })
      setCategoryConfirm(null)
    } catch (err) {
      pushToast({ title: 'Gagal Menghapus', description: err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus kategori.', variant: 'error' })
    } finally {
      setIsDeletingCategory(false)
    }
  }

  const openPdfModal = () => {
    setSelectedPdfCustomerUuid(customerSummaries[0]?.customerUuid || '')
    setIsPdfModalOpen(true)
  }

  const handlePrintCustomerPdf = async () => {
    if (!selectedPdfCustomerUuid) return

    setIsPrintingPdf(true)
    try {
      const blob = await apiDownload(`/stock/customers/${selectedPdfCustomerUuid}/export/pdf`)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      const filenameCustomer = (selectedPdfCustomer?.customerName || selectedPdfCustomerUuid).replace(/[^a-zA-Z0-9_-]/g, '_')
      a.href = url
      a.download = `rekap-stok-customer-${filenameCustomer}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      setIsPdfModalOpen(false)
    } finally {
      setIsPrintingPdf(false)
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-500">Dashboard / Manajemen Stok</div>
          <h1 className="text-2xl font-bold">Manajemen Stok</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openPdfModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            style={{ borderColor: 'var(--border-card)' }}
          >
            <FileBarChart2 size={16} />
            Rekap / Cetak PDF
          </button>
          {!isReadOnly && (
            <>
              <button
                onClick={() => router.push('/stok/masuk/create')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium"
                style={{ backgroundColor: 'var(--green-primary)' }}
              >
                <PackagePlus size={16} />
                Stok Masuk
              </button>
              <button
                onClick={() => router.push('/stok/keluar/create')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium bg-red-600"
              >
                <PackageMinus size={16} />
                Stok Keluar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
          <div className="text-xs text-gray-500 mb-1">Total Jenis Barang</div>
          {isLoading ? <div className="h-8 bg-gray-100 rounded animate-pulse" /> : (
            <div className="flex items-end justify-between gap-3">
              <div className="text-2xl font-bold text-gray-900">{totalItemTypes}</div>
              <button
                type="button"
                onClick={() => setIsItemListModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                style={{ borderColor: 'var(--border-card)' }}
              >
                <List size={12} />
                List
              </button>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
          <div className="text-xs text-gray-500 mb-1">Total Masuk</div>
          {isLoading ? <div className="h-8 bg-gray-100 rounded animate-pulse" /> : (
            <div className="flex items-end justify-between gap-3">
              <div className="text-2xl font-bold text-green-700">+{totalIn.toLocaleString('id-ID')}</div>
              <button
                type="button"
                onClick={() => router.push('/stok/masuk')}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-50 transition-colors"
                style={{ borderColor: '#BBF7D0' }}
              >
                List
                <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
          <div className="text-xs text-gray-500 mb-1">Total Keluar</div>
          {isLoading ? <div className="h-8 bg-gray-100 rounded animate-pulse" /> : (
            <div className="flex items-end justify-between gap-3">
              <div className="text-2xl font-bold text-red-600">-{totalOut.toLocaleString('id-ID')}</div>
              <button
                type="button"
                onClick={() => router.push('/stok/keluar')}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                style={{ borderColor: '#FECACA' }}
              >
                List
                <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
          <div className="text-xs text-gray-500 mb-1">Total Sisa Stock</div>
          {isLoading ? <div className="h-8 bg-gray-100 rounded animate-pulse" /> : (
            <div className="text-2xl font-bold text-gray-900">
              {totalRemainingStock.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
            </div>
          )}
        </div>
      </div>

      {/* Stock per customer */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6" style={{ borderColor: 'var(--border-card)' }}>
        <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-card)' }}>
          <div className="flex-1">
            <h2 className="font-bold text-base">Stok per Customer</h2>
            <p className="text-xs text-gray-500 mt-0.5">Rekapitulasi stok per customer beserta detail kategori</p>
          </div>
          <div className="relative w-56 shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              className="form-input w-full"
              placeholder="Cari customer, barang, kategori..."
              value={customerSearch}
              onChange={e => { setCustomerSearch(e.target.value); setCustomerPage(0) }}
              style={{ paddingLeft: '38px' }}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (() => {
          const filtered = customerSearch.trim()
            ? customerGroups.filter(g =>
                g.customerName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                g.itemRows.some(r =>
                  r.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  r.code.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  r.categories.some(category => category.toLowerCase().includes(customerSearch.toLowerCase()))
                )
              )
            : customerGroups
          const totalPages = Math.ceil(filtered.length / GROUPS_PER_PAGE)
          const safePage = Math.min(customerPage, Math.max(0, totalPages - 1))
          const pageGroups = filtered.slice(safePage * GROUPS_PER_PAGE, (safePage + 1) * GROUPS_PER_PAGE)
          return (
            <>
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 border-b" style={{ borderColor: 'var(--border-card)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold w-16">No</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold">Barang</th>
                    <th className="px-4 py-3 text-left font-semibold">Kategori</th>
                    <th className="px-4 py-3 text-right font-semibold">Saldo (sisa stock)</th>
                    <th className="px-4 py-3 text-right font-semibold w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageGroups.map(group => (
                    <Fragment key={group.customerUuid}>
                      <tr className="border-t" style={{ borderColor: 'var(--border-card)', backgroundColor: 'var(--bg-card)' }}>
                        <td className="px-4 py-2.5 text-[11px] font-semibold text-gray-400 text-center">
                          {group.no}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800 text-sm">{group.customerName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-400">{group.itemRows.length} barang</td>
                        <td className="px-4 py-2.5 text-xs text-gray-300">—</td>
                        <td className={`px-4 py-2.5 text-right font-bold whitespace-nowrap font-mono ${group.totalAsset < 0 ? 'text-red-600' : 'text-gray-900'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {group.totalAsset.toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => router.push(`/stok/customer/${group.customerUuid}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-gray-50 transition-colors"
                            style={{ borderColor: 'var(--border-card)', color: 'var(--text-primary)' }}
                          >
                            <Eye size={13} />
                            Detail
                          </button>
                        </td>
                      </tr>
                      {group.itemRows.map(row => (
                        <tr
                          key={`${group.customerUuid}-${row.stockItemId}`}
                          className="border-t"
                          style={{ borderColor: 'var(--border-light)' }}
                        >
                          <td className="px-4 py-2.5" />
                          <td className="px-4 py-2.5" />
                          <td className="pl-10 pr-4 py-2.5 text-gray-700">
                            <span className="font-medium">{row.name}</span>
                            <span className="text-xs text-gray-400 ml-2">{row.code}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            {row.categories.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {row.categories.map(category => (
                                  <span key={category} className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{category}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-bold whitespace-nowrap font-mono ${row.balance < 0 ? 'text-red-600' : 'text-gray-800'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {row.balance.toLocaleString('id-ID')}
                            <span className="text-xs font-normal text-gray-400 ml-1">{row.unit}</span>
                          </td>
                          <td className="px-4 py-2.5" />
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-card)' }}>
                  <span className="text-xs text-gray-500">
                    Customer {safePage * GROUPS_PER_PAGE + 1}–{Math.min((safePage + 1) * GROUPS_PER_PAGE, filtered.length)} dari {filtered.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCustomerPage(p => p - 1)}
                      disabled={safePage === 0}
                      className="px-3 py-1.5 text-xs rounded-lg border disabled:opacity-40 transition-opacity"
                      style={{ borderColor: 'var(--border-card)' }}
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setCustomerPage(i)}
                        className="w-7 h-7 text-xs rounded-lg border font-medium"
                        style={{
                          borderColor: safePage === i ? 'var(--green-primary)' : 'var(--border-card)',
                          backgroundColor: safePage === i ? 'var(--green-primary)' : undefined,
                          color: safePage === i ? 'white' : undefined,
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCustomerPage(p => p + 1)}
                      disabled={safePage === totalPages - 1}
                      className="px-3 py-1.5 text-xs rounded-lg border disabled:opacity-40 transition-opacity"
                      style={{ borderColor: 'var(--border-card)' }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>

      {/* Riwayat Transaksi */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
        <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--border-card)' }}>
          <div className="flex-1">
            <h2 className="font-bold text-base">Riwayat Transaksi</h2>
            <p className="text-xs text-gray-500 mt-0.5">Semua transaksi stok masuk &amp; keluar, terbaru → terlama</p>
          </div>
          <div className="relative w-64 shrink-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              className="form-input w-full"
              placeholder="Cari barang, kategori, SPAL, SJ, invoice..."
              value={txnSearch}
              onChange={e => { setTxnSearch(e.target.value); setTxnPage(0) }}
              style={{ paddingLeft: '38px' }}
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            {txnSearch.trim() ? 'Tidak ada transaksi yang cocok' : 'Belum ada transaksi'}
          </div>
        ) : (() => {
          const totalPages = Math.ceil(filteredTransactions.length / TXN_PER_PAGE)
          const safePage = Math.min(txnPage, Math.max(0, totalPages - 1))
          const pageItems = filteredTransactions.slice(safePage * TXN_PER_PAGE, (safePage + 1) * TXN_PER_PAGE)
          return (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">No.</th>
                      <th className="px-4 py-3 text-left">Tanggal</th>
                      <th className="px-4 py-3 text-left">Tipe</th>
                      <th className="px-4 py-3 text-left">Nomor SPAL</th>
                      <th className="px-4 py-3 text-left">Barang</th>
                      <th className="px-4 py-3 text-left">Kategori</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-left">SJ</th>
                      <th className="px-4 py-3 text-left">Invoice</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((txn, idx) => (
                      <tr key={txn.id} className={`border-t ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`} style={{ borderColor: 'var(--border-card)' }}>
                        <td className="px-4 py-3 text-gray-500 text-xs">{safePage * TXN_PER_PAGE + idx + 1}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {new Date(txn.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            txn.type === 'masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {txn.type === 'masuk' ? 'Masuk' : 'Keluar'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {txn.spalNumber || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-800 font-medium">{txn.itemName}</td>
                        <td className="px-4 py-3">
                          {txn.kategori ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{txn.kategori}</span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${txn.type === 'masuk' ? 'text-green-700' : 'text-red-600'}`}>
                          {txn.type === 'masuk' ? '+' : '-'}{txn.qty} {txn.unit}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{txn.sjNumber || '-'}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{txn.invoiceNumber || '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => router.push(txn.detailPath)}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg border text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            style={{ borderColor: 'var(--border-card)' }}
                            title="Detail transaksi"
                          >
                            Detail
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-card)' }}>
                <span className="text-xs text-gray-500">
                  {safePage * TXN_PER_PAGE + 1}–{Math.min((safePage + 1) * TXN_PER_PAGE, filteredTransactions.length)} dari {filteredTransactions.length} transaksi
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTxnPage(Math.max(0, safePage - 1))}
                      disabled={safePage === 0}
                      className="px-3 py-1.5 text-xs rounded-lg border disabled:opacity-40 transition-opacity"
                      style={{ borderColor: 'var(--border-card)' }}
                    >
                      ← Prev
                    </button>
                    <span className="text-xs text-gray-500">Hal {safePage + 1} / {totalPages}</span>
                    <button
                      onClick={() => setTxnPage(Math.min(totalPages - 1, safePage + 1))}
                      disabled={safePage === totalPages - 1}
                      className="px-3 py-1.5 text-xs rounded-lg border disabled:opacity-40 transition-opacity"
                      style={{ borderColor: 'var(--border-card)' }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            </>
          )
        })()}
      </div>

      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-card)' }}>
              <div>
                <h2 className="text-base font-bold text-gray-900">Cetak PDF Stok Customer</h2>
                <p className="mt-0.5 text-xs text-gray-500">Pilih customer untuk mencetak rekap stoknya</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                disabled={isPrintingPdf}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Nama Customer <span className="text-red-500">*</span>
              </label>
              <select
                className="form-input w-full"
                value={selectedPdfCustomerUuid}
                onChange={e => setSelectedPdfCustomerUuid(e.target.value)}
                disabled={isPrintingPdf}
              >
                <option value="">— Pilih Customer —</option>
                {customerSummaries.map(customer => (
                  <option key={customer.customerUuid} value={customer.customerUuid}>
                    {customer.customerName}
                  </option>
                ))}
              </select>

              {selectedPdfCustomer && (
                <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  {selectedPdfCustomer.totalItemTypes} barang, saldo (sisa stock) total {selectedPdfCustomer.totalAsset.toLocaleString('id-ID')}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t px-5 py-4" style={{ borderColor: 'var(--border-card)' }}>
              <button
                type="button"
                onClick={() => setIsPdfModalOpen(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                style={{ borderColor: 'var(--border-card)' }}
                disabled={isPrintingPdf}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handlePrintCustomerPdf}
                disabled={!selectedPdfCustomerUuid || isPrintingPdf}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: 'var(--green-primary)' }}
              >
                <Download size={16} />
                {isPrintingPdf ? 'Mencetak...' : 'Cetak PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
      {isItemListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl border" style={{ borderColor: 'var(--border-card)' }}>
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-card)' }}>
              <div>
                <h2 className="text-base font-bold text-gray-900">Daftar Jenis Barang</h2>
                <p className="mt-0.5 text-xs text-gray-500">Semua jenis barang beserta kategorisasi dan customer terkait</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsItemListModalOpen(false); setItemListSearch('') }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="border-b px-5 py-3" style={{ borderColor: 'var(--border-card)' }}>
              <div className="relative w-full max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  className="form-input w-full"
                  placeholder="Cari barang, kategori, customer..."
                  value={itemListSearch}
                  onChange={e => setItemListSearch(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-xs text-gray-500 border-b" style={{ borderColor: 'var(--border-card)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold w-12">No</th>
                    <th className="px-4 py-3 text-left font-semibold">Nama Barang</th>
                    <th className="px-4 py-3 text-left font-semibold">Kategorisasi</th>
                    <th className="px-4 py-3 text-left font-semibold">Customer Terkait</th>
                    <th className="px-4 py-3 text-right font-semibold w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItemRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-16 text-center">
                        <Package size={40} className="mx-auto text-gray-200 mb-3" />
                        <div className="text-gray-500 font-medium">Tidak ada jenis barang ditemukan</div>
                      </td>
                    </tr>
                  ) : filteredItemRows.map((row, idx) => (
                    <tr key={row.item.uuid} className={`border-t ${row.item.is_active ? '' : 'opacity-60'}`} style={{ borderColor: 'var(--border-light)' }}>
                      <td className="px-4 py-3 text-center text-[11px] font-semibold text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.item.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-400">{row.item.code}</span>
                          {!row.item.is_active && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Nonaktif</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.categories.map(category => (
                              <span key={category} className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{category}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.customers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.customers.map(customer => (
                              <span key={customer} className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{customer}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => { setIsItemListModalOpen(false); setItemListSearch(''); router.push('/stok/barang') }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-gray-50 transition-colors text-gray-600"
                            style={{ borderColor: 'var(--border-card)' }}
                            title="Kelola di Master Barang"
                          >
                            <Eye size={13} />
                            Detail
                          </button>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => {
                                if (row.categories.length > 0) {
                                  setCategoryPopup({ uuid: row.item.uuid, name: row.item.name, id: row.item.id, unit: row.item.unit })
                                } else {
                                  dispatch(openDeleteConfirm({ type: 'item', uuid: row.item.uuid }))
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-red-500"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: 'var(--border-card)' }}>
              <span className="text-xs text-gray-500">{filteredItemRows.length} jenis barang</span>
              <button
                type="button"
                onClick={() => { setIsItemListModalOpen(false); setItemListSearch('') }}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                style={{ borderColor: 'var(--border-card)' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Popup daftar kategori untuk barang yang punya kategorisasi */}
      {categoryPopup && (() => {
        const breakdown = getCategoryBreakdown(categoryPopup.id)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl border" style={{ borderColor: 'var(--border-card)' }}>
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border-card)' }}>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Kategori — {categoryPopup.name}</h2>
                  <p className="mt-0.5 text-xs text-gray-500">Pilih kategori yang ingin dihapus beserta sisa stoknya</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryPopup(null)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-2">
                {breakdown.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-400">Tidak ada kategori</div>
                ) : breakdown.map(cat => (
                  <div
                    key={cat.name ?? '__none__'}
                    className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5"
                    style={{ borderColor: 'var(--border-card)' }}
                  >
                    <div className="min-w-0">
                      {cat.name ? (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{cat.name}</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Tanpa Kategori</span>
                      )}
                      <div className="mt-1 text-xs text-gray-500">
                        Sisa stock:&nbsp;
                        <span className={`font-bold font-mono ${cat.balance < 0 ? 'text-red-600' : cat.balance === 0 ? 'text-gray-500' : 'text-green-700'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {cat.balance.toLocaleString('id-ID')} {categoryPopup.unit}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <button
                        type="button"
                        disabled={!cat.deletable}
                        onClick={() => setCategoryConfirm({
                          itemUuid: categoryPopup.uuid,
                          categoryName: cat.name,
                          label: cat.name ?? 'Tanpa Kategori',
                        })}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        style={{ borderColor: 'var(--border-card)' }}
                        title={cat.deletable ? 'Hapus kategori' : 'Tidak bisa dihapus: ada transaksi keluar & sisa stock belum 0'}
                      >
                        <Trash2 size={13} />
                        Hapus
                      </button>
                      {!cat.deletable && (
                        <span className="text-[10px] leading-tight text-red-500 text-right">Sisa stock harus kosong</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end border-t px-5 py-3" style={{ borderColor: 'var(--border-card)' }}>
                <button
                  type="button"
                  onClick={() => setCategoryPopup(null)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  style={{ borderColor: 'var(--border-card)' }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <DeleteConfirmModal
        open={modals.deleteConfirm.open && modals.deleteConfirm.type === 'item'}
        title="Hapus Jenis Barang"
        description={'Apakah Anda yakin ingin menghapus jenis barang ini?\nBisa dihapus jika belum ada transaksi keluar. Jika sudah ada transaksi keluar, sisa stock harus 0.'}
        isSubmitting={isSubmitting}
        onClose={() => dispatch(closeDeleteConfirm())}
        onConfirm={handleDeleteItem}
      />

      <DeleteConfirmModal
        open={!!categoryConfirm}
        title="Hapus Kategori"
        description={categoryConfirm
          ? `Apakah Anda yakin ingin menghapus kategori "${categoryConfirm.label}"?\nBisa dihapus jika belum ada transaksi keluar. Jika sudah ada transaksi keluar, sisa stock harus 0.`
          : ''}
        isSubmitting={isDeletingCategory}
        onClose={() => setCategoryConfirm(null)}
        onConfirm={handleDeleteCategory}
      />
    </DashboardLayout>
  )
}
