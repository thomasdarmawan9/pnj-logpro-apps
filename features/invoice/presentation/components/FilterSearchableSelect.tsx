'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'

export type FilterOption = { value: string; label: string }

interface Props {
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  /** Nilai sentinel "tanpa filter" (mis. 'all'); dipakai saat menghapus pilihan. */
  allValue?: string
  placeholder?: string
  emptyText?: string
  className?: string
}

/**
 * Dropdown filter dengan pencarian, di-key oleh string `value` (mis. uuid)
 * dan punya sentinel "semua" (default 'all'). Berbeda dari SearchableSelect
 * yang di-key oleh id numerik.
 */
export default function FilterSearchableSelect({
  options,
  value,
  onChange,
  allValue = 'all',
  placeholder = 'Cari...',
  emptyText = 'Tidak ditemukan',
  className = '',
}: Props) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => options.find(o => o.value === value) || null, [options, value])
  // Saat nilai = sentinel "semua", input dibiarkan kosong agar placeholder tampil.
  const displayLabel = selected && selected.value !== allValue ? selected.label : ''

  useEffect(() => {
    setSearch(displayLabel)
  }, [displayLabel])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false)
        setSearch(displayLabel)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [displayLabel])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || q === displayLabel.toLowerCase()) return options
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, search, displayLabel])

  const select = (option: FilterOption) => {
    onChange(option.value)
    setSearch(option.value === allValue ? '' : option.label)
    setOpen(false)
  }

  const clear = () => {
    onChange(allValue)
    setSearch('')
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className="form-input text-sm w-full"
          style={{ paddingLeft: 34, paddingRight: 52 }}
          value={search}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={event => {
            // Hanya memfilter daftar secara lokal; filter aktif (dan refetch
            // data) baru berubah saat user memilih opsi atau menghapus pilihan.
            setSearch(event.target.value)
            setOpen(true)
          }}
        />
        {selected && selected.value !== allValue && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-7 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-400"
            aria-label="Hapus pilihan"
          >
            ✕
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
          aria-label="Buka daftar"
        >
          <ChevronDown size={16} className="text-gray-400" />
        </button>
      </div>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length > 0 ? filtered.map(option => {
              const isSelected = value === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => select(option)}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-green-50 flex items-center gap-2"
                >
                  <span className="w-4 text-green-600">{isSelected && <Check size={14} />}</span>
                  <span className="block truncate text-gray-800">{option.label}</span>
                </button>
              )
            }) : (
              <div className="px-3 py-3 text-sm text-gray-500">{emptyText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
