import { AgingARSummary } from '../../domain/entities/AgingARReport'
import { AgingARProjectDetail } from '../../domain/entities/AgingARProjectDetail'
import { ProfitLossSummary } from '../../domain/entities/ProfitLossReport'
import { AuditLog } from '../../domain/entities/AuditLog'
import { AgingARFilterDto } from '../../application/dto/AgingARFilterDto'
import { ProfitLossFilterDto } from '../../application/dto/ProfitLossFilterDto'
import { AuditTrailFilterDto } from '../../application/dto/AuditTrailFilterDto'

export interface IReportsRepository {
  getAgingAR(filters: AgingARFilterDto): Promise<AgingARSummary>
  getAgingARProjectDetail(projectId: number): Promise<AgingARProjectDetail>
  getProfitLoss(filters: ProfitLossFilterDto): Promise<ProfitLossSummary>
  getAuditTrail(filters: AuditTrailFilterDto): Promise<{ logs: AuditLog[]; total: number }>
}
