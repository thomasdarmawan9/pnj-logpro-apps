import { SuratJalan, StatusOperasional } from '../../domain/entities/SuratJalan'
import { canTransition } from './TransitionStatus'

export interface DeliverSJInput {
  delivered_at: string
  pod_photo_path: string
}

export function validateDeliver(sj: SuratJalan, input: DeliverSJInput): string | null {
  if (!canTransition(sj.status, StatusOperasional.DELIVERED)) {
    return `Tidak bisa konfirmasi tiba dari status ${sj.status}`
  }
  if (!input.pod_photo_path) {
    return 'Foto Bukti Pengiriman wajib diupload'
  }
  if (!input.delivered_at) {
    return 'Waktu tiba wajib diisi'
  }
  return null
}
