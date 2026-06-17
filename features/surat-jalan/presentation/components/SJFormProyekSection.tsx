'use client'

import { useRef, useState, useMemo, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import type { ProjectOption } from '../utils/mockOptions'

interface SJFormProyekSectionProps {
  value: ProjectOption | null
  onSelect: (project: ProjectOption) => void
  options?: ProjectOption[]
  errors?: Record<string, string>
}

export default function SJFormProyekSection({ value, onSelect, options = [], errors }: SJFormProyekSectionProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? options.filter(p =>
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.customer.toLowerCase().includes(q)
        )
      : options
    return list.slice(0, 25)
  }, [options, search])

  return (
    <div className="rounded-xl bg-white p-6 border" style={{ borderColor: 'var(--border-card)' }}>
      <div className="text-sm font-semibold mb-4">Informasi Dasar</div>

      <label className="text-xs font-medium" style={{ color: '#374151' }}>
        Proyek *
        <div ref={pickerRef} className="relative mt-1">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Search size={15} />
            </span>
            <input
              className={`form-input w-full ${errors?.project_id ? 'error' : ''}`}
              style={{ paddingLeft: 42, paddingRight: 40 }}
              value={search}
              placeholder={value ? `${value.code} — ${value.name}` : 'Ketik kode atau nama proyek...'}
              onFocus={() => { setOpen(true); setSearch('') }}
              onChange={e => { setSearch(e.target.value); setOpen(true) }}
              onBlur={() => setSearch('')}
            />
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
              aria-label="Buka daftar proyek"
            >
              <ChevronDown size={16} className="text-gray-400" />
            </button>
          </div>
          {open && (
            <div className="absolute z-30 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
              <div className="max-h-64 overflow-y-auto">
                {filtered.length > 0 ? filtered.map(p => {
                  const selected = value?.id === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={event => {
                        event.preventDefault()
                        onSelect(p)
                        setOpen(false)
                        setSearch('')
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-green-50 flex items-start gap-2"
                    >
                      <span className="mt-0.5 w-4 text-green-600 shrink-0">{selected && <Check size={14} />}</span>
                      <span className="min-w-0">
                        <span className="block font-medium text-gray-800 truncate">{p.code} — {p.name}</span>
                        <span className="block text-xs text-gray-500 truncate">{p.customer}</span>
                      </span>
                    </button>
                  )
                }) : (
                  <div className="px-3 py-3 text-sm text-gray-500">Proyek tidak ditemukan</div>
                )}
              </div>
            </div>
          )}
        </div>
        {errors?.project_id && <div className="text-xs text-red-600 mt-1">{errors.project_id}</div>}
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <label className="text-xs font-medium" style={{ color: '#374151' }}>
          Customer
          <input
            className="form-input w-full mt-1 disabled"
            value={value?.customer || ''}
            disabled
            readOnly
          />
        </label>
        <label className="text-xs font-medium" style={{ color: '#374151' }}>
          No. Kontrak
          <input
            className="form-input w-full mt-1 disabled"
            value={value?.contractNumber || ''}
            disabled
            readOnly
          />
        </label>
      </div>
    </div>
  )
}
