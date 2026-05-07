'use client'

import type { DriverOption } from '../utils/mockOptions'

interface SJFormSupirSectionProps {
  mode: 'master' | 'tbd'
  driver: DriverOption | null
  onModeChange: (mode: 'master' | 'tbd') => void
  onDriverChange: (driver: DriverOption | null) => void
  options?: DriverOption[]
  errors?: Record<string, string>
}

export default function SJFormSupirSection({
  mode,
  driver,
  onModeChange,
  onDriverChange,
  options = [],
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
          <select
            className={`form-input w-full mt-1 ${errors?.driver ? 'error' : ''}`}
            value={driver?.id || ''}
            onChange={e => {
              const selected = options.find(opt => opt.id === Number(e.target.value)) || null
              onDriverChange(selected)
            }}
          >
            <option value="">Pilih supir</option>
            {options.map(driverOption => (
              <option key={driverOption.id} value={driverOption.id}>
                {driverOption.name} {driverOption.simExpiredAt ? `(SIM s.d ${driverOption.simExpiredAt})` : ''}
              </option>
            ))}
          </select>
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
