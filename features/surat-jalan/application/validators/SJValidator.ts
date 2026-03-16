import { CreateSJDto } from '../dto/CreateSJDto'
import { UpdateSJDto } from '../dto/UpdateSJDto'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateCreateSJ(dto: CreateSJDto): ValidationResult {
  const errors: Record<string, string> = {}

  if (!dto.project_id) errors.project_id = 'Proyek wajib dipilih'
  if (!dto.sj_date) errors.sj_date = 'Tanggal SJ wajib diisi'
  if (!dto.origin?.trim()) errors.origin = 'Lokasi asal wajib diisi'
  if (!dto.destination?.trim()) errors.destination = 'Lokasi tujuan wajib diisi'

  if (dto.publish) {
    if (!dto.fleet_id || dto.fleet_id === 0) {
      errors.fleet_id = 'Pilih armada untuk menerbitkan SJ'
    }
    if (!dto.driver_id && !dto.driver_name_manual?.trim()) {
      errors.driver = 'Supir wajib diisi untuk menerbitkan SJ'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateUpdateSJ(dto: UpdateSJDto): ValidationResult {
  const errors: Record<string, string> = {}
  if (dto.origin !== undefined && !dto.origin.trim()) errors.origin = 'Lokasi asal tidak boleh kosong'
  if (dto.destination !== undefined && !dto.destination.trim()) errors.destination = 'Lokasi tujuan tidak boleh kosong'
  return { valid: Object.keys(errors).length === 0, errors }
}
