'use client'

import { useEffect, useState } from 'react'
import ModalShell from './ModalShell'
import { SuratJalan } from '../../../domain/entities/SuratJalan'

interface GeneratePDFModalProps {
  open: boolean
  sj: SuratJalan | null
  onClose: () => void
}

export default function GeneratePDFModal({ open, sj, onClose }: GeneratePDFModalProps) {
  const [includeHeader, setIncludeHeader] = useState(true)
  const [includeSign, setIncludeSign] = useState(true)
  const [includeNotes, setIncludeNotes] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    if (open) {
      setIsProcessing(false)
      setIsDone(false)
      setIncludeHeader(true)
      setIncludeSign(true)
      setIncludeNotes(false)
    }
  }, [open])

  const handleGenerate = () => {
    setIsProcessing(true)
    setIsDone(false)
    setTimeout(() => {
      setIsProcessing(false)
      setIsDone(true)
    }, 2000)
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Cetak PDF Surat Jalan"
      subtitle={sj ? sj.sj_number : undefined}
    >
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeHeader} onChange={e => setIncludeHeader(e.target.checked)} />
          Sertakan kop perusahaan PNJ
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeSign} onChange={e => setIncludeSign(e.target.checked)} />
          Sertakan kolom tanda tangan
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)} />
          Sertakan catatan internal
        </label>

        <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border-card)', backgroundColor: '#F9FAFB' }}>
          PDF akan dibuat secara asinkron. Proses memakan waktu ~5-10 detik.
        </div>

        {isProcessing && (
          <div className="text-sm text-gray-600">Memproses PDF...</div>
        )}
        {isDone && (
          <div className="text-sm text-green-700">✓ PDF Siap</div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--border-card)' }}>
            Batal
          </button>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: 'var(--green-primary)' }}
            disabled={isProcessing}
          >
            Buat PDF
          </button>
          {isDone && (
            <button
              onClick={() => alert('Simulasi download PDF')}
              className="px-4 py-2 rounded-lg border"
              style={{ borderColor: 'var(--border-card)' }}
            >
              Download PDF
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
