'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Fleet, FleetCategory, FleetStatus, FLEET_CATEGORY_CONFIG } from '@/features/master/domain/entities/Fleet'

interface Props {
  open: boolean
  data: Fleet | null
  isLoading: boolean
  onClose: () => void
  onSubmit: (data: Omit<Fleet, 'id' | 'uuid' | 'created_at' | 'total_trips' | 'active_days_this_month' | 'last_used_date'>) => void
}

const empty = {
  plate_number: '', name: '', category: 'family_car' as FleetCategory,
  brand: '', year: new Date().getFullYear(), capacity_ton: '',
  status: 'active' as FleetStatus, is_tbd: false,
  photo_path: null as string | null, notes: '',
}

export default function FleetFormModal({ open, data, isLoading, onClose, onSubmit }: Props) {
  const [form, setForm] = useState(empty)

  useEffect(() => {
    if (open) {
      setForm(data ? {
        plate_number: data.plate_number, name: data.name,
        category: data.category, brand: data.brand ?? '',
        year: data.year ?? new Date().getFullYear(),
        capacity_ton: data.capacity_ton != null ? String(data.capacity_ton) : '',
        status: data.status, is_tbd: data.is_tbd,
        photo_path: data.photo_path, notes: data.notes ?? '',
      } : empty)
    }
  }, [open, data])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      plate_number: form.plate_number.toUpperCase().trim(),
      name: form.name.trim(),
      category: form.category,
      brand: form.brand.trim() || null,
      year: Number(form.year) || null,
      capacity_ton: form.capacity_ton !== '' ? Number(form.capacity_ton) : null,
      status: form.status,
      is_tbd: form.is_tbd,
      photo_path: form.photo_path,
      notes: form.notes.trim() || null,
    })
  }

  const F = (k: keyof typeof form, v: string | number | boolean | null) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl shadow-2xl animate-modalEnter overflow-y-auto max-h-[90vh]" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-card)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {data ? 'Edit Armada' : 'Tambah Armada'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section 1 */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Identitas Kendaraan</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    Plat Nomor <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="form-input w-full font-mono uppercase"
                    value={form.plate_number}
                    onChange={e => F('plate_number', e.target.value.toUpperCase())}
                    placeholder="KB 1561 HX"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                    Nama Kendaraan <span className="text-red-500">*</span>
                  </label>
                  <input className="form-input w-full" value={form.name} onChange={e => F('name', e.target.value)} placeholder="Toyota Zenix" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Kategori <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FLEET_CATEGORY_CONFIG) as FleetCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => F('category', cat)}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-left transition-all border"
                      style={{
                        backgroundColor: form.category === cat ? FLEET_CATEGORY_CONFIG[cat].bg : 'var(--bg-page)',
                        borderColor: form.category === cat ? FLEET_CATEGORY_CONFIG[cat].text : 'var(--border-card)',
                        color: form.category === cat ? FLEET_CATEGORY_CONFIG[cat].text : 'var(--text-secondary)',
                      }}
                    >
                      {FLEET_CATEGORY_CONFIG[cat].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Merk</label>
                  <input className="form-input w-full" value={form.brand} onChange={e => F('brand', e.target.value)} placeholder="Toyota" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Tahun</label>
                  <input className="form-input w-full" type="number" min="1990" max={new Date().getFullYear() + 1} value={form.year} onChange={e => F('year', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Kapasitas (ton)</label>
                  <input className="form-input w-full" type="number" step="0.1" min="0" value={form.capacity_ton} onChange={e => F('capacity_ton', e.target.value)} placeholder="1.5" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 — Catatan */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)' }}>Catatan Internal</p>
            <textarea className="form-input w-full resize-none" rows={2} value={form.notes} onChange={e => F('notes', e.target.value)} placeholder="Catatan tentang kendaraan ini..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)', border: '1px solid var(--border-card)' }}>Batal</button>
            <button type="submit" disabled={isLoading || !form.plate_number.trim() || !form.name.trim()} className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50" style={{ backgroundColor: 'var(--green-primary)' }}>
              {isLoading ? 'Menyimpan...' : 'Simpan Armada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
