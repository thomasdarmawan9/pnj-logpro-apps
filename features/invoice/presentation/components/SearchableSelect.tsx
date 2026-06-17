'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'

export type SearchableSelectOption = {
  id: number
  label: string
  sublabel?: string
}

interface Props {
  options: SearchableSelectOption[]
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  emptyText?: string
  icon?: React.ReactNode
  disabled?: boolean
  className?: string
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Cari...',
  emptyText = 'Tidak ditemukan',
  icon,
  disabled = false,
  className = '',
}: Props) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => options.find(o => o.id === value) || null, [options, value])

  useEffect(() => {
    setSearch(selected?.label ?? '')
  }, [selected])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false)
        setSearch(selected?.label ?? '')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selected])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q || (selected && q === selected.label.toLowerCase())) return options
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.sublabel || '').toLowerCase().includes(q),
    )
  }, [options, search, selected])

  const select = (option: SearchableSelectOption | null) => {
    onChange(option?.id ?? null)
    setSearch(option?.label ?? '')
    setOpen(false)
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="relative">
        {icon ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </span>
        ) : (
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        )}
        <input
          className="form-input w-full text-sm"
          style={{ paddingLeft: 36, paddingRight: 56 }}
          value={search}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={event => {
            setSearch(event.target.value)
            setOpen(true)
            if (value !== null) onChange(null)
          }}
        />
        {selected && !disabled && (
          <button
            type="button"
            onClick={() => select(null)}
            className="absolute right-7 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 text-gray-400"
            aria-label="Hapus pilihan"
          >
            ✕
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
          aria-label="Buka daftar"
        >
          <ChevronDown size={16} className="text-gray-400" />
        </button>
      </div>
      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden" style={{ borderColor: 'var(--border-card)' }}>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length > 0 ? filtered.map(option => {
              const isSelected = value === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => select(option)}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-green-50 flex items-start gap-2"
                >
                  <span className="mt-0.5 w-4 text-green-600">{isSelected && <Check size={14} />}</span>
                  <span className="min-w-0">
                    <span className="block font-medium text-gray-800 truncate">{option.label}</span>
                    {option.sublabel && <span className="block text-xs text-gray-500 truncate">{option.sublabel}</span>}
                  </span>
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
