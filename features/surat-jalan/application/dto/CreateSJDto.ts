export interface CreateSJDto {
  project_id: number
  fleet_id: number
  driver_id: number | null
  driver_name_manual: string | null
  sj_date: string
  origin: string
  destination: string
  cargo_description: string | null
  operational_cost: number
  internal_notes: string | null
  publish: boolean
}
