import { AgingBucket } from '../../domain/value-objects/AgingBucket'

export interface AgingARFilterDto {
  customerId?: number | 'all'
  bucket?: AgingBucket | 'all'
  periodFrom?: string
  periodTo?: string
  search?: string
}
