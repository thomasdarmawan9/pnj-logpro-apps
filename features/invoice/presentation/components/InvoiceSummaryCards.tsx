import { AlertCircle, Clock, CheckCircle, FileText } from 'lucide-react'

interface Stats {
  totalPiutang: number
  jatuhTempo: number
  terbayarBulanIni: number
  draftBelumDikirim: number
  countOutstanding: number
  countPaidThisMonth: number
}

function formatRupiah(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(0)}Jt`
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

interface CardProps {
  icon: React.ReactNode
  value: string
  label: string
  sub: string
  borderColor: string
}

function SummaryCard({ icon, value, label, sub, borderColor }: CardProps) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border-l-4 flex items-start gap-4" style={{ borderLeftColor: borderColor, borderColor: 'var(--border-card)' }}>
      <div className="rounded-xl p-2.5 flex-shrink-0" style={{ backgroundColor: `${borderColor}18` }}>
        <div style={{ color: borderColor }}>{icon}</div>
      </div>
      <div>
        <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{value}</div>
        <div className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{label}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</div>
      </div>
    </div>
  )
}

export default function InvoiceSummaryCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        icon={<AlertCircle size={20} />}
        value={formatRupiah(stats.totalPiutang)}
        label="Total Piutang Aktif"
        sub={`${stats.countOutstanding} invoice belum lunas`}
        borderColor="#DC2626"
      />
      <SummaryCard
        icon={<Clock size={20} />}
        value={String(stats.jatuhTempo)}
        label="Invoice Jatuh Tempo"
        sub="Perlu tindak lanjut"
        borderColor="#D97706"
      />
      <SummaryCard
        icon={<CheckCircle size={20} />}
        value={formatRupiah(stats.terbayarBulanIni)}
        label="Terbayar Bulan Ini"
        sub={`${stats.countPaidThisMonth} invoice lunas`}
        borderColor="#2E7D32"
      />
      <SummaryCard
        icon={<FileText size={20} />}
        value={String(stats.draftBelumDikirim)}
        label="Draft Belum Dikirim"
        sub="Menunggu pengiriman"
        borderColor="#6366F1"
      />
    </div>
  )
}
