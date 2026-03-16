import { Invoice, InvoiceFilterState, PaginationState, AttachedSJ } from '../../domain/entities/Invoice'
import { CreateInvoiceDto } from '../../application/dto/CreateInvoiceDto'
import { UpdateInvoiceDto } from '../../application/dto/UpdateInvoiceDto'
import { RecordPaymentDto } from '../../application/dto/RecordPaymentDto'

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  perPage: number
}

export interface IInvoiceRepository {
  getList(filters: InvoiceFilterState, pagination: PaginationState): Promise<PaginatedResult<Invoice>>
  getByUuid(uuid: string): Promise<Invoice | null>
  create(dto: CreateInvoiceDto): Promise<Invoice>
  update(uuid: string, dto: UpdateInvoiceDto): Promise<Invoice>
  send(uuid: string): Promise<Invoice>
  recordPayment(uuid: string, dto: RecordPaymentDto): Promise<Invoice>
  void(uuid: string, reason: string): Promise<Invoice>
  attachSJ(invoiceUuid: string, sjUuids: string[]): Promise<Invoice>
  detachSJ(invoiceUuid: string, sjUuid: string): Promise<Invoice>
  getAttachableSJ(projectCode: string): Promise<AttachedSJ[]>
}
