import { SuratJalan, SJFilterState, PaginationState } from '../../domain/entities/SuratJalan'
import { CreateSJDto } from '../../application/dto/CreateSJDto'
import { UpdateSJDto } from '../../application/dto/UpdateSJDto'
import { AssignSJInput } from '../../application/use-cases/AssignSuratJalan'
import { DeliverSJInput } from '../../application/use-cases/DeliverSuratJalan'

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  perPage: number
}

export interface ISuratJalanRepository {
  getList(filters: SJFilterState, pagination: PaginationState): Promise<PaginatedResult<SuratJalan>>
  getByUuid(uuid: string): Promise<SuratJalan | null>
  create(dto: CreateSJDto): Promise<SuratJalan>
  update(uuid: string, dto: UpdateSJDto): Promise<SuratJalan>
  assign(uuid: string, input: AssignSJInput): Promise<SuratJalan>
  deliver(uuid: string, input: DeliverSJInput): Promise<SuratJalan>
  void(uuid: string, reason: string): Promise<SuratJalan>
  delete(uuid: string): Promise<void>
}
