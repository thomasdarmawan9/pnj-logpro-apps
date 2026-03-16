'use client'

import { ProjectOption, projectOptions } from '../utils/mockOptions'

interface SJFormProyekSectionProps {
  value: ProjectOption | null
  onSelect: (project: ProjectOption) => void
  errors?: Record<string, string>
}

export default function SJFormProyekSection({ value, onSelect, errors }: SJFormProyekSectionProps) {
  return (
    <div className="rounded-xl bg-white p-6 border" style={{ borderColor: 'var(--border-card)' }}>
      <div className="text-sm font-semibold mb-4">Informasi Dasar</div>

      <label className="text-xs font-medium" style={{ color: '#374151' }}>
        Proyek *
        <select
          className={`form-input w-full mt-1 ${errors?.project_id ? 'error' : ''}`}
          value={value?.id || ''}
          onChange={e => {
            const selected = projectOptions.find(p => p.id === Number(e.target.value))
            if (selected) onSelect(selected)
          }}
        >
          <option value="">Pilih proyek</option>
          {projectOptions.map(project => (
            <option key={project.id} value={project.id}>
              {project.code} — {project.name} / {project.customer}
            </option>
          ))}
        </select>
        {errors?.project_id && <div className="text-xs text-red-600 mt-1">{errors.project_id}</div>}
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <label className="text-xs font-medium" style={{ color: '#374151' }}>
          Customer
          <input
            className="form-input w-full mt-1 disabled"
            value={value?.customer || ''}
            disabled
            readOnly
          />
        </label>
        <label className="text-xs font-medium" style={{ color: '#374151' }}>
          No. Kontrak
          <input
            className="form-input w-full mt-1 disabled"
            value={value?.contractNumber || ''}
            disabled
            readOnly
          />
        </label>
      </div>
    </div>
  )
}
