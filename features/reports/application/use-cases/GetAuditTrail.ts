import { AuditLog } from '../../domain/entities/AuditLog'
import { AuditTrailFilterDto } from '../dto/AuditTrailFilterDto'
import { MOCK_AUDIT_LOGS } from '@/lib/mockData/reports'

export interface AuditTrailResult {
  logs: AuditLog[]
  total: number
  page: number
  perPage: number
}

export class GetAuditTrail {
  execute(filters: AuditTrailFilterDto): AuditTrailResult {
    let logs = [...MOCK_AUDIT_LOGS]

    // Apply search
    if (filters.search) {
      const q = filters.search.toLowerCase()
      logs = logs.filter(l =>
        l.action.toLowerCase().includes(q) ||
        l.user_name.toLowerCase().includes(q) ||
        (l.record_label?.toLowerCase().includes(q) ?? false) ||
        l.module.toLowerCase().includes(q)
      )
    }

    // Apply module filter
    if (filters.module && filters.module !== 'all') {
      logs = logs.filter(l => l.module === filters.module)
    }

    // Apply action filter
    if (filters.action && filters.action !== 'all') {
      logs = logs.filter(l => l.action === filters.action)
    }

    // Sort by created_at desc
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const total = logs.length
    const start = (filters.page - 1) * filters.perPage
    const paginated = logs.slice(start, start + filters.perPage)

    return {
      logs: paginated,
      total,
      page: filters.page,
      perPage: filters.perPage,
    }
  }
}

export const getAuditTrail = new GetAuditTrail()
