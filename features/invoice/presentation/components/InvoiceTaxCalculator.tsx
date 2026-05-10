'use client'

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

interface Props {
  subtotal: number
  taxPercent: number
  taxEnabled: boolean
  pphPercent: number
  pphEnabled: boolean
  insuranceEnabled: boolean
  insuranceAmount: number
  onToggleInsurance: (enabled: boolean) => void
  onChangeInsuranceAmount: (amount: number) => void
  isPkp?: boolean
  onToggleTax: (enabled: boolean) => void
  onChangeTaxPercent: (percent: number) => void
  onTogglePph: (enabled: boolean) => void
  onChangePphPercent: (percent: number) => void
}

export default function InvoiceTaxCalculator({
  subtotal,
  taxPercent,
  taxEnabled,
  pphPercent,
  pphEnabled,
  insuranceEnabled,
  insuranceAmount,
  onToggleInsurance,
  onChangeInsuranceAmount,
  isPkp,
  onToggleTax,
  onChangeTaxPercent,
  onTogglePph,
  onChangePphPercent,
}: Props) {
  // PPN: ditambahkan ke subtotal
  const taxAmount = taxEnabled ? Math.round(subtotal * taxPercent / 100) : 0
  // PPh 23: dihitung dari DPP (subtotal sebelum PPN), bersifat potong
  const pphAmount = pphEnabled ? Math.round(subtotal * pphPercent / 100) : 0
  const netto = subtotal + taxAmount - pphAmount + (insuranceEnabled ? insuranceAmount : 0)

  return (
    <div className="space-y-3">
      {isPkp !== undefined && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: isPkp ? '#DCFCE7' : '#F3F4F6', color: isPkp ? '#166534' : '#6B7280' }}>
          {isPkp ? '✓ Customer PKP — PPN 1,1% disarankan' : 'Customer Non-PKP — PPN tidak dikenakan secara default'}
        </div>
      )}

      <div className="space-y-2">
        {/* Sub Total */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">Sub Total</span>
          <span className="font-mono font-medium" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(subtotal)}</span>
        </div>

        <div className="border-t" style={{ borderColor: 'var(--border-card)' }} />

        {/* PPN */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleTax(!taxEnabled)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{ backgroundColor: taxEnabled ? 'var(--green-primary)' : '#D1D5DB' }}
            >
              <span className="sr-only">Toggle PPN</span>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${taxEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
            <span className="text-gray-600 w-8">PPN</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="w-16 text-center form-input text-sm py-1"
              value={taxPercent}
              disabled={!taxEnabled}
              onChange={e => onChangeTaxPercent(Number(e.target.value))}
            />
            <span className="text-gray-500">%</span>
          </div>
          <span className="font-mono text-gray-600 italic" style={{ fontFamily: 'var(--font-mono)' }}>
            {taxEnabled ? `+ ${formatRupiah(taxAmount)}` : formatRupiah(0)}
          </span>
        </div>

        {/* PPh */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onTogglePph(!pphEnabled)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{ backgroundColor: pphEnabled ? '#DC2626' : '#D1D5DB' }}
            >
              <span className="sr-only">Toggle PPh</span>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${pphEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
            <span className="text-gray-600 w-8">PPh</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="w-16 text-center form-input text-sm py-1"
              value={pphPercent}
              disabled={!pphEnabled}
              onChange={e => onChangePphPercent(Number(e.target.value))}
            />
            <span className="text-gray-500">%</span>
          </div>
          <span className="font-mono italic" style={{ fontFamily: 'var(--font-mono)', color: pphEnabled ? '#DC2626' : '#9CA3AF' }}>
            {pphEnabled ? `− ${formatRupiah(pphAmount)}` : formatRupiah(0)}
          </span>
        </div>

        {pphEnabled && (
          <p className="text-[11px] text-gray-400 pl-11">
            Dipotong dari DPP (subtotal sebelum PPN) · PPh 23 pasal jasa
          </p>
        )}

        {/* Asuransi */}
        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleInsurance(!insuranceEnabled)}
              className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
              style={{ backgroundColor: insuranceEnabled ? '#0369A1' : '#D1D5DB' }}
            >
              <span className="sr-only">Toggle Asuransi</span>
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${insuranceEnabled ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
            <span className="text-gray-600">Asuransi</span>
          </div>
          <div className="flex items-center gap-1">
            {insuranceEnabled && (
              <span className="text-gray-400 text-xs">Rp</span>
            )}
            {insuranceEnabled ? (
              <input
                type="number"
                min="0"
                step="1000"
                className="w-28 text-right form-input text-sm py-1"
                value={insuranceAmount || ''}
                placeholder="0"
                onChange={e => onChangeInsuranceAmount(Math.max(0, Number(e.target.value) || 0))}
              />
            ) : (
              <span className="font-mono text-gray-400 italic" style={{ fontFamily: 'var(--font-mono)' }}>{formatRupiah(0)}</span>
            )}
          </div>
        </div>
        {insuranceEnabled && insuranceAmount > 0 && (
          <p className="text-[11px] text-gray-400 pl-11">
            Biaya asuransi — ditambahkan setelah PPN/PPh
          </p>
        )}

        <div className="border-t-2 border-double" style={{ borderColor: '#9CA3AF' }} />

        {/* Netto */}
        <div className="flex justify-between items-center">
          <div>
            <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>NETTO</span>
            {(pphEnabled || insuranceEnabled) && (
              <div className="text-[11px] text-gray-400 leading-none mt-0.5">
                {formatRupiah(subtotal)}{taxEnabled ? ` + ${formatRupiah(taxAmount)}` : ''}{pphEnabled ? ` − ${formatRupiah(pphAmount)}` : ''}{insuranceEnabled && insuranceAmount > 0 ? ` + ${formatRupiah(insuranceAmount)}` : ''}
              </div>
            )}
          </div>
          <span className="text-lg font-bold font-mono" style={{ fontFamily: 'var(--font-mono)', color: '#166534' }}>
            {formatRupiah(netto)}
          </span>
        </div>
      </div>
    </div>
  )
}
