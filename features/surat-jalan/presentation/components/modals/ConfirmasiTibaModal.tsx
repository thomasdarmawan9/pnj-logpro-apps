'use client'

import { useEffect, useState } from 'react'
import ModalShell from './ModalShell'
import { SuratJalan } from '../../../domain/entities/SuratJalan'
import SJPODUploadZone from '../SJPODUploadZone'

interface ConfirmasiTibaModalProps {
  open: boolean
  sj: SuratJalan | null
  onClose: () => void
  onConfirm: (input: { delivered_at: string; pod_photo_path: string }) => void
}

export default function ConfirmasiTibaModal({ open, sj, onClose, onConfirm }: ConfirmasiTibaModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [deliveredAt, setDeliveredAt] = useState('')
  const [podPath, setPodPath] = useState('')

  useEffect(() => {
    if (open) {
      setStep(1)
      setDeliveredAt(new Date().toISOString().slice(0, 16))
      setPodPath('')
    }
  }, [open])

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={step === 1 ? 'Konfirmasi SJ Telah Tiba' : 'Upload Foto Bukti Pengiriman'}
      subtitle={sj ? sj.sj_number : undefined}
      widthClass="max-w-[600px]"
    >
      {step === 1 ? (
        <div className="space-y-4">
          <div className="rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--border-card)', backgroundColor: '#F9FAFB' }}>
            <div className="font-semibold">{sj?.sj_number}</div>
            <div className="text-xs text-gray-500 mt-1">Tujuan: {sj?.destination}</div>
            <div className="text-xs text-gray-500">Supir: {sj?.driver?.name || sj?.driver_name_manual || '-'}</div>
          </div>

          <label className="text-xs font-medium" style={{ color: '#374151' }}>
            Waktu Tiba
            <input
              type="datetime-local"
              className="form-input w-full mt-1"
              value={deliveredAt}
              onChange={e => setDeliveredAt(e.target.value)}
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--border-card)' }}>
              Batal
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: 'var(--green-primary)' }}
            >
              Lanjut ke Upload Foto Bukti Pengiriman →
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">Foto Bukti Pengiriman</div>
          <SJPODUploadZone onUpload={setPodPath} currentPhoto={sj?.pod_photo_path || null} />

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--border-card)' }}>
              ← Kembali
            </button>
            <button
              onClick={() => onConfirm({ delivered_at: new Date(deliveredAt).toISOString(), pod_photo_path: podPath })}
              className="px-4 py-2 rounded-lg text-white"
              style={{ backgroundColor: podPath ? 'var(--green-primary)' : '#A7D7B2' }}
              disabled={!podPath}
            >
              Konfirmasi Tiba ✓
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
