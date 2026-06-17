'use client'

import { Truck, UserRound } from 'lucide-react'
import SearchableSelect from './SearchableSelect'

type Option = { id: number; label: string }

interface Props {
  fleetId: number | null
  fleetLabel: string
  driverId: number | null
  driverNameManual: string
  fleetOptions: Option[]
  driverOptions: Option[]
  onChangeFleetId: (id: number | null) => void
  onChangeFleetLabel: (label: string) => void
  onChangeDriverId: (id: number | null) => void
  onChangeDriverNameManual: (name: string) => void
  disabled?: boolean
}

export default function DeliveryOperationsSection({
  fleetId,
  fleetLabel,
  driverId,
  driverNameManual,
  fleetOptions,
  driverOptions,
  onChangeFleetId,
  onChangeFleetLabel,
  onChangeDriverId,
  onChangeDriverNameManual,
  disabled = false,
}: Props) {
  return (
    <div className="bg-white rounded-xl border p-6" style={{ borderColor: 'var(--border-card)' }}>
      <h2 className="text-base font-semibold mb-4">Armada dan Supir</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Armada</label>
          <div className="mb-2">
            <SearchableSelect
              options={fleetOptions}
              value={fleetId}
              placeholder="Cari armada..."
              emptyText="Armada tidak ditemukan"
              icon={<Truck size={15} />}
              disabled={disabled}
              onChange={nextId => {
                const fleet = fleetOptions.find(option => option.id === nextId)
                onChangeFleetId(nextId)
                onChangeFleetLabel(fleet?.label || '')
              }}
            />
          </div>
          <input
            className="form-input w-full text-sm"
            placeholder="Armada manual"
            value={fleetLabel}
            onChange={event => onChangeFleetLabel(event.target.value)}
            disabled={disabled}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Supir</label>
          <div className="mb-2">
            <SearchableSelect
              options={driverOptions}
              value={driverId}
              placeholder="Cari supir..."
              emptyText="Supir tidak ditemukan"
              icon={<UserRound size={15} />}
              disabled={disabled}
              onChange={nextId => {
                onChangeDriverId(nextId)
                if (nextId) onChangeDriverNameManual('')
              }}
            />
          </div>
          <input
            className="form-input w-full text-sm"
            placeholder="Supir manual"
            value={driverNameManual}
            onChange={event => {
              onChangeDriverNameManual(event.target.value)
              if (event.target.value) onChangeDriverId(null)
            }}
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  )
}
