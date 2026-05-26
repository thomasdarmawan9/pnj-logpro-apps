'use client'

import { useEffect, useState, useMemo, Fragment } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'next/navigation'
import { FileBarChart2, Printer } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchStockItems, fetchStockReceipts, fetchStockDisbursements } from '@/store/slices/stockSlice'
import { fetchCustomers } from '@/store/slices/masterSlice'
import { calculateRunningBalance } from '@/features/stock/application/use-cases/GetStockRecap'
import { apiDownload } from '@/lib/apiClient'
import RunningBalanceTable from '../components/RunningBalanceTable'

type Period = 'all' | 'this_month' | 'last_month' | 'custom'

function getPeriodDates(period: Period): { from: string; to: string } {
  const now = new Date()
  if (period === 'this_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      to: now.toISOString().split('T')[0],
    }
  }
  if (period === 'last_month') {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
    return {
      from: lastMonth.toISOString().split('T')[0],
      to: lastDay.toISOString().split('T')[0],
    }
  }
  return { from: '', to: '' }
}

export default function StockReportPage() {
  const searchParams = useSearchParams()
  const dispatch = useDispatch<AppDispatch>()
  const { items, receipts, disbursements, isLoading } = useSelector((state: RootState) => state.stock)
  const { customers } = useSelector((state: RootState) => state.master)

  const initialItemId = searchParams.get('itemId') ? Number(searchParams.get('itemId')) : null

  const [selectedItemId, setSelectedItemId] = useState<number | null>(initialItemId)
  const [period, setPeriod] = useState<Period>('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [isPrintingPdf, setIsPrintingPdf] = useState(false)

  useEffect(() => {
    dispatch(fetchStockItems())
    dispatch(fetchStockReceipts())
    dispatch(fetchStockDisbursements())
    if (!customers.length) dispatch(fetchCustomers())
  }, [dispatch, customers.length])

  const selectedItem = items.find(i => i.id === selectedItemId)
  const periodDates = period === 'custom' ? { from: customFrom, to: customTo } : getPeriodDates(period)

  const allRows = useMemo(() => {
    if (!selectedItemId) return []
    return calculateRunningBalance(receipts, disbursements, selectedItemId)
  }, [receipts, disbursements, selectedItemId])

  const filteredRows = useMemo(() => {
    if (!selectedItemId) return []
    if (period === 'all') return allRows
    return calculateRunningBalance(receipts, disbursements, selectedItemId, periodDates.from || undefined, periodDates.to || undefined)
  }, [allRows, receipts, disbursements, selectedItemId, period, periodDates.from, periodDates.to])

  // Summary
  const openingBalance = filteredRows.length > 0 ? filteredRows[0].balance - (filteredRows[0].qty_in ?? 0) + (filteredRows[0].qty_out ?? 0) : 0
  const totalIn = filteredRows.reduce((s, r) => s + (r.qty_in ?? 0), 0)
  const totalOut = filteredRows.reduce((s, r) => s + (r.qty_out ?? 0), 0)
  const closingBalance = filteredRows.length > 0 ? filteredRows[filteredRows.length - 1].balance : 0

  // Stok per kategori — semua waktu (untuk menghitung estimasi stok saat ini per tipe)
  // Karena disbursement tidak punya kategori, kita distribusikan keluar secara proporsional
  const kategoriStok = useMemo(() => {
    if (!selectedItemId || !selectedItem) return []
    const map = new Map<string, number>()
    for (const r of receipts) {
      for (const item of r.items) {
        if (item.stock_item_id !== selectedItemId || !item.kategori_name) continue
        map.set(item.kategori_name, (map.get(item.kategori_name) ?? 0) + item.qty)
      }
    }
    if (map.size === 0) return []
    const totalMasukKategori = Array.from(map.values()).reduce((s, v) => s + v, 0)
    const currentStock = selectedItem.current_stock
    return Array.from(map.entries())
      .map(([name, totalMasuk]) => ({
        name,
        totalMasuk,
        estimasiSisa: totalMasukKategori > 0
          ? Math.round((totalMasuk / totalMasukKategori) * currentStock)
          : 0,
        persen: totalMasukKategori > 0 ? Math.round((totalMasuk / totalMasukKategori) * 100) : 0,
      }))
      .sort((a, b) => b.totalMasuk - a.totalMasuk)
  }, [receipts, selectedItemId, selectedItem])

  // Detail Kategorisasi — dikelompokkan per nama kategori, dengan sub-baris per penerimaan
  // Filter sesuai periode yang dipilih
  interface KategoriEntry {
    receipt_number: string
    receipt_date: string
    document_number: string | null
    supplier_name: string | null
    customer_name: string | null
    qty: number
  }
  interface KategoriDetail {
    name: string
    total: number
    entries: KategoriEntry[]
  }
  const kategoriDetail = useMemo((): KategoriDetail[] => {
    if (!selectedItemId) return []
    const map = new Map<string, KategoriDetail>()
    for (const r of receipts) {
      // Filter periode
      if (period !== 'all') {
        if (periodDates.from && r.receipt_date < periodDates.from) continue
        if (periodDates.to && r.receipt_date > periodDates.to) continue
      }
      for (const item of r.items) {
        if (item.stock_item_id !== selectedItemId) continue
        if (!item.kategori_name) continue
        const key = item.kategori_name
        if (!map.has(key)) map.set(key, { name: key, total: 0, entries: [] })
        const detail = map.get(key)!
        detail.total += item.qty
        detail.entries.push({
          receipt_number: r.receipt_number,
          receipt_date: r.receipt_date,
          document_number: r.document_number,
          supplier_name: r.supplier_name,
          customer_name: r.customer?.name ?? null,
          qty: item.qty,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [receipts, selectedItemId, period, periodDates.from, periodDates.to])

  // Per Customer — qty masuk (receipt tagged ke customer) dan qty keluar (disbursement) per customer+kategori
  interface CustomerKategoriRow {
    customer_name: string
    barang_name: string
    kategori_name: string | null
    qty_in: number
    qty_out: number
  }
  const customerRows = useMemo((): CustomerKategoriRow[] => {
    if (!selectedItemId || !selectedItem) return []
    const rows: CustomerKategoriRow[] = []
    const custFilter = selectedCustomerId

    // Kumpulkan receipts
    for (const r of receipts) {
      if (custFilter && r.customer_id !== custFilter) continue
      if (!r.customer_id) continue
      const custName = r.customer?.name ?? `Customer #${r.customer_id}`
      for (const item of r.items) {
        if (item.stock_item_id !== selectedItemId) continue
        const existing = rows.find(
          row => row.customer_name === custName && row.kategori_name === (item.kategori_name ?? null) && row.qty_out === 0
        )
        if (existing) {
          existing.qty_in += item.qty
        } else {
          rows.push({ customer_name: custName, barang_name: selectedItem.name, kategori_name: item.kategori_name ?? null, qty_in: item.qty, qty_out: 0 })
        }
      }
    }

    // Kumpulkan disbursements
    for (const d of disbursements) {
      if (custFilter && d.customer_id !== custFilter) continue
      if (!d.customer_id) continue
      if (d.stock_item_id !== selectedItemId) continue
      const custName = d.customer?.name ?? `Customer #${d.customer_id}`
      const kategoriName = d.kategori_name ?? null
      const existing = rows.find(row => row.customer_name === custName && row.kategori_name === kategoriName)
      if (existing) {
        existing.qty_out += d.qty
      } else {
        rows.push({ customer_name: custName, barang_name: selectedItem.name, kategori_name: kategoriName, qty_in: 0, qty_out: d.qty })
      }
    }

    return rows.sort((a, b) => a.customer_name.localeCompare(b.customer_name))
  }, [receipts, disbursements, selectedItemId, selectedItem, selectedCustomerId])

  const handlePrintPdf = async () => {
    if (!selectedItem) return

    setIsPrintingPdf(true)
    try {
      const params = new URLSearchParams({
        stock_item_uuid: selectedItem.uuid,
        period,
      })
      const selectedCustomer = selectedCustomerId
        ? customers.find(customer => customer.id === selectedCustomerId)
        : null
      if (selectedCustomer?.uuid) params.set('customer_uuid', selectedCustomer.uuid)
      if (period === 'custom') {
        if (customFrom) params.set('from', customFrom)
        if (customTo) params.set('to', customTo)
      }

      const blob = await apiDownload(`/stock/report/export/pdf?${params.toString()}`)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rekap-stok-${selectedItem.code}-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } finally {
      setIsPrintingPdf(false)
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Laporan Rekap</div>
          <h1 className="text-2xl font-bold">Laporan Rekap Stok</h1>
        </div>
        <button
          type="button"
          onClick={handlePrintPdf}
          disabled={!selectedItem || isPrintingPdf}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: 'var(--border-card)' }}
        >
          <Printer size={16} />
          {isPrintingPdf ? 'Mencetak...' : 'Cetak PDF'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border shadow-sm p-5 mb-5" style={{ borderColor: 'var(--border-card)' }}>
        <h2 className="font-bold text-sm text-gray-700 mb-3">Filter Laporan</h2>
        <div className="flex flex-wrap gap-4">
          {/* Item selector */}
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Barang <span className="text-red-500">*</span>
            </label>
            <select
              className="form-input w-full"
              value={selectedItemId ?? ''}
              onChange={e => setSelectedItemId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">— Pilih Barang —</option>
              {items.filter(i => i.is_active).map(item => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Periode</label>
            <select
              className="form-input"
              value={period}
              onChange={e => setPeriod(e.target.value as Period)}
            >
              <option value="all">Semua Waktu</option>
              <option value="this_month">Bulan Ini</option>
              <option value="last_month">Bulan Lalu</option>
              <option value="custom">Kustom</option>
            </select>
          </div>

          {/* Custom date range */}
          {period === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Dari Tanggal</label>
                <input
                  type="date"
                  className="form-input"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Sampai Tanggal</label>
                <input
                  type="date"
                  className="form-input"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex items-end">
            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={!selectedItem || isPrintingPdf}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: 'var(--green-primary)' }}
            >
              <Printer size={16} />
              {isPrintingPdf ? 'Mencetak...' : 'Cetak PDF'}
            </button>
          </div>
        </div>
      </div>

      {!selectedItemId ? (
        <div className="bg-white rounded-xl border shadow-sm p-16 text-center" style={{ borderColor: 'var(--border-card)' }}>
          <FileBarChart2 size={48} className="mx-auto text-gray-200 mb-3" />
          <div className="text-gray-500 font-medium">Pilih barang untuk melihat rekap stok</div>
          <div className="text-sm text-gray-400 mt-1">Rekap menampilkan pergerakan stok masuk dan keluar dengan saldo berjalan</div>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-4 mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border shadow-sm p-4 animate-pulse" style={{ borderColor: 'var(--border-card)' }}>
                <div className="h-3 bg-gray-100 rounded w-2/3 mb-2" />
                <div className="h-7 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
          <div className="h-64 bg-white rounded-xl border shadow-sm animate-pulse" style={{ borderColor: 'var(--border-card)' }} />
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
              <div className="text-xs text-gray-500 mb-1">Stok Awal</div>
              <div className="text-xl font-bold text-gray-900 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {openingBalance.toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-gray-400">{selectedItem?.unit}</div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
              <div className="text-xs text-gray-500 mb-1">Total Masuk</div>
              <div className="text-xl font-bold text-green-700 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                +{totalIn.toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-gray-400">{selectedItem?.unit}</div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
              <div className="text-xs text-gray-500 mb-1">Total Keluar</div>
              <div className="text-xl font-bold text-red-600 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                -{totalOut.toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-gray-400">{selectedItem?.unit}</div>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
              <div className="text-xs text-gray-500 mb-1">Sisa Akhir</div>
              <div className={`text-xl font-bold font-mono ${closingBalance === 0 ? 'text-red-600' : 'text-gray-900'}`}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {closingBalance.toLocaleString('id-ID')}
              </div>
              <div className="text-xs text-gray-400">{selectedItem?.unit}</div>
            </div>
          </div>

          {/* Item info + breakdown kategori */}
          {selectedItem && (
            <div className="bg-white rounded-xl border shadow-sm mb-5" style={{ borderColor: 'var(--border-card)' }}>
              {/* Baris atas: nama & total stok */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1">
                  <div className="font-mono text-xs text-gray-400 mb-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {selectedItem.code}
                  </div>
                  <div className="font-bold text-gray-900 text-base">{selectedItem.name}</div>
                  {selectedItem.description && (
                    <div className="text-xs text-gray-400 mt-0.5">{selectedItem.description}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-gray-500 mb-0.5">Stok Saat Ini (Total)</div>
                  <div
                    className={`text-2xl font-bold font-mono ${selectedItem.current_stock === 0 ? 'text-red-600' : 'text-green-700'}`}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {selectedItem.current_stock.toLocaleString('id-ID')}
                    <span className="text-sm font-normal text-gray-400 ml-1">{selectedItem.unit}</span>
                  </div>
                </div>
              </div>

              {/* Breakdown per kategori */}
              {kategoriStok.length > 0 && (
                <div className="border-t px-5 py-4" style={{ borderColor: 'var(--border-card)' }}>
                  <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                    Estimasi Stok Saat Ini per Kategori
                  </div>
                  <div className="space-y-3">
                    {kategoriStok.map(kat => (
                      <div key={kat.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              {kat.name}
                            </span>
                            <span className="text-xs text-gray-400">{kat.persen}% dari total masuk</span>
                          </div>
                          <div className="flex items-center gap-3 text-right">
                            <div className="text-xs text-gray-400">
                              Masuk: <span className="font-semibold text-gray-600">{kat.totalMasuk.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="text-sm font-bold font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              <span className={kat.estimasiSisa === 0 ? 'text-red-500' : 'text-green-700'}>
                                ~{kat.estimasiSisa.toLocaleString('id-ID')}
                              </span>
                              <span className="text-xs font-normal text-gray-400 ml-1">{selectedItem.unit}</span>
                            </div>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-400 h-1.5 rounded-full transition-all"
                            style={{ width: `${kat.persen}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 text-[10px] text-gray-300 italic">
                    * Estimasi dihitung proporsional dari total masuk per kategori. Keluar dicatat di level induk.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Running Balance Table */}
          <RunningBalanceTable rows={filteredRows} unit={selectedItem?.unit ?? ''} />

          {/* Detail Kategorisasi per Penerimaan */}
          {kategoriDetail.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-5 mt-5" style={{ borderColor: 'var(--border-card)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-bold text-sm text-gray-700">Detail Penerimaan per Kategori</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Rincian dokumen masuk dikelompokkan per tipe/kategori barang
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Total kategori</div>
                  <div className="text-lg font-bold text-blue-700">{kategoriDetail.length} tipe</div>
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-card)' }}>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Kategori / No. Dokumen</th>
                      <th className="px-4 py-3 text-left">Tanggal</th>
                      <th className="px-4 py-3 text-left">Supplier</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-right text-green-700">Qty Masuk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kategoriDetail.map((kat) => (
                      <Fragment key={kat.name}>
                        {/* Header baris per kategori */}
                        <tr key={`kat-${kat.name}`} className="bg-blue-50 border-t-2 border-blue-200">
                          <td className="px-4 py-2.5" colSpan={4}>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-600 text-white">
                                {kat.name}
                              </span>
                              <span className="text-xs text-blue-500">
                                {kat.entries.length} penerimaan
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="font-bold text-blue-700 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              +{kat.total.toLocaleString('id-ID')}
                            </span>
                            <span className="text-xs text-blue-400 ml-1">{selectedItem?.unit}</span>
                          </td>
                        </tr>
                        {/* Sub-baris per penerimaan */}
                        {kat.entries.map((entry, ei) => (
                          <tr
                            key={`${kat.name}-entry-${ei}`}
                            className="border-t"
                            style={{ borderColor: 'var(--border-card)' }}
                          >
                            <td className="px-4 py-2.5 pl-8">
                              <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                                <span className="text-gray-300">↳</span>
                                {entry.document_number && (
                                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                                    {entry.document_number}
                                  </span>
                                )}
                                <span className="text-gray-400">{entry.receipt_number}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                              {new Date(entry.receipt_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-gray-600">{entry.supplier_name ?? '—'}</td>
                            <td className="px-4 py-2.5 text-xs">
                              {entry.customer_name
                                ? <span className="text-gray-700">{entry.customer_name}</span>
                                : <span className="text-gray-300 italic">Umum</span>
                              }
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-green-700 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              +{entry.qty.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2" style={{ borderColor: 'var(--border-card)' }}>
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-600">
                        Total semua kategori
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-700 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        +{kategoriDetail.reduce((s, k) => s + k.total, 0).toLocaleString('id-ID')}
                        <span className="text-xs font-normal text-gray-400 ml-1">{selectedItem?.unit}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Per Customer */}
          <div className="bg-white rounded-xl border shadow-sm p-5 mt-5" style={{ borderColor: 'var(--border-card)' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm text-gray-700">Data per Customer</h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Filter Customer:</label>
                <select
                  className="form-input text-sm py-1.5"
                  value={selectedCustomerId ?? ''}
                  onChange={e => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Semua Customer</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {customerRows.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Tidak ada data transaksi customer untuk barang ini</div>
            ) : (
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border-card)' }}>
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Barang</th>
                      <th className="px-4 py-3 text-left">Kategori Barang</th>
                      <th className="px-4 py-3 text-right text-green-700">Qty Masuk</th>
                      <th className="px-4 py-3 text-right text-red-600">Qty Keluar</th>
                      <th className="px-4 py-3 text-right">Total Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerRows.map((row, i) => {
                      const total = row.qty_in - row.qty_out
                      return (
                        <tr key={i} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                          <td className="px-4 py-3 font-medium text-gray-800">{row.customer_name}</td>
                          <td className="px-4 py-3 text-gray-600">{row.barang_name}</td>
                          <td className="px-4 py-3">
                            {row.kategori_name
                              ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{row.kategori_name}</span>
                              : <span className="text-xs text-gray-400 italic">Tanpa Kategori</span>
                            }
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-700 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {row.qty_in > 0 ? `+${row.qty_in.toLocaleString('id-ID')}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-600 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            {row.qty_out > 0 ? `-${row.qty_out.toLocaleString('id-ID')}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right font-bold font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            <span className={total >= 0 ? 'text-gray-800' : 'text-red-600'}>
                              {total.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-400">{selectedItem?.unit}</span>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2" style={{ borderColor: 'var(--border-card)' }}>
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-600">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        +{customerRows.reduce((s, r) => s + r.qty_in, 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        -{customerRows.reduce((s, r) => s + r.qty_out, 0).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-800 font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {(customerRows.reduce((s, r) => s + r.qty_in, 0) - customerRows.reduce((s, r) => s + r.qty_out, 0)).toLocaleString('id-ID')}
                        <span className="text-xs font-normal text-gray-400 ml-1">{selectedItem?.unit}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
