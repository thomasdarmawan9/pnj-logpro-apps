'use client'

import { useEffect, useMemo, useState } from 'react'
import ModalShell from './ModalShell'
import { SuratJalan } from '../../../domain/entities/SuratJalan'
import { armadaOptions, driverOptions } from '../../utils/mockOptions'

interface AssignModalProps {
  open: boolean
  sj: SuratJalan | null
  onClose: () => void
  onConfirm: (input: { fleet_id: number; driver_id: number | null; driver_name_manual: string | null }) => void
}

export default function AssignModal({ open, sj, onClose, onConfirm }: AssignModalProps) {
  const [fleetId, setFleetId] = useState<number>(sj?.fleet_id || 0)
  const [mode, setMode] = useState<'master' | 'manual'>('master')
  const [driverId, setDriverId] = useState<number | null>(sj?.driver_id || null)
  const [manualName, setManualName] = useState(sj?.driver_name_manual || '')

  const options = useMemo(() => armadaOptions.filter(opt => !opt.isTBD), [])

  useEffect(() => {
    if (sj && open) {
      setFleetId(sj.fleet_id || 0)
      setDriverId(sj.driver_id || null)
      setManualName(sj.driver_name_manual || '')
    }
  }, [sj, open])

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Assign & Terbitkan SJ"
      subtitle={sj ? `${sj.sj_number} · ${sj.customer.name}` : undefined}
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600">Konfirmasi armada dan supir sebelum menerbitkan.</div>

        <label className="text-xs font-medium" style={{ color: '#374151' }}>
          Armada *
          <select
            className="form-input w-full mt-1"
            value={fleetId}
            onChange={e => setFleetId(Number(e.target.value))}
          >
            <option value={0}>Pilih armada</option>
            {options.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name} ({opt.plate})</option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2 text-xs">
          <button
            className={`px-2 py-1 rounded-full border ${mode === 'master' ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-200 text-gray-500'}`}
            onClick={() => setMode('master')}
          >
            Pilih dari Master
          </button>
          <button
            className={`px-2 py-1 rounded-full border ${mode === 'manual' ? 'bg-green-50 text-green-700 border-green-200' : 'border-gray-200 text-gray-500'}`}
            onClick={() => setMode('manual')}
          >
            Input Manual
          </button>
        </div>

        {mode === 'master' ? (
          <label className="text-xs font-medium" style={{ color: '#374151' }}>
            Supir *
            <select
              className="form-input w-full mt-1"
              value={driverId || ''}
              onChange={e => setDriverId(Number(e.target.value))}
            >
              <option value="">Pilih supir</option>
              {driverOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="text-xs font-medium" style={{ color: '#374151' }}>
            Nama supir *
            <input
              className="form-input w-full mt-1"
              value={manualName}
              onChange={e => setManualName(e.target.value)}
              placeholder="Nama supir"
            />
          </label>
        )}

        <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border-card)', backgroundColor: '#F9FAFB' }}>
          Setelah diterbitkan, SJ ini akan berstatus ASSIGNED dan siap dicetak untuk dibawa supir.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--border-card)' }}>
            Batal
          </button>
          <button
            onClick={() => onConfirm({ fleet_id: fleetId, driver_id: mode === 'master' ? driverId : null, driver_name_manual: mode === 'manual' ? manualName : null })}
            className="px-4 py-2 rounded-lg text-white"
            style={{ backgroundColor: 'var(--green-primary)' }}
          >
            Terbitkan SJ →
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
