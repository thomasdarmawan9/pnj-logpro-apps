export enum AgingBucket {
  CURRENT    = 'current',
  DAYS_1_30  = '1-30',
  DAYS_31_60 = '31-60',
  DAYS_61_90 = '61-90',
  OVER_90    = '>90',
}

export const AGING_BUCKET_CONFIG: Record<AgingBucket, {
  label: string
  color: string
  bg: string
  border: string
  badgeBg: string
  days: [number | null, number | null]
}> = {
  [AgingBucket.CURRENT]:    { label: 'Belum Jatuh Tempo', color: '#15803D', bg: '#F0FDF4', border: '#16A34A', badgeBg: '#DCFCE7', days: [null, 0]   },
  [AgingBucket.DAYS_1_30]:  { label: '1–30 Hari',         color: '#B45309', bg: '#FFFBEB', border: '#D97706', badgeBg: '#FEF3C7', days: [1, 30]    },
  [AgingBucket.DAYS_31_60]: { label: '31–60 Hari',        color: '#C2410C', bg: '#FFF7ED', border: '#EA580C', badgeBg: '#FFEDD5', days: [31, 60]   },
  [AgingBucket.DAYS_61_90]: { label: '61–90 Hari',        color: '#B91C1C', bg: '#FEF2F2', border: '#DC2626', badgeBg: '#FEE2E2', days: [61, 90]   },
  [AgingBucket.OVER_90]:    { label: '> 90 Hari',         color: '#7F1D1D', bg: '#FEF2F2', border: '#7F1D1D', badgeBg: '#FECACA', days: [91, null] },
}

export function getAgingBucket(dueDate: string, today: string = new Date().toISOString()): AgingBucket {
  const due = new Date(dueDate)
  const now = new Date(today)
  const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0)  return AgingBucket.CURRENT
  if (diffDays <= 30) return AgingBucket.DAYS_1_30
  if (diffDays <= 60) return AgingBucket.DAYS_31_60
  if (diffDays <= 90) return AgingBucket.DAYS_61_90
  return AgingBucket.OVER_90
}

export const ALL_BUCKETS = [
  AgingBucket.CURRENT,
  AgingBucket.DAYS_1_30,
  AgingBucket.DAYS_31_60,
  AgingBucket.DAYS_61_90,
  AgingBucket.OVER_90,
]

export function emptyBucketTotals(): Record<AgingBucket, number> {
  return {
    [AgingBucket.CURRENT]: 0,
    [AgingBucket.DAYS_1_30]: 0,
    [AgingBucket.DAYS_31_60]: 0,
    [AgingBucket.DAYS_61_90]: 0,
    [AgingBucket.OVER_90]: 0,
  }
}
