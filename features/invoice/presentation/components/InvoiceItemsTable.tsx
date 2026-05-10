import { InvoiceItem } from '../../domain/entities/Invoice'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function calcDuration(start: string | null, end: string | null): string | null {
  if (!start || !end) return null
  const s = new Date(start)
  const e = new Date(end)
  const days = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return null
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  const parts: string[] = []
  if (years > 0) parts.push(`${years} tahun`)
  if (months > 0) parts.push(`${months} bulan`)
  return parts.length ? parts.join(' ') : `${days} hari`
}

interface Props {
  items: InvoiceItem[]
  subtotalAmount: number
  taxPercent: number
  taxAmount: number
  pphPercent: number
  pphAmount: number
  insuranceAmount: number
  totalAmount: number
}

export default function InvoiceItemsTable({ items, subtotalAmount, taxPercent, taxAmount, pphPercent, pphAmount, insuranceAmount, totalAmount }: Props) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left w-8">No</th>
            <th className="px-4 py-3 text-left">Deskripsi & Armada</th>
            <th className="px-4 py-3 text-left">Periode Pakai</th>
            <th className="px-4 py-3 text-center w-16">Qty</th>
            <th className="px-4 py-3 text-center w-20">Satuan</th>
            <th className="px-4 py-3 text-right">Harga/Unit</th>
            <th className="px-4 py-3 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const duration = calcDuration(item.period_start, item.period_end)
            return (
              <tr key={item.uuid} className="border-t" style={{ borderColor: 'var(--border-card)' }}>
                <td className="px-4 py-3 text-gray-500 align-top">{idx + 1}</td>
                <td className="px-4 py-3 align-top">
                  <div className="font-medium">{item.description}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.fleet_label}</div>
                </td>
                <td className="px-4 py-3 align-top text-xs text-gray-600">
                  {item.period_start || item.period_end ? (
                    <>
                      <div>{formatDate(item.period_start)} –</div>
                      <div>{formatDate(item.period_end)}</div>
                      {duration && <div className="text-gray-400 mt-0.5">({duration})</div>}
                    </>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-center align-top">{item.qty}</td>
                <td className="px-4 py-3 text-center align-top text-gray-500">{item.unit}</td>
                <td className="px-4 py-3 text-right align-top font-mono" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(item.unit_price)}</td>
                <td className="px-4 py-3 text-right align-top font-mono font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(item.subtotal)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t" style={{ borderColor: 'var(--border-card)' }}>
            <td colSpan={5} />
            <td className="px-4 py-2 text-right text-sm text-gray-500">Sub Total</td>
            <td className="px-4 py-2 text-right font-mono text-sm" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(subtotalAmount)}</td>
          </tr>
          {taxPercent > 0 && (
            <tr>
              <td colSpan={5} />
              <td className="px-4 py-1 text-right text-sm text-gray-500 italic">+ PPN {taxPercent}%</td>
              <td className="px-4 py-1 text-right font-mono text-sm text-gray-500 italic" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(taxAmount)}</td>
            </tr>
          )}
          {pphPercent > 0 && (
            <tr>
              <td colSpan={5} />
              <td className="px-4 py-1 text-right text-sm italic" style={{ color: '#DC2626' }}>− PPh 23 {pphPercent}%</td>
              <td className="px-4 py-1 text-right font-mono text-sm italic" style={{ fontFamily: 'var(--font-mono)', color: '#DC2626' }}>({formatRupiah(pphAmount)})</td>
            </tr>
          )}
          {insuranceAmount > 0 && (
            <tr>
              <td colSpan={5} />
              <td className="px-4 py-1 text-right text-sm text-gray-500 italic">+ Asuransi</td>
              <td className="px-4 py-1 text-right font-mono text-sm text-gray-500 italic" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(insuranceAmount)}</td>
            </tr>
          )}
          <tr className="border-t-2 border-double" style={{ borderColor: '#9CA3AF' }}>
            <td colSpan={5} />
            <td className="px-4 py-3 text-right font-bold text-base">NETTO</td>
            <td className="px-4 py-3 text-right font-bold font-mono text-base" style={{ fontFamily: 'var(--font-mono)', color: '#166534' }}>
              {formatRupiah(totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
