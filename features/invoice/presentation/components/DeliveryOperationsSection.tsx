'use client'

import { Truck, UserRound } from 'lucide-react'

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
          <div className="relative mb-2">
            <Truck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              className="form-input w-full pl-9 text-sm"
              value={fleetId ?? 0}
              onChange={event => {
                const nextId = Number(event.target.value) || null
                const fleet = fleetOptions.find(option => option.id === nextId)
                onChangeFleetId(nextId)
                onChangeFleetLabel(fleet?.label || '')
              }}
              disabled={disabled}
            >
              <option value={0}>-- Pilih armada --</option>
              {fleetOptions.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
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
          <div className="relative mb-2">
            <UserRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              className="form-input w-full pl-9 text-sm"
              value={driverId ?? 0}
              onChange={event => {
                const nextId = Number(event.target.value) || null
                onChangeDriverId(nextId)
                if (nextId) onChangeDriverNameManual('')
              }}
              disabled={disabled}
            >
              <option value={0}>-- Pilih supir --</option>
              {driverOptions.map(option => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
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
