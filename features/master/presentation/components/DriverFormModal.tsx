'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { Driver, DriverStatus, computeSIMStatus } from '@/features/master/domain/entities/Driver'

interface Props {
  open: boolean
  data: Driver | null
  isLoading: boolean
  onClose: () => void
  onSubmit: (data: Omit<Driver, 'id' | 'uuid' | 'created_at' | 'sim_status' | 'days_until_sim_expiry' | 'total_trips' | 'last_trip_date'>) => void
}

const empty = { name: '', phone: '', sim_number: '', sim_expired_at: '', status: 'active' as DriverStatus }

export default function DriverFormModal({ open, data, isLoading, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (open) {
      setForm(data ? {
        name: data.name, phone: data.phone ?? '',
        sim_number: data.sim_number ?? '',
        sim_expired_at: data.sim_expired_at ?? '',
        status: data.status,
      } : empty)
    }
  }, [open, data])

  const simPreview = useMemo(() => {
    if (!form.sim_expired_at) return null
    return computeSIMStatus(form.sim_expired_at)
  }, [form.sim_expired_at])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      sim_number: form.sim_number.trim() || null,
      sim_expired_at: form.sim_expired_at || null,
      status: form.status,
    })
  }

  const F = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const simPreviewNode = simPreview && (
    simPreview.sim_status === 'valid' ? (
      <div className="flex items-center gap-1.5 text-green-700 text-xs">
        <CheckCircle size={13} /> SIM masih valid — {simPreview.days_until_sim_expiry} hari lagi
      </div>
    ) : simPreview.sim_status === 'expiring_soon' ? (
      <div className="flex items-center gap-1.5 text-amber-700 text-xs">
        <AlertTriangle size={13} /> SIM akan kadaluarsa — {simPreview.days_until_sim_expiry} hari lagi
      </div>
    ) : (
      <div className="flex items-center gap-1.5 text-red-700 text-xs">
        <XCircle size={13} /> SIM sudah kadaluarsa
      </div>
    )
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl animate-modalEnter" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {data ? 'Edit Supir' : 'Tambah Supir'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Identitas</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Nama Supir <span className="text-red-500">*</span>
                </label>
                <input className="form-input w-full" value={form.name} onChange={e => F('name', e.target.value)} placeholder="Budi Santoso" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Telepon</label>
                <input className="form-input w-full" value={form.phone} onChange={e => F('phone', e.target.value)} placeholder="0812-1111-2222" />
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>SIM (Surat Izin Mengemudi)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nomor SIM</label>
                <input className="form-input w-full font-mono" value={form.sim_number} onChange={e => F('sim_number', e.target.value)} placeholder="1234567890AB" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Tanggal Kadaluarsa SIM</label>
                <input className="form-input w-full" type="date" value={form.sim_expired_at} onChange={e => F('sim_expired_at', e.target.value)} />
                {simPreviewNode && (
                  <div className="mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-page)' }}>
                    {simPreviewNode}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border-card)' }}>Batal</button>
            <button type="submit" disabled={isLoading || !form.name.trim()} className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50" style={{ backgroundColor: 'var(--green-primary)' }}>
              {isLoading ? 'Menyimpan...' : 'Simpan Supir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
