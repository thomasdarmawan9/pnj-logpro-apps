'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Customer } from '@/features/master/domain/entities/Customer'

interface Props {
  open: boolean
  data: Customer | null
  isLoading: boolean
  onClose: () => void
  onSubmit: (data: Omit<Customer, 'id' | 'uuid' | 'created_at' | 'updated_at' | 'deleted_at' | 'active_project_count' | 'total_invoice_outstanding'>) => void
}

const empty = {
  name: '', pic_name: '', phone: '', email: '',
  address: '', npwp: '', is_pkp: false,
}

export default function CustomerFormModal({ open, data, isLoading, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (open) {
      setForm(data ? {
        name: data.name, pic_name: data.pic_name ?? '', phone: data.phone ?? '',
        email: data.email ?? '', address: data.address ?? '',
        npwp: data.npwp ?? '', is_pkp: data.is_pkp,
      } : empty)
    }
  }, [open, data])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: form.name.trim(),
      pic_name: form.pic_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      npwp: form.npwp.trim() || null,
      is_pkp: form.is_pkp,
    })
  }

  const F = (k: keyof typeof form, v: string | boolean) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl animate-modalEnter" style={{ backgroundColor: 'var(--bg-card)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {data ? 'Edit Customer' : 'Tambah Customer'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section 1 — Identitas */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Identitas</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Nama Perusahaan <span className="text-red-500">*</span>
                </label>
                <input
                  className="form-input w-full"
                  value={form.name}
                  onChange={e => F('name', e.target.value)}
                  placeholder="PT. ATP BIO"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nama PIC</label>
                <input
                  className="form-input w-full"
                  value={form.pic_name}
                  onChange={e => F('pic_name', e.target.value)}
                  placeholder="Budi Hartono"
                />
              </div>
            </div>
          </div>

          {/* Section 2 — Kontak */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Kontak</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Nomor Telepon</label>
                  <input className="form-input w-full" value={form.phone} onChange={e => F('phone', e.target.value)} placeholder="0812-3456-7890" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Email</label>
                  <input className="form-input w-full" type="email" value={form.email} onChange={e => F('email', e.target.value)} placeholder="finance@company.co.id" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Alamat</label>
                <textarea className="form-input w-full resize-none" rows={2} value={form.address} onChange={e => F('address', e.target.value)} placeholder="Jl. Raya..." />
              </div>
            </div>
          </div>

          {/* Section 3 — Perpajakan */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Data Perpajakan</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>NPWP</label>
                <input className="form-input w-full font-mono" value={form.npwp} onChange={e => F('npwp', e.target.value)} placeholder="01.234.567.8-901.000" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Status PKP</label>
                <button
                  type="button"
                  onClick={() => F('is_pkp', !form.is_pkp)}
                  className="w-full flex items-center justify-between rounded-xl px-4 py-3 transition-all border"
                  style={{
                    backgroundColor: form.is_pkp ? '#F0FDF4' : '#F8FAFC',
                    borderColor: form.is_pkp ? '#16A34A' : 'var(--border-card)',
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Wajib Pajak PKP</span>
                  <div className="flex items-center gap-2">
                    {form.is_pkp ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                        PKP — PPN 1,1% disarankan
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F1F5F9', color: '#475569' }}>
                        Non-PKP — PPN 0%
                      </span>
                    )}
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${form.is_pkp ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_pkp ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
              style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border-card)' }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading || !form.name.trim()}
              className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
              style={{ backgroundColor: 'var(--green-primary)' }}
            >
              {isLoading ? 'Menyimpan...' : 'Simpan Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
