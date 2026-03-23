'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Project, ProjectStatus } from '@/features/master/domain/entities/Project'
import { Customer } from '@/features/master/domain/entities/Customer'

interface Props {
  open: boolean
  data: Project | null
  customers: Customer[]
  isLoading: boolean
  onClose: () => void
  onSubmit: (data: Omit<Project, 'id' | 'uuid' | 'code' | 'created_at' | 'sj_count' | 'sj_delivered_count' | 'invoice_count' | 'invoice_outstanding_amount' | 'invoice_paid_amount' | 'total_operational_cost' | 'gross_profit'>) => void
}

const empty = {
  name: '', contract_number: '', customer_id: 0,
  customer: { id: 0, name: '', is_pkp: false },
  start_date: '', end_date: '', status: 'active' as ProjectStatus, description: '',
}

export default function ProjectFormModal({ open, data, customers, isLoading, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (open) {
      setForm(data ? {
        name: data.name, contract_number: data.contract_number,
        customer_id: data.customer_id, customer: data.customer,
        start_date: data.start_date, end_date: data.end_date ?? '',
        status: data.status, description: data.description ?? '',
      } : empty)
    }
  }, [open, data])

  if (!open) return null

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = customers.find(c => c.id === Number(e.target.value))
    if (selected) {
      setForm(p => ({
        ...p, customer_id: selected.id,
        customer: { id: selected.id, name: selected.name, is_pkp: selected.is_pkp },
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: form.name.trim(),
      contract_number: form.contract_number.trim(),
      customer_id: form.customer_id,
      customer: form.customer,
      start_date: form.start_date,
      end_date: form.end_date || null,
      status: form.status,
      description: form.description.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl animate-modalEnter overflow-y-auto max-h-[90vh]" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {data ? 'Edit Proyek' : 'Tambah Proyek'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section 1 — Identitas */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Identitas Proyek</p>
            {data && (
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Kode Proyek</label>
                <input className="form-input w-full font-mono" value={data.code} readOnly disabled style={{ opacity: 0.6 }} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Nama Proyek <span className="text-red-500">*</span>
              </label>
              <input className="form-input w-full" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Proyek Sewa Kendaraan Maret" required />
            </div>
          </div>

          {/* Section 2 — Kontrak */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Informasi Kontrak</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Customer <span className="text-red-500">*</span>
                </label>
                <select className="form-input w-full" value={form.customer_id || ''} onChange={handleCustomerChange} required>
                  <option value="">Pilih Customer...</option>
                  {customers.map(c => (
                    <option key={c.uuid} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  No. Kontrak <span className="text-red-500">*</span>
                </label>
                <input className="form-input w-full" value={form.contract_number} onChange={e => setForm(p => ({ ...p, contract_number: e.target.value }))} placeholder="002/HRD/III/2026" required />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Nomor kontrak wajib diisi. Akan tampil di header invoice.</p>
              </div>
            </div>
          </div>

          {/* Section 3 — Periode */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Periode</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  Tanggal Mulai <span className="text-red-500">*</span>
                </label>
                <input className="form-input w-full" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Tanggal Selesai</label>
                <input className="form-input w-full" type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Section 4 — Deskripsi */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Keterangan</label>
            <textarea className="form-input w-full resize-none" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Deskripsi proyek..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border-card)' }}>Batal</button>
            <button type="submit" disabled={isLoading || !form.name.trim() || !form.contract_number.trim() || !form.customer_id || !form.start_date} className="px-5 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--green-primary)' }}>
              {isLoading ? 'Menyimpan...' : 'Simpan Proyek'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
