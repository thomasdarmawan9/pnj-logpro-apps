'use client'

import type { ArmadaOption } from '../utils/mockOptions'

interface SJFormArmadaSectionProps {
  mode: 'master' | 'tbd'
  value: ArmadaOption | null
  onChange: (armada: ArmadaOption | null) => void
  onModeChange: (mode: 'master' | 'tbd') => void
  options?: ArmadaOption[]
  errors?: Record<string, string>
}

export default function SJFormArmadaSection({ mode, value, onChange, onModeChange, options = [], errors }: SJFormArmadaSectionProps) {
  const sortedOptions = [...options].sort((a, b) => Number(a.isTBD) - Number(b.isTBD))

  return (
    <div className="rounded-xl bg-white p-6 border mt-4" style={{ borderColor: 'var(--border-card)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold">Armada & Supir</div>
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
            onClick={() => { onModeChange('tbd'); onChange(null) }}
          >
            Belum Ditentukan
          </button>
        </div>
      </div>

      {mode === 'master' ? (
        <label className="text-xs font-medium" style={{ color: '#374151' }}>
          Armada
          <select
            className={`form-input w-full mt-1 ${errors?.fleet_id ? 'error' : ''}`}
            value={value?.id || ''}
            onChange={e => {
              const selected = sortedOptions.find(opt => opt.id === Number(e.target.value)) || null
              onChange(selected)
            }}
          >
            <option value="">Pilih armada</option>
            {sortedOptions.map(armada => (
              <option key={armada.id} value={armada.id}>
                {armada.isTBD ? '🚧 ' : ''}{armada.name} ({armada.plate})
              </option>
            ))}
          </select>
          {errors?.fleet_id && <div className="text-xs text-red-600 mt-1">{errors.fleet_id}</div>}
        </label>
      ) : (
        <div className="text-xs text-gray-500">
          Armada belum ditentukan. SJ tetap bisa diterbitkan dan armada bisa diubah nanti melalui Edit SJ.
        </div>
      )}
    </div>
  )
}
