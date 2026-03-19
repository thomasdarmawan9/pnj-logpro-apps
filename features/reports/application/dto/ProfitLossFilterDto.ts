export type PeriodPreset = 'this_month' | 'this_quarter' | '6_months' | 'custom'
export type ProfitabilityFilter = 'all' | 'profit' | 'loss' | 'no_data'

export interface ProfitLossFilterDto {
  periodPreset: PeriodPreset
  periodFrom: string
  periodTo: string
  customerId?: number | 'all'
  projectStatus?: string | 'all'
  profitability?: ProfitabilityFilter
}
