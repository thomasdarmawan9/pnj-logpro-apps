import { FileText, Truck, AlertCircle, Clock } from 'lucide-react'
import { SJStats } from '../../domain/entities/SuratJalan'

interface SJSummaryCardsProps {
  stats: SJStats
}

const cardBase = 'rounded-xl px-5 py-4 shadow-sm border-l-4 bg-white flex items-center gap-3'

export default function SJSummaryCards({ stats }: SJSummaryCardsProps) {
  const cards = [
    {
      id: 'total',
      label: 'Total SJ Bulan Ini',
      value: stats.totalBulanIni,
      icon: FileText,
      border: '#2E7D32',
      color: '#2E7D32',
    },
    {
      id: 'assigned',
      label: 'Sedang Berjalan',
      value: stats.sedangBerjalan,
      icon: Truck,
      border: '#2563EB',
      color: '#2563EB',
    },
    {
      id: 'belum',
      label: 'Belum Ditagih',
      value: stats.belumDitagih,
      icon: AlertCircle,
      border: '#DC2626',
      color: '#DC2626',
    },
    {
      id: 'draft',
      label: 'Draft Menunggu',
      value: stats.draftMenunggu,
      icon: Clock,
      border: '#D97706',
      color: '#D97706',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(card => {
        const Icon = card.icon
        return (
          <div key={card.id} className={cardBase} style={{ borderLeftColor: card.border }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}1A` }}>
              <Icon size={18} color={card.color} />
            </div>
            <div>
              <div className="text-[24px] font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{card.value}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{card.label}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
