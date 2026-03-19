import { ProfitLossSummary, ProfitLossProject } from '../../domain/entities/ProfitLossReport'
import { ProfitLossFilterDto } from '../dto/ProfitLossFilterDto'
import { MOCK_PROFIT_LOSS } from '@/lib/mockData/reports'

export class GetProfitLossReport {
  execute(filters: ProfitLossFilterDto): ProfitLossSummary {
    let projects = [...MOCK_PROFIT_LOSS.projects]

    // Apply profitability filter
    if (filters.profitability && filters.profitability !== 'all') {
      projects = projects.filter(p => p.profitability === filters.profitability)
    }

    // Apply project status filter
    if (filters.projectStatus && filters.projectStatus !== 'all') {
      projects = projects.filter(p => p.status === filters.projectStatus)
    }

    // Apply customer filter
    if (filters.customerId && filters.customerId !== 'all') {
      projects = projects.filter(p => p.project_id === filters.customerId)
    }

    // Recalculate summary
    const totalRevenuePaid = projects.reduce((s, p) => s + p.revenue_paid, 0)
    const totalOpsCost = projects.reduce((s, p) => s + p.total_operational_cost, 0)
    const totalGrossProfit = totalRevenuePaid - totalOpsCost
    const profitableProjects = projects.filter(p => p.profitability === 'profit')
    const lossProjects = projects.filter(p => p.profitability === 'loss')

    const marginsWithData = projects.filter(p => p.margin_percent !== null).map(p => p.margin_percent as number)
    const avgMargin = marginsWithData.length > 0
      ? marginsWithData.reduce((s, m) => s + m, 0) / marginsWithData.length
      : null

    return {
      ...MOCK_PROFIT_LOSS,
      period_from: filters.periodFrom,
      period_to: filters.periodTo,
      projects,
      total_revenue_paid: totalRevenuePaid,
      total_operational_cost: totalOpsCost,
      total_gross_profit: totalGrossProfit,
      average_margin: avgMargin !== null ? Math.round(avgMargin * 10) / 10 : null,
      project_count: projects.length,
      profitable_count: profitableProjects.length,
      loss_count: lossProjects.length,
    }
  }
}

export const getProfitLossReport = new GetProfitLossReport()
