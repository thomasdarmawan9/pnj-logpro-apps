import { SJItem } from '../../domain/entities/SuratJalan'

export interface UpdateSJDto {
  fleet_id?: number
  driver_id?: number | null
  driver_name_manual?: string | null
  origin?: string
  destination?: string
  cargo_description?: string | null
  items?: SJItem[] | null
  operational_cost?: number
  internal_notes?: string | null
  lampiran_paths?: string[] | null
}
