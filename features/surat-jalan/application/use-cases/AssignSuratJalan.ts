import { SuratJalan, StatusOperasional } from '../../domain/entities/SuratJalan'
import { canTransition } from './TransitionStatus'

export interface AssignSJInput {
  fleet_id: number
  driver_id: number | null
  driver_name_manual: string | null
}

export interface AssignSJResult {
  success: boolean
  error?: string
  sj?: SuratJalan
}

export function validateAssign(sj: SuratJalan, input: AssignSJInput): string | null {
  if (!canTransition(sj.status, StatusOperasional.ASSIGNED)) {
    return `Tidak bisa assign SJ dengan status ${sj.status}`
  }
  if (!input.fleet_id || input.fleet_id === 0) {
    return 'Armada wajib dipilih'
  }
  if (!input.driver_id && !input.driver_name_manual?.trim()) {
    return 'Supir wajib diisi'
  }
  return null
}
