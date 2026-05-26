'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, Package, PackageMinus, PackagePlus, Rows3 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { AppDispatch, RootState } from '@/store'
import { clearSelectedCustomerStock, fetchCustomerStockDetail } from '@/store/slices/stockSlice'
import { formatDate } from '@/lib/formatters'
import StockItemBadge from '../components/StockItemBadge'

interface Props {
  uuid: string
}

export default function CustomerStockDetailPage({ uuid }: Props) {
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const { selectedCustomerStock: detail, isDetailLoading } = useSelector((state: RootState) => state.stock)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    let mounted = true
    setHasLoaded(false)
    dispatch(fetchCustomerStockDetail(uuid)).finally(() => {
      if (mounted) setHasLoaded(true)
    })

    return () => {
      mounted = false
      dispatch(clearSelectedCustomerStock())
    }
  }, [dispatch, uuid])

  if (isDetailLoading || !hasLoaded) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 bg-gray-100 rounded-xl animate-pulse" />
          <div>
            <div className="h-3 bg-gray-100 rounded w-56 mb-2 animate-pulse" />
            <div className="h-7 bg-gray-100 rounded w-72 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border shadow-sm animate-pulse" style={{ borderColor: 'var(--border-card)' }} />
          ))}
        </div>
        <div className="h-72 bg-white rounded-xl border shadow-sm animate-pulse" style={{ borderColor: 'var(--border-card)' }} />
      </DashboardLayout>
    )
  }

  if (!detail) {
    return (
      <DashboardLayout>
        <button onClick={() => router.push('/stok')} className="flex items-center gap-1.5 text-sm mb-6 text-gray-500 hover:underline">
          <ArrowLeft size={14} />
          Kembali ke Manajemen Stok
        </button>
        <div className="bg-white rounded-xl border shadow-sm py-16 text-center" style={{ borderColor: 'var(--border-card)' }}>
          <div className="text-gray-500 font-medium">Data stok customer tidak ditemukan</div>
        </div>
      </DashboardLayout>
    )
  }

  const summaryCards = [
    { label: 'Total Asset', value: detail.totalAsset.toLocaleString('id-ID'), tone: 'text-gray-900', icon: Package },
    { label: 'Total Jenis Barang', value: detail.totalItemTypes.toLocaleString('id-ID'), tone: 'text-gray-900', icon: Rows3 },
    { label: 'Total Masuk', value: `+${detail.totalIn.toLocaleString('id-ID')}`, tone: 'text-green-700', icon: PackagePlus },
    { label: 'Total Keluar', value: `-${detail.totalOut.toLocaleString('id-ID')}`, tone: 'text-red-600', icon: PackageMinus },
  ]

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/stok')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-xs text-gray-500">Dashboard / Manajemen Stok / Customer / Detail</div>
            <h1 className="text-2xl font-bold">{detail.customerName}</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {summaryCards.map(card => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: 'var(--border-card)' }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-xs text-gray-500">{card.label}</div>
                <Icon size={17} className="text-gray-400" />
              </div>
              <div className={`text-2xl font-bold ${card.tone}`}>{card.value}</div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6" style={{ borderColor: 'var(--border-card)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base">Barang Customer</h2>
        </div>
        {detail.itemRows.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Belum ada barang</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Kode</th>
                  <th className="px-4 py-3 text-left">Nama Barang</th>
                  <th className="px-4 py-3 text-left">Kategori</th>
                  <th className="px-4 py-3 text-right">Masuk</th>
                  <th className="px-4 py-3 text-right">Keluar</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {detail.itemRows.map(row => (
                  <tr key={row.stockItemId} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                    <td className="px-4 py-3">
                      <StockItemBadge code={row.code} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                    <td className="px-4 py-3">
                      {row.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {row.categories.map(category => (
                            <span key={category} className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{category}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-700">
                      +{row.totalIn.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-400">{row.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      -{row.totalOut.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-400">{row.unit}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${row.balance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {row.balance.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-400">{row.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="font-bold text-base">Riwayat Transaksi</h2>
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
                  <th className="px-4 py-3 text-left">Barang</th>
                  <th className="px-4 py-3 text-left">Kategori</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-left">Supplier / Sopir</th>
                  <th className="px-4 py-3 text-left">Referensi</th>
                  <th className="px-4 py-3 text-left">SJ</th>
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {detail.transactions.map((txn, idx) => (
                  <tr key={txn.id} className={`border-t ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`} style={{ borderColor: 'var(--border-card)' }}>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(txn.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        txn.type === 'masuk' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {txn.type === 'masuk' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{txn.number}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{txn.itemName}</div>
                      <div className="text-xs text-gray-400">{txn.itemCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      {txn.category
                        ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{txn.category}</span>
                        : <span className="text-xs text-gray-300">-</span>
                      }
                    </td>
                    <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${txn.type === 'masuk' ? 'text-green-700' : 'text-red-600'}`}>
                      {txn.type === 'masuk' ? '+' : '-'}{txn.qty.toLocaleString('id-ID')} <span className="text-xs font-normal text-gray-400">{txn.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{txn.partner}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{txn.reference}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{txn.sjNumber || '-'}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{txn.invoiceNumber || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => router.push(txn.detailPath)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 transition-colors"
                        title="Detail"
                      >
                        <Eye size={14} className="text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
