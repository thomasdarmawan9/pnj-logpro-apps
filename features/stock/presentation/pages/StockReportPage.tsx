'use client'

import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams } from 'next/navigation'
import { FileBarChart2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchStockItems, fetchStockReceipts, fetchStockDisbursements } from '@/store/slices/stockSlice'
import { calculateRunningBalance } from '@/features/stock/application/use-cases/GetStockRecap'
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

  const initialItemId = searchParams.get('itemId') ? Number(searchParams.get('itemId')) : null

  const [selectedItemId, setSelectedItemId] = useState<number | null>(initialItemId)
  const [period, setPeriod] = useState<Period>('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  useEffect(() => {
    dispatch(fetchStockItems())
    dispatch(fetchStockReceipts())
    dispatch(fetchStockDisbursements())
  }, [dispatch])

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

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Laporan Rekap</div>
          <h1 className="text-2xl font-bold">Laporan Rekap Stok</h1>
        </div>
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

          {/* Item info */}
          {selectedItem && (
            <div className="bg-white rounded-xl border shadow-sm p-4 mb-5 flex items-center gap-4" style={{ borderColor: 'var(--border-card)' }}>
              <div className="flex-1">
                <div className="font-mono text-xs text-gray-500 mb-0.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{selectedItem.code}</div>
                <div className="font-bold text-gray-900">{selectedItem.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-0.5">Stok Saat Ini</div>
                <div className={`text-2xl font-bold font-mono ${selectedItem.current_stock === 0 ? 'text-red-600' : 'text-green-700'}`}
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {selectedItem.current_stock.toLocaleString('id-ID')}
                  <span className="text-sm font-normal text-gray-400 ml-1">{selectedItem.unit}</span>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <RunningBalanceTable rows={filteredRows} unit={selectedItem?.unit ?? ''} />
        </>
      )}
    </DashboardLayout>
  )
}
