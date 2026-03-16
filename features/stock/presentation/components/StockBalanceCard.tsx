'use client'

import Link from 'next/link'
import { StockItem } from '@/features/stock/domain/entities/StockItem'
import { StockReceipt } from '@/features/stock/domain/entities/StockReceipt'
import { StockDisbursement } from '@/features/stock/domain/entities/StockDisbursement'
import StockItemBadge from './StockItemBadge'

interface StockBalanceCardProps {
  item: StockItem
  receipts: StockReceipt[]
  disbursements: StockDisbursement[]
}

function getStockColor(current: number, peak: number) {
  if (peak === 0 || current === 0) {
    return { text: 'text-red-700', border: 'border-red-300', bg: 'bg-red-50', bar: 'bg-red-400' }
  }
  const pct = (current / peak) * 100
  if (pct > 50) return { text: 'text-green-700', border: 'border-green-300', bg: 'bg-green-50', bar: 'bg-green-500' }
  if (pct > 20) return { text: 'text-amber-700', border: 'border-amber-300', bg: 'bg-amber-50', bar: 'bg-amber-500' }
  return { text: 'text-red-700', border: 'border-red-300', bg: 'bg-red-50', bar: 'bg-red-400' }
}

export default function StockBalanceCard({ item, receipts, disbursements }: StockBalanceCardProps) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  const recentIn = receipts
    .filter(r => r.receipt_date >= thirtyDaysAgo && r.receipt_date <= today)
    .flatMap(r => r.items)
    .filter(i => i.stock_item_id === item.id)
    .reduce((sum, i) => sum + i.qty, 0)

  const recentOut = disbursements
    .filter(d => d.disbursement_date >= thirtyDaysAgo && d.disbursement_date <= today && d.stock_item_id === item.id)
    .reduce((sum, d) => sum + d.qty, 0)

  const colors = getStockColor(item.current_stock, item.peak_stock)
  const pct = item.peak_stock > 0 ? Math.min(100, Math.round((item.current_stock / item.peak_stock) * 100)) : 0
  const isLow = item.peak_stock > 0 ? (item.current_stock / item.peak_stock) < 0.2 : true

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-3 ${colors.border}`}
      style={{ borderColor: undefined, borderWidth: '1px', borderStyle: 'solid' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <StockItemBadge code={item.code} />
          <div className="font-semibold text-sm text-gray-900 leading-tight mt-1 truncate" title={item.name}>
            {item.name}
          </div>
          {item.category && (
            <div className="text-[11px] text-gray-500">{item.category}</div>
          )}
        </div>
        {isLow && (
          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
            Stok Rendah
          </span>
        )}
      </div>

      {/* Stock number */}
      <div className={`flex items-baseline gap-1.5 ${colors.text}`}>
        <span className="text-3xl font-bold font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {item.current_stock.toLocaleString('id-ID')}
        </span>
        <span className="text-sm font-medium">{item.unit}</span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-[11px] text-gray-400 mb-1">
          <span>0</span>
          <span>{pct}% dari puncak ({item.peak_stock.toLocaleString('id-ID')} {item.unit})</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${colors.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 30-day summary */}
      <div className="flex gap-3 text-xs">
        <div className="flex-1 bg-green-50 rounded-lg px-3 py-2">
          <div className="text-gray-500 text-[10px] mb-0.5">Masuk 30 hari</div>
          <div className="font-bold text-green-700">+{recentIn.toLocaleString('id-ID')}</div>
        </div>
        <div className="flex-1 bg-red-50 rounded-lg px-3 py-2">
          <div className="text-gray-500 text-[10px] mb-0.5">Keluar 30 hari</div>
          <div className="font-bold text-red-700">-{recentOut.toLocaleString('id-ID')}</div>
        </div>
      </div>

      {/* Link */}
      <Link
        href={`/stok/laporan?itemId=${item.id}`}
        className="text-xs font-semibold text-right block"
        style={{ color: 'var(--green-primary)' }}
      >
        Lihat Rekap &rarr;
      </Link>
    </div>
  )
}
