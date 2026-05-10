'use client'

import { useEffect, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import ModalShell from '../../../../surat-jalan/presentation/components/modals/ModalShell'
import { Invoice } from '../../../domain/entities/Invoice'
import { downloadPdfJob, generateInvoicePdf, getPdfJob } from '../../../infrastructure/repositories/MockInvoiceRepository'

interface Props {
  open: boolean
  invoice: Invoice | null
  onClose: () => void
}

export default function GeneratePDFModal({ open, invoice, onClose }: Props) {
  const [includeLogo, setIncludeLogo] = useState(true)
  const [includeSig, setIncludeSig] = useState(true)
  const [includeSJ, setIncludeSJ] = useState(false)
  const [copies, setCopies] = useState(3)
  const [copyLabel, setCopyLabel] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'failed'>('idle')
  const [jobUuid, setJobUuid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setStatus('idle')
      setJobUuid(null)
      setError(null)
      setIncludeLogo(true)
      setIncludeSig(true)
      setIncludeSJ(false)
      setCopies(3)
      setCopyLabel(false)
    }
  }, [open])

  const handleGenerate = async () => {
    if (!invoice) return
    setStatus('processing')
    setError(null)

    try {
      const job = await generateInvoicePdf(invoice.uuid, { includeLogo, includeSig, includeSJ, copies, copyLabel })
      setJobUuid(job.uuid)

      let latestStatus = job.status
      for (let i = 0; i < 25 && latestStatus !== 'done' && latestStatus !== 'failed'; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        const latest = await getPdfJob(job.uuid)
        latestStatus = latest.status
      }

      setStatus(latestStatus === 'done' ? 'done' : 'failed')
      if (latestStatus !== 'done') setError('PDF gagal dibuat atau belum selesai diproses.')
    } catch (err) {
      setStatus('failed')
      setError(err instanceof Error ? err.message : 'Gagal membuat PDF.')
    }
  }

  const handleDownload = async () => {
    if (!jobUuid || !invoice) return
    const blob = await downloadPdfJob(jobUuid)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Invoice_${invoice.invoice_number}_${invoice.customer.name.replace(/\s+/g, '_')}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ModalShell open={open} onClose={onClose} title="Cetak PDF Invoice" subtitle={`Invoice #${invoice?.invoice_number} · ${invoice?.customer.name}`}>
      <div className="space-y-4">
        {status === 'done' ? (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#DCFCE7' }}>
              <Download size={24} style={{ color: '#166534' }} />
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-1">PDF Siap</p>
            <button
              className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--green-primary)' }}
              onClick={handleDownload}
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        ) : status === 'processing' ? (
          <div className="py-4">
            <p className="text-sm text-center text-gray-600 mb-4">Memproses dokumen...</p>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-green-500 animate-pulse" style={{ width: '70%' }} />
            </div>
          </div>
        ) : (
          <>
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

            {/* Jumlah Rangkap */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Jumlah Rangkap</label>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCopies(n)}
                    className="flex-1 py-2 rounded-xl border text-sm font-medium transition-colors"
                    style={
                      copies === n
                        ? { backgroundColor: 'var(--green-primary)', color: '#fff', borderColor: 'var(--green-primary)' }
                        : { backgroundColor: '#fff', color: '#374151', borderColor: 'var(--border-card)' }
                    }
                  >
                    {n}×
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Menghasilkan {copies} salinan identik dalam satu file PDF
              </p>
            </div>

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
                {/* Label lembar — hanya tampil jika rangkap > 1 */}
                {copies > 1 && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={copyLabel} onChange={e => setCopyLabel(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">
                      Tambah label lembar
                      <span className="text-gray-400 ml-1">(Lembar 1/{copies}, 2/{copies}, …)</span>
                    </span>
                  </label>
                )}
              </div>
            </div>
          </>
        )}

        {status === 'failed' && (
          <div className="rounded-xl border px-3 py-2 text-sm text-red-700" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }}>
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border-card)' }}>
            {status === 'done' ? 'Tutup' : 'Batal'}
          </button>
          {(status === 'idle' || status === 'failed') && (
            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--green-primary)' }}
            >
              <Printer size={14} />
              Buat PDF
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
