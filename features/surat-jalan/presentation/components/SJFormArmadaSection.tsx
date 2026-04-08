'use client'

import { ArmadaOption, armadaOptions } from '../utils/mockOptions'

interface SJFormArmadaSectionProps {
  value: ArmadaOption | null
  onChange: (armada: ArmadaOption) => void
  showTBDWarning?: boolean
  errors?: Record<string, string>
}

export default function SJFormArmadaSection({ value, onChange, showTBDWarning, errors }: SJFormArmadaSectionProps) {
  const options = armadaOptions.sort((a, b) => Number(a.isTBD) - Number(b.isTBD))

  return (
    <div className="rounded-xl bg-white p-6 border mt-4" style={{ borderColor: 'var(--border-card)' }}>
      <div className="text-sm font-semibold mb-4">Armada & Supir</div>

      <label className="text-xs font-medium" style={{ color: '#374151' }}>
        Armada *
        <select
          className={`form-input w-full mt-1 ${errors?.fleet_id ? 'error' : ''}`}
          value={value?.id || ''}
          onChange={e => {
            const selected = options.find(opt => opt.id === Number(e.target.value))
            if (selected) onChange(selected)
          }}
        >
          <option value="">Pilih armada</option>
          {options.map(armada => (
            <option key={armada.id} value={armada.id}>
              {armada.isTBD ? '🚧 ' : ''}{armada.name} ({armada.plate})
            </option>
          ))}
        </select>
        {errors?.fleet_id && <div className="text-xs text-red-600 mt-1">{errors.fleet_id}</div>}
      </label>

      {showTBDWarning && value?.isTBD && (
        <div className="mt-3 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB', color: '#92400E' }}>
          Armada belum ditentukan. SJ tetap bisa diterbitkan dan bisa diubah armadanya nanti melalui Edit SJ.
        </div>
      )}
    </div>
  )
}
