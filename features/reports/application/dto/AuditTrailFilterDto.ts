export interface AuditTrailFilterDto {
  search: string
  userId?: number | 'all'
  module: string | 'all'
  action: string | 'all'
  periodPreset: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'all' | 'custom'
  periodFrom?: string
  periodTo?: string
  page: number
  perPage: number
}
