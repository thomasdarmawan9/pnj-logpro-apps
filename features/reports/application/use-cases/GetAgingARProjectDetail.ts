import { AgingARProjectDetail } from '../../domain/entities/AgingARProjectDetail'
import { MOCK_PROJECT_DETAILS } from '@/lib/mockData/reports'

export class GetAgingARProjectDetail {
  execute(projectId: number): AgingARProjectDetail {
    const detail = MOCK_PROJECT_DETAILS[projectId]
    if (!detail) {
      throw new Error(`Project detail tidak ditemukan untuk project_id: ${projectId}`)
    }
    return detail
  }
}

export const getAgingARProjectDetail = new GetAgingARProjectDetail()
