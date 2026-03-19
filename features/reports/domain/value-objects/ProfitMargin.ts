export type ProfitabilityStatus = 'profit' | 'loss' | 'breakeven' | 'no_data'

export function calculateMargin(grossProfit: number, revenuePaid: number): number | null {
  if (revenuePaid === 0) return null
  return (grossProfit / revenuePaid) * 100
}

export function getProfitability(grossProfit: number, revenuePaid: number): ProfitabilityStatus {
  if (revenuePaid === 0) return 'no_data'
  if (grossProfit > 0)   return 'profit'
  if (grossProfit < 0)   return 'loss'
  return 'breakeven'
}

export function getMarginColor(margin: number | null): string {
  if (margin === null)  return '#9CA3AF'
  if (margin > 50)      return '#16A34A'
  if (margin >= 20)     return '#4CAF50'
  if (margin >= 0)      return '#D97706'
  return '#DC2626'
}

export function getMarginBarColor(margin: number | null): string {
  if (margin === null || margin < 0) return 'transparent'
  if (margin > 50)  return '#16A34A'
  if (margin >= 20) return '#4CAF50'
  return '#D97706'
}
