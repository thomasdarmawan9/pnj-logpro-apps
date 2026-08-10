'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import type { Customer } from '@/features/master/domain/entities/Customer'

interface SJPartyNameComboboxProps {
  label: string
  value: string | null
  customers: Customer[]
  onChange: (value: string | null) => void
  placeholder: string
}

export default function SJPartyNameCombobox({
  label,
  value,
  customers,
  onChange,
  placeholder,
}: SJPartyNameComboboxProps) {
  const pickerRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const inputValue = value ?? ''

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCustomers = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    const result = query
      ? customers.filter(customer =>
          customer.name.toLowerCase().includes(query) ||
          (customer.npwp || '').toLowerCase().includes(query) ||
          (customer.address || '').toLowerCase().includes(query)
        )
      : customers
    return result.slice(0, 25)
  }, [customers, inputValue])

  const hasExactCustomer = customers.some(
    customer => customer.name.toLowerCase() === inputValue.trim().toLowerCase(),
  )

  return (
    <label className="text-xs font-medium block" style={{ color: '#374151' }}>
      {label} <span className="text-gray-400 font-normal">(opsional)</span>
      <div ref={pickerRef} className="relative mt-1">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <Search size={15} />
          </span>
          <input
            className="form-input w-full"
            style={{ paddingLeft: 42, paddingRight: 40 }}
            value={inputValue}
            maxLength={255}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder={placeholder}
            onFocus={() => setIsOpen(true)}
            onChange={event => {
              onChange(event.target.value || null)
              setIsOpen(true)
            }}
          />
          <button
            type="button"
            onClick={() => setIsOpen(open => !open)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
            aria-label={`Buka daftar customer untuk ${label.toLowerCase()}`}
          >
            <ChevronDown size={16} className="text-gray-400" />
          </button>
        </div>

        {isOpen && (
          <div
            className="absolute z-30 mt-1 w-full rounded-lg border bg-white shadow-lg overflow-hidden"
            style={{ borderColor: 'var(--border-card)' }}
          >
            <div id={listboxId} className="max-h-64 overflow-y-auto" role="listbox">
              {inputValue.trim() && !hasExactCustomer && (
                <button
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => setIsOpen(false)}
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-green-50 border-b"
                  style={{ borderColor: 'var(--border-card)' }}
                >
                  <span className="block font-medium text-green-700 truncate">
                    Gunakan &ldquo;{inputValue.trim()}&rdquo;
                  </span>
                  <span className="block text-xs text-gray-500">Simpan sebagai nama manual</span>
                </button>
              )}

              {filteredCustomers.length > 0 ? filteredCustomers.map(customer => {
                const selected = customer.name.toLowerCase() === inputValue.trim().toLowerCase()
                return (
                  <button
                    key={customer.uuid}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(customer.name)
                      setIsOpen(false)
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-green-50 flex items-start gap-2"
                  >
                    <span className="mt-0.5 w-4 text-green-600">{selected && <Check size={14} />}</span>
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-800 truncate">{customer.name}</span>
                      <span className="block text-xs text-gray-500 truncate">
                        {customer.npwp ? `NPWP: ${customer.npwp}` : customer.address || 'Non-NPWP'}
                      </span>
                    </span>
                  </button>
                )
              }) : !inputValue.trim() ? (
                <div className="px-3 py-3 text-sm text-gray-500">Data customer belum tersedia</div>
              ) : (
                <div className="px-3 py-3 text-sm text-gray-500">Customer tidak ditemukan; nama manual tetap dapat digunakan</div>
              )}
            </div>
          </div>
        )}
      </div>
    </label>
  )
}
