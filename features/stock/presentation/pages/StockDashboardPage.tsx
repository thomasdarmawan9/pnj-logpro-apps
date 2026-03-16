'use client'

import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { PackagePlus, PackageMinus, Package } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { RootState, AppDispatch } from '@/store'
import { fetchStockItems, fetchStockReceipts, fetchStockDisbursements } from '@/store/slices/stockSlice'
import StockBalanceCard from '../components/StockBalanceCard'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

export default function StockDashboardPage() {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { items, receipts, disbursements, isLoading } = useSelector((state: RootState) => state.stock)

  useEffect(() => {
    dispatch(fetchStockItems())
    dispatch(fetchStockReceipts())
    dispatch(fetchStockDisbursements())
  }, [dispatch])

  // Chart data: last 30 days daily in/out
  const chartData = useMemo(() => {
    const now = new Date()
    const days: { date: string; label: string; masuk: number; keluar: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split('T')[0]
      const masuk = receipts
        .filter(r => r.receipt_date === dateStr)
        .flatMap(r => r.items)
        .reduce((s, it) => s + it.qty, 0)
      const keluar = disbursements
        .filter(d => d.disbursement_date === dateStr)
        .reduce((s, d) => s + d.qty, 0)
      days.push({ date: dateStr, label: formatDate(dateStr), masuk, keluar })
    }
    return days
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

      {/* Stock balance cards grid */}
      <h2 className="font-bold text-base mb-3">Saldo Stok per Barang</h2>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border shadow-sm p-4 animate-pulse" style={{ borderColor: 'var(--border-card)' }}>
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-2 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border shadow-sm p-12 text-center mb-6" style={{ borderColor: 'var(--border-card)' }}>
          <Package size={48} className="mx-auto text-gray-200 mb-3" />
          <div className="text-gray-500">Belum ada barang terdaftar</div>
          <button
            onClick={() => router.push('/stok/barang')}
            className="mt-3 text-sm font-semibold"
            style={{ color: 'var(--green-primary)' }}
          >
            Tambah Barang &rarr;
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {items.filter(i => i.is_active).map(item => (
            <StockBalanceCard key={item.uuid} item={item} receipts={receipts} disbursements={disbursements} />
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white rounded-xl border shadow-sm p-5 mb-6" style={{ borderColor: 'var(--border-card)' }}>
        <h2 className="font-bold text-base mb-4">Pergerakan Stok 30 Hari Terakhir</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16A34A" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#DC2626" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(value, name) => [value, name === 'masuk' ? 'Masuk' : 'Keluar']}
              labelFormatter={label => `Tanggal: ${label}`}
            />
            <Legend formatter={v => v === 'masuk' ? 'Masuk' : 'Keluar'} />
            <Area type="monotone" dataKey="masuk" stroke="#16A34A" fill="url(#colorMasuk)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="keluar" stroke="#DC2626" fill="url(#colorKeluar)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

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
