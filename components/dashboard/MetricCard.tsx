import Badge from '@/components/ui/Badge'

interface MetricCardProps {
  badge: string
  badgeVariant: 'gray' | 'red' | 'green' | 'amber' | 'blue' | 'orange' | 'emerald'
  value: string
  label: string
  trend: string
  trendColor: string
}

export default function MetricCard({ badge, badgeVariant, value, label, trend, trendColor }: MetricCardProps) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 hover:scale-[1.02] transition-transform duration-200"
      style={{ backgroundColor: '#2D5A42' }}
    >
      <div>
        <Badge variant={badgeVariant}>{badge}</Badge>
      </div>
      <div>
        <div
          className="text-[28px] font-bold leading-none font-mono"
          style={{ color: 'var(--text-on-dark)', fontFamily: "'JetBrains Mono', monospace" }}
        >
          {value}
        </div>
        <div className="text-sm mt-1" style={{ color: 'var(--text-on-dark-muted)' }}>
          {label}
        </div>
      </div>
      <div className="text-sm font-medium" style={{ color: trendColor }}>
        {trend}
      </div>
    </div>
  )
}
