import { IReportsRepository } from './IReportsRepository'
import { AgingARSummary } from '../../domain/entities/AgingARReport'
import { AgingARProjectDetail } from '../../domain/entities/AgingARProjectDetail'
import { AgingARCustomerDetail } from '../../domain/entities/AgingARCustomerDetail'
import { ProfitLossSummary } from '../../domain/entities/ProfitLossReport'
import { AuditLog } from '../../domain/entities/AuditLog'
import { AgingARFilterDto } from '../../application/dto/AgingARFilterDto'
import { ProfitLossFilterDto } from '../../application/dto/ProfitLossFilterDto'
import { AuditTrailFilterDto } from '../../application/dto/AuditTrailFilterDto'
import { getAgingARReport } from '../../application/use-cases/GetAgingARReport'
import { getAgingARProjectDetail } from '../../application/use-cases/GetAgingARProjectDetail'
import { getAgingARCustomerDetail } from '../../application/use-cases/GetAgingARCustomerDetail'
import { getProfitLossReport } from '../../application/use-cases/GetProfitLossReport'
import { getAuditTrail } from '../../application/use-cases/GetAuditTrail'

const _CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes (reserved for future cache implementation)

class MockReportsRepository implements IReportsRepository {
  private agingARCache: { data: AgingARSummary; timestamp: number } | null = null
  private plCache: { data: ProfitLossSummary; timestamp: number } | null = null

  async getAgingAR(filters: AgingARFilterDto): Promise<AgingARSummary> {
    await this.simulateDelay()
    return getAgingARReport.execute(filters)
  }

  async getAgingARProjectDetail(projectId: number): Promise<AgingARProjectDetail> {
    await this.simulateDelay()
    return getAgingARProjectDetail.execute(projectId)
  }

  async getAgingARCustomerDetail(customerId: number): Promise<AgingARCustomerDetail> {
    await this.simulateDelay()
    return getAgingARCustomerDetail.execute(customerId)
  }

  async getProfitLoss(filters: ProfitLossFilterDto): Promise<ProfitLossSummary> {
    await this.simulateDelay()
    return getProfitLossReport.execute(filters)
  }

  async getAuditTrail(filters: AuditTrailFilterDto): Promise<{ logs: AuditLog[]; total: number }> {
    await this.simulateDelay(300)
    const result = getAuditTrail.execute(filters)
    return { logs: result.logs, total: result.total }
  }

  private simulateDelay(ms = 600): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const reportsRepository = new MockReportsRepository()
