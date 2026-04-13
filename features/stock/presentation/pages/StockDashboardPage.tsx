'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { PackagePlus, PackageMinus, Search } from 'lucide-react'
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

  const GROUPS_PER_PAGE = 2
  const [customerPage, setCustomerPage] = useState(0)
  const [customerSearch, setCustomerSearch] = useState('')

  // Stock per customer — gabungan receipts (ada kategori) + disbursements (fallback)
  const customerGroups = useMemo(() => {
    type ItemRow = { itemName: string; unit: string; kategori: string | null; qty: number }

    // Bangun peta kategorisasi global per stock_item_id dari semua receipts
    // Dipakai saat fallback disbursement agar kategori tetap muncul walau receipt tidak punya customer
    const globalKat = new Map<number, { kategori: string; qty: number }[]>()
    receipts.forEach(r => {
      r.items.forEach(item => {
        if (!item.kategori_name) return
        if (!globalKat.has(item.stock_item_id)) globalKat.set(item.stock_item_id, [])
        const list = globalKat.get(item.stock_item_id)!
        const found = list.find(k => k.kategori === item.kategori_name)
        if (found) found.qty += item.qty
        else list.push({ kategori: item.kategori_name!, qty: item.qty })
      })
    })

    const map = new Map<string, { customerName: string; itemRows: ItemRow[] }>()

    // 1. Dari receipts yang punya customer (kategori sudah tersedia langsung)
    receipts.forEach(r => {
      if (!r.customer_id || !r.customer) return
      const custKey = String(r.customer.id)
      if (!map.has(custKey)) map.set(custKey, { customerName: r.customer.name, itemRows: [] })
      const entry = map.get(custKey)!
      r.items.forEach(item => {
        const existing = entry.itemRows.find(
          row => row.itemName === item.stock_item.name && row.kategori === (item.kategori_name ?? null)
        )
        if (existing) existing.qty += item.qty
        else entry.itemRows.push({
          itemName: item.stock_item.name,
          unit: item.stock_item.unit,
          kategori: item.kategori_name ?? null,
          qty: item.qty,
        })
      })
    })

    // 2. Dari disbursements — hanya untuk item yang belum masuk via receipt customer
    //    Jika item punya kategorisasi global → distribusikan qty secara proporsional
    //    Jika tidak ada kategorisasi → tampilkan satu baris tanpa kategori
    disbursements.forEach(d => {
      if (!d.customer_id || !d.customer) return
      const custKey = String(d.customer.id)
      if (!map.has(custKey)) map.set(custKey, { customerName: d.customer.name, itemRows: [] })
      const entry = map.get(custKey)!

      const itemName = d.stock_item.name
      if (entry.itemRows.some(row => row.itemName === itemName)) return // sudah ada dari receipt

      const kats = globalKat.get(d.stock_item_id)
      if (kats && kats.length > 0) {
        // Distribusi proporsional berdasarkan rasio global penerimaan
        const totalKat = kats.reduce((s, k) => s + k.qty, 0)
        kats.forEach(kat => {
          const proportional = Math.round((kat.qty / totalKat) * d.qty)
          const existing = entry.itemRows.find(row => row.itemName === itemName && row.kategori === kat.kategori)
          if (existing) existing.qty += proportional
          else entry.itemRows.push({ itemName, unit: d.stock_item.unit, kategori: kat.kategori, qty: proportional })
        })
      } else {
        const existing = entry.itemRows.find(row => row.itemName === itemName && row.kategori === null)
        if (existing) existing.qty += d.qty
        else entry.itemRows.push({ itemName, unit: d.stock_item.unit, kategori: null, qty: d.qty })
      }
    })

    return Array.from(map.values())
      .sort((a, b) => a.customerName.localeCompare(b.customerName))
      .map((cust, idx) => ({
        no: idx + 1,
        customerName: cust.customerName,
        rows: cust.itemRows,
      }))
  }, [receipts, disbursements])

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
                g.rows.some(r =>
                  r.itemName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                  (r.kategori ?? '').toLowerCase().includes(customerSearch.toLowerCase())
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
                    <th className="px-4 py-3 text-left font-semibold">Barang</th>
                    <th className="px-4 py-3 text-left font-semibold">Kategori</th>
                    <th className="px-4 py-3 text-right font-semibold">Total Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {pageGroups.map(group => (
                    <Fragment key={group.customerName}>
                      <tr className="border-t" style={{ borderColor: 'var(--border-card)', backgroundColor: 'var(--bg-card)' }}>
                        <td colSpan={3} className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-gray-400 w-5 text-center">{group.no}</span>
                            <span className="font-semibold text-gray-800 text-sm">{group.customerName}</span>
                            <span className="text-[11px] text-gray-400">{group.rows.length} baris</span>
                          </div>
                        </td>
                      </tr>
                      {group.rows.map((row, i) => {
                        const showName = i === 0 || group.rows[i - 1].itemName !== row.itemName
                        return (
                          <tr
                            key={`${group.customerName}-${row.itemName}-${row.kategori ?? 'null'}-${i}`}
                            className="border-t"
                            style={{ borderColor: 'var(--border-light)' }}
                          >
                            <td className="pl-10 pr-4 py-2.5 text-gray-700">
                              {showName && <span className="font-medium">{row.itemName}</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              {row.kategori
                                ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{row.kategori}</span>
                                : <span className="text-xs text-gray-300">—</span>
                              }
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-gray-800 whitespace-nowrap font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {row.qty.toLocaleString('id-ID')}
                              <span className="text-xs font-normal text-gray-400 ml-1">{row.unit}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-card)' }}>
                  <span className="text-xs text-gray-500">
                    Customer {customerPage * GROUPS_PER_PAGE + 1}–{Math.min((customerPage + 1) * GROUPS_PER_PAGE, customerGroups.length)} dari {customerGroups.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCustomerPage(p => p - 1)}
                      disabled={customerPage === 0}
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
                          borderColor: customerPage === i ? 'var(--green-primary)' : 'var(--border-card)',
                          backgroundColor: customerPage === i ? 'var(--green-primary)' : undefined,
                          color: customerPage === i ? 'white' : undefined,
                        }}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCustomerPage(p => p + 1)}
                      disabled={customerPage === totalPages - 1}
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
