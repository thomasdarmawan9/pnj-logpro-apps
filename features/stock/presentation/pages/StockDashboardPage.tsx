'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { ArrowRight, Download, Eye, FileBarChart2, PackagePlus, PackageMinus, Search, X } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchCustomerStockSummaries, fetchStockItems, fetchStockReceipts, fetchStockDisbursements } from '@/store/slices/stockSlice'
import { apiDownload } from '@/lib/apiClient'

export default function StockDashboardPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { items, receipts, disbursements, customerSummaries, isLoading } = useSelector((state: RootState) => state.stock)

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

  const customerGroups = useMemo(() => customerSummaries
    .map((customer, idx) => ({ ...customer, no: idx + 1 })),
  [customerSummaries])

  // Recent transactions (last 10, mix of receipts + disbursements)
  const recentTransactions = useMemo(() => {
    const receiptTxns = receipts.flatMap(r =>
      r.items.map(item => ({
        id: `r-${r.uuid}-${item.uuid}`,
        date: r.receipt_date,
        updatedAt: r.updated_at || r.created_at || r.receipt_date,
        type: 'masuk' as const,
        number: r.receipt_number,
        itemName: item.stock_item.name,
        qty: item.qty,
        unit: item.stock_item.unit,
        reference: r.document_number ?? r.receipt_number,
        sjNumber: null as string | null,
        invoiceNumber: null as string | null,
      }))
    )
    const disbTxns = disbursements.map(d => ({
      id: `d-${d.uuid}`,
      date: d.disbursement_date,
      updatedAt: d.updated_at || d.created_at || d.disbursement_date,
      type: 'keluar' as const,
      number: d.disbursement_number,
      itemName: d.stock_item.name,
      qty: d.qty,
      unit: d.stock_item.unit,
      reference: d.sj_number_manual ? `SJ ${d.sj_number_manual}` : d.delivery_order?.sj_number || d.disbursement_number,
      sjNumber: d.delivery_order?.sj_number || d.sj_number_manual || null,
      invoiceNumber: d.delivery_order?.invoice?.invoice_number || d.invoice_number_manual || null,
    }))
    return [...receiptTxns, ...disbTxns]
      .sort((a, b) => {
        const byUpdated = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        if (byUpdated !== 0) return byUpdated
        return b.date.localeCompare(a.date)
      })
      .slice(0, 10)
  }, [receipts, disbursements])

  // Overview stats
  const totalIn = receipts.flatMap(r => r.items).reduce((s, i) => s + i.qty, 0)
  const totalOut = disbursements.reduce((s, d) => s + d.qty, 0)
  const activeItems = items.filter(i => i.is_active).length
  const lowStockItems = items.filter(i => i.peak_stock > 0 && i.current_stock / i.peak_stock < 0.2).length

  const selectedPdfCustomer = customerSummaries.find(customer => customer.customerUuid === selectedPdfCustomerUuid)

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
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
          <div className="text-xs text-gray-500 mb-1">Total Jenis Barang</div>
          {isLoading ? <div className="h-8 bg-gray-100 rounded animate-pulse" /> : (
            <div className="text-2xl font-bold text-gray-900">{activeItems}</div>
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
          <div className="text-xs text-gray-500 mb-1">Stok Rendah</div>
          {isLoading ? <div className="h-8 bg-gray-100 rounded animate-pulse" /> : (
            <div className={`text-2xl font-bold ${lowStockItems > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {lowStockItems}
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
                    <th className="px-4 py-3 text-right font-semibold">Saldo</th>
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

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base">Transaksi Terbaru</h2>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Belum ada transaksi</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-left">Tipe</th>
                <th className="px-4 py-3 text-left">Nomor</th>
                <th className="px-4 py-3 text-left">Barang</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-left">Referensi</th>
                <th className="px-4 py-3 text-left">SJ</th>
                <th className="px-4 py-3 text-left">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((txn, idx) => (
                <tr key={txn.id} className={`border-t ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`} style={{ borderColor: 'var(--border-card)' }}>
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
                    {txn.number}
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{txn.itemName}</td>
                  <td className={`px-4 py-3 text-right font-bold ${txn.type === 'masuk' ? 'text-green-700' : 'text-red-600'}`}>
                    {txn.type === 'masuk' ? '+' : '-'}{txn.qty} {txn.unit}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{txn.reference}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{txn.sjNumber || '-'}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{txn.invoiceNumber || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
                  {selectedPdfCustomer.totalItemTypes} barang, saldo total {selectedPdfCustomer.totalAsset.toLocaleString('id-ID')}
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
    </DashboardLayout>
  )
}
