import { SuratJalan, StatusOperasional } from '../../domain/entities/SuratJalan'
import { canTransition } from './TransitionStatus'

export interface VoidSJInput {
  void_reason: string
  confirmation: string
}

export function validateVoid(sj: SuratJalan, input: VoidSJInput): string | null {
  if (!canTransition(sj.status, StatusOperasional.VOID)) {
    return `Tidak bisa void SJ dengan status ${sj.status}`
  }
  if (!input.void_reason || input.void_reason.trim().length < 10) {
    return 'Alasan void minimal 10 karakter'
  }
  if (input.confirmation !== 'VOID') {
    return 'Ketik VOID untuk konfirmasi'
  }
  return null
}
