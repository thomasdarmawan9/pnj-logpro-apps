'use client'

import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { PackagePlus, PackageMinus } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchStockItems, fetchStockReceipts, fetchStockDisbursements } from '@/store/slices/stockSlice'

export default function StockDashboardPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { items, receipts, disbursements, isLoading } = useSelector((state: RootState) => state.stock)

  useEffect(() => {
    dispatch(fetchStockItems())
    dispatch(fetchStockReceipts())
    dispatch(fetchStockDisbursements())
  }, [dispatch])

  const PAGE_SIZE = 5
  const [customerPage, setCustomerPage] = useState(0)

  // Stock per customer — flat rows for pagination
  const customerFlatRows = useMemo(() => {
    const map = new Map<string, { customerName: string; items: Map<string, { unit: string; qty: number }> }>()
    disbursements.forEach(d => {
      const key = d.customer ? String(d.customer.id) : '__none__'
      const name = d.customer?.name ?? 'Tanpa Customer'
      if (!map.has(key)) map.set(key, { customerName: name, items: new Map() })
      const entry = map.get(key)!
      const itemName = d.stock_item.name
      const prev = entry.items.get(itemName) ?? { unit: d.stock_item.unit, qty: 0 }
      entry.items.set(itemName, { unit: prev.unit, qty: prev.qty + d.qty })
    })
    const sorted = Array.from(map.values()).sort((a, b) => {
      if (a.customerName === 'Tanpa Customer') return 1
      if (b.customerName === 'Tanpa Customer') return -1
      return a.customerName.localeCompare(b.customerName)
    })
    return sorted.flatMap(row =>
      Array.from(row.items.entries()).map(([itemName, { qty, unit }]) => ({
        customerName: row.customerName,
        itemName,
        qty,
        unit,
      }))
    )
  }, [disbursements])

  // Recent transactions (last 10, mix of receipts + disbursements)
  const recentTransactions = useMemo(() => {
    const receiptTxns = receipts.flatMap(r =>
      r.items.map(item => ({
        id: `r-${r.uuid}-${item.uuid}`,
        date: r.receipt_date,
        type: 'masuk' as const,
        number: r.receipt_number,
        itemName: item.stock_item.name,
        qty: item.qty,
        unit: item.stock_item.unit,
        reference: r.document_number ?? r.receipt_number,
      }))
    )
    const disbTxns = disbursements.map(d => ({
      id: `d-${d.uuid}`,
      date: d.disbursement_date,
      type: 'keluar' as const,
      number: d.disbursement_number,
      itemName: d.stock_item.name,
      qty: d.qty,
      unit: d.stock_item.unit,
      reference: d.sj_number_manual ? `SJ ${d.sj_number_manual}` : d.disbursement_number,
    }))
    return [...receiptTxns, ...disbTxns]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10)
  }, [receipts, disbursements])

  // Overview stats
  const totalIn = receipts.flatMap(r => r.items).reduce((s, i) => s + i.qty, 0)
  const totalOut = disbursements.reduce((s, d) => s + d.qty, 0)
  const activeItems = items.filter(i => i.is_active).length
  const lowStockItems = items.filter(i => i.peak_stock > 0 && i.current_stock / i.peak_stock < 0.2).length

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
            <div className="text-2xl font-bold text-green-700">+{totalIn.toLocaleString('id-ID')}</div>
          )}
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
          <div className="text-xs text-gray-500 mb-1">Total Keluar</div>
          {isLoading ? <div className="h-8 bg-gray-100 rounded animate-pulse" /> : (
            <div className="text-2xl font-bold text-red-600">-{totalOut.toLocaleString('id-ID')}</div>
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
      {(() => {
        const totalPages = Math.ceil(customerFlatRows.length / PAGE_SIZE)
        const pageRows = customerFlatRows.slice(customerPage * PAGE_SIZE, (customerPage + 1) * PAGE_SIZE)
        // global customer order (for No. column)
        const customerOrder = new Map<string, number>()
        customerFlatRows.forEach(r => { if (!customerOrder.has(r.customerName)) customerOrder.set(r.customerName, customerOrder.size + 1) })
        // compute rowSpan per customer within this page
        const spanCount = new Map<string, number>()
        pageRows.forEach(r => spanCount.set(r.customerName, (spanCount.get(r.customerName) ?? 0) + 1))
        const rendered = new Set<string>()

        return (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6" style={{ borderColor: 'var(--border-card)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
              <h2 className="font-bold text-base">Stok per Customer</h2>
              <p className="text-xs text-gray-500 mt-0.5">Rekapitulasi total barang keluar berdasarkan customer</p>
            </div>
            {isLoading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : customerFlatRows.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">Belum ada data keluar per customer</div>
            ) : (
              <>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-center font-semibold w-12">No.</th>
                      <th className="px-4 py-3 text-left font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left font-semibold">Barang</th>
                      <th className="px-4 py-3 text-right font-semibold">Qty Keluar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row) => {
                      const isFirst = !rendered.has(row.customerName)
                      if (isFirst) rendered.add(row.customerName)
                      return (
                        <tr key={`${row.customerName}-${row.itemName}`} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                          {isFirst && (
                            <td className="px-4 py-3 text-center text-gray-400 text-xs align-top" rowSpan={spanCount.get(row.customerName)}>
                              {customerOrder.get(row.customerName)}
                            </td>
                          )}
                          {isFirst && (
                            <td className="px-4 py-3 font-semibold text-gray-800 align-top whitespace-nowrap" rowSpan={spanCount.get(row.customerName)}>
                              {row.customerName}
                            </td>
                          )}
                          <td className="px-4 py-3 text-gray-700">{row.itemName}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-600 whitespace-nowrap">
                            -{row.qty.toLocaleString('id-ID')} {row.unit}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {totalPages > 1 && (
                  <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-card)' }}>
                    <span className="text-xs text-gray-500">
                      {customerPage * PAGE_SIZE + 1}–{Math.min((customerPage + 1) * PAGE_SIZE, customerFlatRows.length)} dari {customerFlatRows.length} baris
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCustomerPage(p => p - 1)}
                        disabled={customerPage === 0}
                        className="px-3 py-1.5 text-xs rounded-lg border disabled:opacity-40"
                        style={{ borderColor: 'var(--border-card)' }}
                      >
                        ← Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setCustomerPage(i)}
                          className={`w-7 h-7 text-xs rounded-lg border font-medium ${customerPage === i ? 'text-white' : ''}`}
                          style={{
                            borderColor: customerPage === i ? 'var(--green-primary)' : 'var(--border-card)',
                            backgroundColor: customerPage === i ? 'var(--green-primary)' : undefined,
                          }}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCustomerPage(p => p + 1)}
                        disabled={customerPage === totalPages - 1}
                        className="px-3 py-1.5 text-xs rounded-lg border disabled:opacity-40"
                        style={{ borderColor: 'var(--border-card)' }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base">Transaksi Terbaru</h2>
          <button
            onClick={() => router.push('/stok/laporan')}
            className="text-sm font-semibold"
            style={{ color: 'var(--green-primary)' }}
          >
            Lihat Semua &rarr;
          </button>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  )
}
