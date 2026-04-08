import { MOCK_SURAT_JALAN } from '../../../../lib/mockData/suratJalan'
import { MOCK_PROJECTS } from '../../../../features/master/domain/entities/Project'

export interface ProjectOption {
  id: number
  name: string
  code: string
  customer: string
  contractNumber: string | null
}

export interface ArmadaOption {
  id: number
  name: string
  plate: string
  isTBD: boolean
  status: 'active' | 'inactive'
}

export interface DriverOption {
  id: number
  name: string
  simExpiredAt: string | null
  status: 'active' | 'inactive'
}

export const projectOptions: ProjectOption[] = MOCK_PROJECTS.map(p => ({
  id: p.id,
  name: p.name,
  code: p.code,
  customer: p.customer.name,
  contractNumber: p.contract_number,
}))

export const armadaOptions: ArmadaOption[] = Array.from(
  new Map(
    MOCK_SURAT_JALAN.map(sj => [sj.fleet.id, {
      id: sj.fleet.id,
      name: sj.fleet.name,
      plate: sj.fleet.plate_number,
      isTBD: sj.fleet.is_tbd,
      status: (sj.fleet.is_tbd ? 'inactive' : 'active') as 'active' | 'inactive',
    }])
  ).values()
)

export const driverOptions: DriverOption[] = Array.from(
  new Map(
    MOCK_SURAT_JALAN.filter(sj => sj.driver).map(sj => [sj.driver!.id, {
      id: sj.driver!.id,
      name: sj.driver!.name,
      simExpiredAt: sj.driver!.sim_expired_at,
      status: 'active' as const,
    }])
  ).values()
)
