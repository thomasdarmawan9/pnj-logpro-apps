'use client'

import { StockRecapRow } from '@/features/stock/domain/value-objects/StockBalance'

interface RunningBalanceTableProps {
  rows: StockRecapRow[]
  unit: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getBalanceColor(balance: number, peak: number) {
  if (balance === 0) return 'text-red-600'
  if (peak === 0) return 'text-gray-700'
  const pct = balance / peak
  if (pct > 0.5) return 'text-green-700'
  if (pct > 0.2) return 'text-amber-700'
  return 'text-red-600'
}

export default function RunningBalanceTable({ rows, unit }: RunningBalanceTableProps) {
  const totalIn = rows.reduce((s, r) => s + (r.qty_in ?? 0), 0)
  const totalOut = rows.reduce((s, r) => s + (r.qty_out ?? 0), 0)
  const finalBalance = rows.length > 0 ? rows[rows.length - 1].balance : 0
  const peak = Math.max(...rows.map(r => r.balance), 0)

  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-3">📋</div>
        <div className="font-medium">Tidak ada data pada periode ini</div>
        <div className="text-sm mt-1">Coba ubah filter periode atau pilih barang lain</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border shadow-sm" style={{ borderColor: 'var(--border-card)' }}>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="px-3 py-3 text-center w-8">No</th>
            <th className="px-3 py-3 text-left">Tanggal</th>
            <th className="px-3 py-3 text-left">Pengirim / Sopir</th>
            <th className="px-3 py-3 text-left">No. Pol</th>
            <th className="px-3 py-3 text-left">Tujuan / Sumber</th>
            <th className="px-3 py-3 text-left">No. SJ / SPAL</th>
            <th className="px-3 py-3 text-right text-green-700">Masuk (+)</th>
            <th className="px-3 py-3 text-right text-red-600">Keluar (-)</th>
            <th className="px-3 py-3 text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className="border-t"
              style={{
                borderColor: 'var(--border-card)',
                backgroundColor: row.type === 'receipt' ? '#F0FDF4' : 'white',
                borderLeft: row.type === 'receipt' ? '3px solid #16A34A' : '3px solid transparent',
              }}
            >
              <td className="px-3 py-2.5 text-center text-gray-400">{idx + 1}</td>
              <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(row.date)}</td>
              <td className="px-3 py-2.5 font-medium text-gray-800">{row.supplier_or_driver}</td>
              <td className="px-3 py-2.5 text-gray-500 font-mono text-xs" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {row.vehicle_plate ?? '—'}
              </td>
              <td className="px-3 py-2.5 text-gray-600 max-w-[160px] truncate">{row.destination ?? (row.type === 'receipt' ? 'Penerimaan' : '—')}</td>
              <td className="px-3 py-2.5">
                <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {row.sj_or_spal}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right font-semibold text-green-700">
                {row.qty_in != null ? `+${row.qty_in.toLocaleString('id-ID')}` : ''}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold text-red-600">
                {row.qty_out != null ? `-${row.qty_out.toLocaleString('id-ID')}` : ''}
              </td>
              <td className="px-3 py-2.5 text-right">
                <span
                  className={`font-bold font-mono ${getBalanceColor(row.balance, peak)}`}
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {row.balance.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-gray-400 ml-1">{unit}</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 border-t-2" style={{ borderColor: 'var(--border-card)' }}>
          <tr>
            <td colSpan={6} className="px-3 py-3 text-xs font-semibold text-gray-600">Total</td>
            <td className="px-3 py-3 text-right font-bold text-green-700">
              +{totalIn.toLocaleString('id-ID')} {unit}
            </td>
            <td className="px-3 py-3 text-right font-bold text-red-600">
              -{totalOut.toLocaleString('id-ID')} {unit}
            </td>
            <td className="px-3 py-3 text-right">
              <span
                className={`font-bold font-mono text-base ${getBalanceColor(finalBalance, peak)}`}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {finalBalance.toLocaleString('id-ID')}
              </span>
              <span className="text-xs text-gray-500 ml-1">{unit}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
