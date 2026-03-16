'use client'

import { useEffect, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'
import { Invoice } from '../../../domain/entities/Invoice'

interface Props {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
}

export default function GeneratePDFModal({ open, invoice, onClose }: Props) {
  const [includeLogo, setIncludeLogo] = useState(true)
  const [includeSig, setIncludeSig] = useState(true)
  const [includeSJ, setIncludeSJ] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (open) { setStatus('idle'); setProgress(0) }
  }, [open])

  const handleGenerate = () => {
    setStatus('processing')
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setStatus('done')
          return 100
        }
        return prev + 10
      })
    }, 300)
  }

  const filename = `Invoice_${invoice?.invoice_number}_${invoice?.customer.name.replace(/\s+/g, '_')}.pdf`

  return (
    <ModalShell open={open} onClose={onClose} title="Cetak PDF Invoice" subtitle={`Invoice #${invoice?.invoice_number} · ${invoice?.customer.name}`}>
      <div className="space-y-4">
        {status === 'done' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#DCFCE7' }}>
              <Download size={24} style={{ color: '#166534' }} />
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">PDF Siap</p>
            <p className="text-xs text-gray-500 mb-4">{filename}</p>
            <button
              className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--green-primary)' }}
              onClick={() => alert('Simulasi: PDF diunduh')}
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        ) : status === 'processing' ? (
          <div className="py-4">
            <p className="text-sm text-center text-gray-600 mb-4">Memproses dokumen...</p>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-green-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">{progress}%</p>
          </div>
        ) : (
          <>
            {/* Template */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Template</label>
              <label className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--green-primary)', backgroundColor: '#F0FDF4' }}>
                <input type="radio" name="template" defaultChecked className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Invoice Standar PNJ</div>
                  <div className="text-xs text-gray-500 mt-0.5">Kop perusahaan, tabel item, PPN, kolom tanda tangan</div>
                </div>
              </label>
            </div>

            {/* Opsi */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Pilihan Opsional</label>
              <div className="space-y-2">
                {[
                  { id: 'logo', label: 'Sertakan kop perusahaan', value: includeLogo, set: setIncludeLogo },
                  { id: 'sig', label: 'Kolom tanda tangan & materai', value: includeSig, set: setIncludeSig },
                  { id: 'sj', label: 'Lampirkan daftar SJ terlampir (halaman terakhir PDF)', value: includeSJ, set: setIncludeSJ },
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={opt.value} onChange={e => opt.set(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mini preview */}
            <div className="flex justify-center">
              <div className="border rounded-lg p-3 text-xs text-gray-400 w-32 text-center space-y-1" style={{ borderColor: 'var(--border-card)' }}>
                <div className="font-bold text-gray-600">[LOGO] PNJ</div>
                <div className="border-t" style={{ borderColor: 'var(--border-card)' }} />
                <div className="text-gray-500">INV {invoice?.invoice_number}</div>
                <div className="border-t" style={{ borderColor: 'var(--border-card)' }} />
                {invoice?.items.slice(0, 3).map((_, i) => <div key={i}>Item {i + 1}</div>)}
                <div className="border-t" style={{ borderColor: 'var(--border-card)' }} />
                <div className="font-semibold text-gray-600">NETTO</div>
              </div>
            </div>
          </>
        )}

        {status === 'idle' && (
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>Batal</button>
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--green-primary)' }}
            >
              <Printer size={14} />
              Buat PDF
            </button>
          </div>
        )}

        {status === 'done' && (
          <div className="flex justify-center pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm text-gray-600" style={{ borderColor: 'var(--border-card)' }}>Tutup</button>
          </div>
        )}
      </div>
    </ModalShell>
  )
}
