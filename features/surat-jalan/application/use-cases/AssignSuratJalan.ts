import { SuratJalan, StatusOperasional } from '../../domain/entities/SuratJalan'
import { canTransition } from './TransitionStatus'

export interface AssignSJInput {
  fleet_id: number | null
  driver_id: number | null
  driver_name_manual: string | null
}

export interface AssignSJResult {
  success: boolean
  error?: string
  sj?: SuratJalan
}

export function validateAssign(sj: SuratJalan, _input: AssignSJInput): string | null {
  if (!canTransition(sj.status, StatusOperasional.ASSIGNED)) {
    return `Tidak bisa assign SJ dengan status ${sj.status}`
  }
  return null
}
