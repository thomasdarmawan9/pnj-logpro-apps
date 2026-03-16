'use client'

import { DriverOption, driverOptions } from '../utils/mockOptions'

interface SJFormSupirSectionProps {
  mode: 'master' | 'manual'
  driver: DriverOption | null
  manualName: string
  onModeChange: (mode: 'master' | 'manual') => void
  onDriverChange: (driver: DriverOption | null) => void
  onManualNameChange: (value: string) => void
  errors?: Record<string, string>
}

export default function SJFormSupirSection({
  mode,
  driver,
  manualName,
  onModeChange,
  onDriverChange,
  onManualNameChange,
  errors,
}: SJFormSupirSectionProps) {
  return (
    <div className="rounded-xl bg-white p-6 border mt-4" style={{ borderColor: 'var(--border-card)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">Supir</div>
        <div className="flex items-center gap-2 text-xs">
          <button
            className={`px-2 py-1 rounded-full border ${mode === 'master' ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-200 text-gray-500'}`}
            onClick={() => onModeChange('master')}
          >
            Pilih dari Master
          </button>
          <button
            className={`px-2 py-1 rounded-full border ${mode === 'manual' ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-200 text-gray-500'}`}
            onClick={() => onModeChange('manual')}
          >
            Input Manual
          </button>
        </div>
      </div>

      {mode === 'master' ? (
        <label className="text-xs font-medium" style={{ color: '#374151' }}>
          Supir
          <select
            className={`form-input w-full mt-1 ${errors?.driver ? 'error' : ''}`}
            value={driver?.id || ''}
            onChange={e => {
              const selected = driverOptions.find(opt => opt.id === Number(e.target.value)) || null
              onDriverChange(selected)
            }}
          >
            <option value="">Pilih supir</option>
            {driverOptions.map(driverOption => (
              <option key={driverOption.id} value={driverOption.id}>
                {driverOption.name} {driverOption.simExpiredAt ? `(SIM s.d ${driverOption.simExpiredAt})` : ''}
              </option>
            ))}
          </select>
          {errors?.driver && <div className="text-xs text-red-600 mt-1">{errors.driver}</div>}
        </label>
      ) : (
        <label className="text-xs font-medium" style={{ color: '#374151' }}>
          Nama supir (opsional)
          <input
            className={`form-input w-full mt-1 ${errors?.driver ? 'error' : ''}`}
            value={manualName}
            onChange={e => onManualNameChange(e.target.value)}
            placeholder="Nama supir manual"
          />
          {errors?.driver && <div className="text-xs text-red-600 mt-1">{errors.driver}</div>}
        </label>
      )}

    </div>
  )
}
