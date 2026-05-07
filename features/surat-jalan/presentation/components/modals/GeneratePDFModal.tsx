'use client'

import { useEffect, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import ModalShell from './ModalShell'
import { SuratJalan } from '../../../domain/entities/SuratJalan'
import { downloadPdfJob, generateSuratJalanPdf, getPdfJob } from '../../../infrastructure/repositories/MockSuratJalanRepository'

interface GeneratePDFModalProps {
  open: boolean
  sj: SuratJalan | null
  onClose: () => void
}

export default function GeneratePDFModal({ open, sj, onClose }: GeneratePDFModalProps) {
  const [includeHeader, setIncludeHeader] = useState(true)
  const [includeSign, setIncludeSign] = useState(true)
  const [includeNotes, setIncludeNotes] = useState(false)
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'failed'>('idle')
  const [jobUuid, setJobUuid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setStatus('idle')
      setJobUuid(null)
      setError(null)
      setIncludeHeader(true)
      setIncludeSign(true)
      setIncludeNotes(false)
    }
  }, [open])

  const handleGenerate = async () => {
    if (!sj) return
    setStatus('processing')
    setError(null)

    try {
      const job = await generateSuratJalanPdf(sj.uuid, { includeHeader, includeSign, includeNotes })
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
    if (!jobUuid || !sj) return
    const blob = await downloadPdfJob(jobUuid)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${sj.sj_number}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Cetak PDF Surat Jalan"
      subtitle={sj ? sj.sj_number : undefined}
    >
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
                <input type="radio" name="template" defaultChecked className="mt-0.5" readOnly />
                <div>
                  <div className="text-sm font-medium">Surat Jalan Standar PNJ</div>
                  <div className="text-xs text-gray-500 mt-0.5">Detail pengiriman, armada, supir, proyek</div>
                </div>
              </label>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">Pilihan Opsional</label>
              <div className="space-y-2">
                {[
                  { id: 'header', label: 'Sertakan kop perusahaan PNJ', value: includeHeader, set: setIncludeHeader },
                  { id: 'sign',   label: 'Kolom tanda tangan', value: includeSign, set: setIncludeSign },
                  { id: 'notes',  label: 'Sertakan catatan internal', value: includeNotes, set: setIncludeNotes },
                ].map(opt => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={opt.value} onChange={e => opt.set(e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
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
