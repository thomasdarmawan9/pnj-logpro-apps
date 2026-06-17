'use client'

import { useRef, useState, useMemo, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import type { DriverOption } from '../utils/mockOptions'

interface SJFormSupirSectionProps {
  mode: 'master' | 'tbd'
  driver: DriverOption | null
  onModeChange: (mode: 'master' | 'tbd') => void
  onDriverChange: (driver: DriverOption | null) => void
  options?: DriverOption[]
  errors?: Record<string, string>
}

export default function SJFormSupirSection({ mode, driver, onModeChange, onDriverChange, options = [], errors }: SJFormSupirSectionProps) {
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
    return (q
      ? options.filter(d => d.name.toLowerCase().includes(q))
      : options
    ).slice(0, 25)
  }, [options, search])

  return (
    <div className="rounded-xl bg-white p-6 border mt-4" style={{ borderColor: 'var(--border-card)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">Supir</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${mode === 'master' ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-200 text-gray-500'}`}
            onClick={() => onModeChange('master')}
          >
            Pilih dari Master
          </button>
          <button
            type="button"
            className={`px-2 py-1 rounded-full border ${mode === 'tbd' ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-200 text-gray-500'}`}
            onClick={() => onModeChange('tbd')}
          >
            Belum Ditentukan
          </button>
        </div>
      </div>

      {mode === 'master' ? (
        <label className="text-xs font-medium" style={{ color: '#374151' }}>
          Supir
          <div ref={pickerRef} className="relative mt-1">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <Search size={15} />
              </span>
              <input
                className={`form-input w-full ${errors?.driver ? 'error' : ''}`}
                style={{ paddingLeft: 42, paddingRight: 40 }}
                value={search}
                placeholder={driver ? driver.name : 'Ketik nama supir...'}
                onFocus={() => { setOpen(true); setSearch('') }}
                onChange={e => { setSearch(e.target.value); setOpen(true) }}
                onBlur={() => setSearch('')}
              />
              <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                aria-label="Buka daftar supir"
              >
                <ChevronDown size={16} className="text-gray-400" />
              </button>
            </div>
            {open && (
              <div className="absolute z-30 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
                <div className="max-h-64 overflow-y-auto">
                  {filtered.length > 0 ? filtered.map(d => {
                    const selected = driver?.id === d.id
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault()
                          onDriverChange(d)
                          setOpen(false)
                          setSearch('')
                        }}
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-green-50 flex items-start gap-2"
                      >
                        <span className="mt-0.5 w-4 text-green-600 shrink-0">{selected && <Check size={14} />}</span>
                        <span className="min-w-0">
                          <span className="block font-medium text-gray-800 truncate">{d.name}</span>
                          {d.simExpiredAt && (
                            <span className="block text-xs text-gray-500">SIM s.d {d.simExpiredAt}</span>
                          )}
                        </span>
                      </button>
                    )
                  }) : (
                    <div className="px-3 py-3 text-sm text-gray-500">Supir tidak ditemukan</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {errors?.driver && <div className="text-xs text-red-600 mt-1">{errors.driver}</div>}
        </label>
      ) : (
        <div className="text-xs text-gray-500">
          Supir belum ditentukan. Anda tetap bisa menerbitkan SJ, dan menambahkan supir nanti.
        </div>
      )}
    </div>
  )
}
