'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSelector } from 'react-redux'
import {
  ArrowLeft,
  Building2,
  FileText,
  Truck,
  ChevronDown,
  ChevronRight,
  Calendar,
  MapPin,
  User,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Receipt,
  CreditCard,
} from 'lucide-react'
import { RootState } from '@/store'
import { useAgingARDetail } from '../hooks/useAgingARDetail'
import { ProjectDetailInvoice, ProjectDetailSuratJalan } from '@/features/reports/domain/entities/AgingARProjectDetail'
import { formatRupiah, formatDate } from '@/lib/formatters'
import { AGING_BUCKET_CONFIG } from '@/features/reports/domain/value-objects/AgingBucket'

// ─── Status Helpers ───────────────────────────────────────────────────────────

const INVOICE_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  draft:       { label: 'Draft',       bg: '#F3F4F6', color: '#6B7280', icon: <FileText size={11} /> },
  sent:        { label: 'Terkirim',    bg: '#EFF6FF', color: '#1D4ED8', icon: <Receipt size={11} /> },
  outstanding: { label: 'Outstanding', bg: '#FEF3C7', color: '#B45309', icon: <Clock size={11} /> },
  paid:        { label: 'Lunas',       bg: '#DCFCE7', color: '#15803D', icon: <CheckCircle2 size={11} /> },
  void:        { label: 'Void',        bg: '#FEE2E2', color: '#B91C1C', icon: <XCircle size={11} /> },
}

const SJ_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     bg: '#F3F4F6', color: '#6B7280', icon: <FileText size={11} /> },
  assigned:  { label: 'Assigned',  bg: '#EFF6FF', color: '#1D4ED8', icon: <User size={11} /> },
  delivered: { label: 'Terkirim',  bg: '#DCFCE7', color: '#15803D', icon: <CheckCircle2 size={11} /> },
  void:      { label: 'Void',      bg: '#FEE2E2', color: '#B91C1C', icon: <XCircle size={11} /> },
}

const PROJECT_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  active:    { label: 'Aktif',     bg: '#DCFCE7', color: '#15803D' },
  completed: { label: 'Selesai',   bg: '#F3F4F6', color: '#374151' },
  cancelled: { label: 'Dibatalkan',bg: '#FEE2E2', color: '#B91C1C' },
}

const METHOD_LABEL: Record<string, string> = {
  transfer: 'Transfer Bank',
  cash: 'Tunai',
  check: 'Cek',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, config }: { status: string; config: Record<string, { label: string; bg: string; color: string; icon?: React.ReactNode }> }) {
  const cfg = config[status] ?? { label: status, bg: '#F3F4F6', color: '#6B7280' }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {'icon' in cfg && cfg.icon}
      {cfg.label}
    </span>
  )
}

function OverdueBadge({ days }: { days: number }) {
  if (days <= 0) {
    return (
      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
        {Math.abs(days)} hari lagi
      </span>
    )
  }
  const cfg =
    days <= 30 ? { bg: '#FEF3C7', color: '#B45309' } :
    days <= 60 ? { bg: '#FFEDD5', color: '#C2410C' } :
    days <= 90 ? { bg: '#FEE2E2', color: '#B91C1C' } :
                 { bg: '#FECACA', color: '#7F1D1D' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
      +{days} hari
    </span>
  )
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-1"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--border-light)',
        borderRight: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)',
        borderLeft: `4px solid ${accent ?? '#E5E7EB'}`,
      }}
    >
      <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      <div className="text-lg font-bold font-mono leading-tight" style={{ color: accent ?? 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  )
}

// ─── Invoice Row (expandable) ─────────────────────────────────────────────────

function InvoiceRow({ invoice }: { invoice: ProjectDetailInvoice }) {
  const [expanded, setExpanded] = useState(false)
  const invCfg = INVOICE_STATUS_CONFIG[invoice.status] ?? INVOICE_STATUS_CONFIG.draft
  const bucketCfg = invoice.aging_bucket ? AGING_BUCKET_CONFIG[invoice.aging_bucket] : null

  return (
    <>
      <tr
        className="hover:brightness-95 transition-all cursor-pointer"
        style={{ backgroundColor: expanded ? '#F9FAFB' : '#FFFFFF' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Expand + Invoice Number */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 shrink-0">
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
            <span className="font-mono font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              #{invoice.invoice_number}
            </span>
          </div>
        </td>

        {/* Tanggal Invoice */}
        <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {formatDate(invoice.invoice_date)}
        </td>

        {/* Jatuh Tempo */}
        <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {formatDate(invoice.due_date)}
        </td>

        {/* Status */}
        <td className="px-3 py-3">
          <StatusBadge status={invoice.status} config={INVOICE_STATUS_CONFIG} />
        </td>

        {/* Total */}
        <td className="px-3 py-3 text-right font-mono text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {formatRupiah(invoice.total_amount)}
        </td>

        {/* Terbayar */}
        <td className="px-3 py-3 text-right font-mono text-sm" style={{ color: '#15803D' }}>
          {invoice.paid_amount > 0 ? formatRupiah(invoice.paid_amount) : <span style={{ color: '#D1D5DB' }}>—</span>}
        </td>

        {/* Sisa */}
        <td className="px-3 py-3 text-right font-mono text-sm font-bold" style={{ color: invoice.remaining_amount > 0 ? '#B45309' : '#15803D' }}>
          {invoice.remaining_amount > 0 ? formatRupiah(invoice.remaining_amount) : 'Lunas'}
        </td>

        {/* Aging */}
        <td className="px-3 py-3">
          {invoice.status === 'outstanding' && (
            <OverdueBadge days={invoice.days_overdue} />
          )}
          {invoice.status === 'paid' && (
            <span className="text-xs" style={{ color: '#15803D' }}>✓ Lunas</span>
          )}
          {bucketCfg && invoice.status === 'outstanding' && (
            <div className="mt-1">
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: bucketCfg.badgeBg, color: bucketCfg.color }}
              >
                {bucketCfg.label}
              </span>
            </div>
          )}
        </td>
      </tr>

      {/* Expanded: Items + Payments + Attached SJ */}
      {expanded && (
        <tr>
          <td colSpan={8} className="px-0 py-0">
            <div className="px-10 py-4 space-y-4" style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>

              {/* Invoice Items */}
              <div>
                <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Package size={12} /> RINCIAN ITEM
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ backgroundColor: '#F3F4F6' }}>
                      <th className="px-3 py-1.5 text-left font-semibold rounded-tl-lg" style={{ color: 'var(--text-secondary)' }}>Armada / Deskripsi</th>
                      <th className="px-3 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Periode</th>
                      <th className="px-3 py-1.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Qty</th>
                      <th className="px-3 py-1.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Satuan</th>
                      <th className="px-3 py-1.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Harga Satuan</th>
                      <th className="px-3 py-1.5 text-right font-semibold rounded-tr-lg" style={{ color: 'var(--text-secondary)' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map(item => (
                      <tr key={item.uuid} className="border-t" style={{ borderColor: '#E5E7EB' }}>
                        <td className="px-3 py-1.5" style={{ color: 'var(--text-primary)' }}>
                          <div className="font-medium">{item.fleet_label}</div>
                          {item.description && <div className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{item.description}</div>}
                        </td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>
                          {item.period_start && item.period_end
                            ? `${formatDate(item.period_start)} – ${formatDate(item.period_end)}`
                            : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{item.qty}</td>
                        <td className="px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>{item.unit}</td>
                        <td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{formatRupiah(item.unit_price)}</td>
                        <td className="px-3 py-1.5 text-right font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
                      <td colSpan={5} className="px-3 py-1.5 text-right text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Subtotal</td>
                      <td className="px-3 py-1.5 text-right font-mono font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>{formatRupiah(invoice.subtotal_amount)}</td>
                    </tr>
                    {invoice.tax_percent > 0 && (
                      <tr style={{ borderTop: '1px solid #E5E7EB' }}>
                        <td colSpan={5} className="px-3 py-1.5 text-right text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>PPN {invoice.tax_percent}%</td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{formatRupiah(invoice.tax_amount)}</td>
                      </tr>
                    )}
                    <tr style={{ backgroundColor: '#F3F4F6', borderTop: '2px solid #D1D5DB' }}>
                      <td colSpan={5} className="px-3 py-1.5 text-right text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Total</td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{formatRupiah(invoice.total_amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payments */}
              {invoice.payments.length > 0 && (
                <div>
                  <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <CreditCard size={12} /> RIWAYAT PEMBAYARAN
                  </div>
                  <div className="space-y-1.5">
                    {invoice.payments.map(pay => (
                      <div key={pay.uuid} className="flex items-center justify-between rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={12} style={{ color: '#15803D' }} />
                          <span style={{ color: '#15803D', fontWeight: 600 }}>{formatDate(pay.payment_date)}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>· {METHOD_LABEL[pay.method] ?? pay.method}</span>
                          {pay.notes && <span style={{ color: 'var(--text-secondary)' }}>· {pay.notes}</span>}
                        </div>
                        <span className="font-mono font-bold" style={{ color: '#15803D' }}>{formatRupiah(pay.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attached SJ */}
              {invoice.attached_sj_numbers.length > 0 && (
                <div>
                  <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Truck size={12} /> SURAT JALAN DILAMPIRKAN
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {invoice.attached_sj_numbers.map(sj => (
                      <span
                        key={sj}
                        className="text-xs px-2.5 py-1 rounded-full font-mono font-medium"
                        style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                      >
                        {sj}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {invoice.notes && (
                <div className="text-xs rounded-xl px-3 py-2" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
                  <span className="font-semibold">Catatan: </span>{invoice.notes}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── SJ Row ───────────────────────────────────────────────────────────────────

function SJRow({ sj, index }: { sj: ProjectDetailSuratJalan; index: number }) {
  const rowBg = index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
  const isVoid = sj.status === 'void'

  return (
    <tr style={{ backgroundColor: rowBg, opacity: isVoid ? 0.6 : 1 }}>
      {/* SJ Number */}
      <td className="px-4 py-3">
        <span className="font-mono font-semibold text-sm" style={{ color: isVoid ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
          {sj.sj_number}
        </span>
        {sj.cargo_description && (
          <div className="text-[11px] mt-0.5 max-w-40 truncate" style={{ color: 'var(--text-secondary)' }}>{sj.cargo_description}</div>
        )}
      </td>

      {/* Tanggal */}
      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        {formatDate(sj.sj_date)}
      </td>

      {/* Armada */}
      <td className="px-3 py-3 text-xs">
        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{sj.fleet_label}</div>
        <div className="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>{sj.fleet_plate}</div>
      </td>

      {/* Supir */}
      <td className="px-3 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        {sj.driver_name ?? <span style={{ color: '#D1D5DB' }}>—</span>}
      </td>

      {/* Rute */}
      <td className="px-3 py-3 text-xs">
        <div className="flex items-start gap-1">
          <MapPin size={10} className="shrink-0 mt-0.5" style={{ color: '#9CA3AF' }} />
          <div>
            <div className="font-medium truncate max-w-48" style={{ color: 'var(--text-primary)' }}>{sj.origin}</div>
            <div className="text-[10px]" style={{ color: '#9CA3AF' }}>→</div>
            <div className="truncate max-w-48" style={{ color: 'var(--text-secondary)' }}>{sj.destination}</div>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <StatusBadge status={sj.status} config={SJ_STATUS_CONFIG} />
        {sj.void_reason && (
          <div className="text-[10px] mt-1 max-w-32 truncate" style={{ color: '#B91C1C' }} title={sj.void_reason}>
            {sj.void_reason}
          </div>
        )}
        {sj.internal_notes && !sj.void_reason && (
          <div className="text-[10px] mt-1 italic max-w-32 truncate" style={{ color: 'var(--text-secondary)' }} title={sj.internal_notes}>
            {sj.internal_notes}
          </div>
        )}
      </td>

      {/* Biaya Ops */}
      <td className="px-3 py-3 text-right font-mono text-sm" style={{ color: 'var(--text-primary)' }}>
        {formatRupiah(sj.operational_cost)}
      </td>

      {/* Invoice */}
      <td className="px-3 py-3 text-xs">
        {sj.invoice_number ? (
          <span className="font-mono font-medium" style={{ color: 'var(--green-primary)' }}>
            #{sj.invoice_number}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            Belum terlampir
          </span>
        )}
      </td>
    </tr>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="animate-fadeIn space-y-5">
      <div className="h-6 w-48 rounded-lg animate-pulse" style={{ backgroundColor: '#F3F4F6' }} />
      <div className="rounded-2xl p-6 space-y-3 animate-pulse" style={{ backgroundColor: '#F3F4F6' }}>
        <div className="h-5 w-64 rounded-lg" style={{ backgroundColor: '#E5E7EB' }} />
        <div className="h-4 w-40 rounded-lg" style={{ backgroundColor: '#E5E7EB' }} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: '#F3F4F6' }} />
        ))}
      </div>
      <div className="h-64 rounded-2xl animate-pulse" style={{ backgroundColor: '#F3F4F6' }} />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgingARDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useSelector((state: RootState) => state.auth.user)

  const projectIdParam = searchParams.get('project_id')
  const projectId = projectIdParam ? parseInt(projectIdParam, 10) : null

  const { data, isLoading, error } = useAgingARDetail(isNaN(projectId as number) ? null : projectId)

  useEffect(() => {
    if (user && !['super_admin', 'admin_finance'].includes(user.role)) {
      router.replace('/dashboard')
    }
  }, [user, router])

  if (user && !['super_admin', 'admin_finance'].includes(user.role)) return null

  if (!projectIdParam || isNaN(Number(projectIdParam))) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle size={40} style={{ color: '#DC2626' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Parameter project tidak valid.</p>
        <button onClick={() => router.back()} className="text-sm underline" style={{ color: 'var(--green-primary)' }}>
          Kembali
        </button>
      </div>
    )
  }

  if (isLoading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <XCircle size={40} style={{ color: '#DC2626' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{error}</p>
        <button onClick={() => router.back()} className="text-sm underline" style={{ color: 'var(--green-primary)' }}>
          Kembali
        </button>
      </div>
    )
  }

  if (!data) return null

  const projectStatusCfg = PROJECT_STATUS_CONFIG[data.status] ?? PROJECT_STATUS_CONFIG.active
  const totalOpsFormatted = formatRupiah(data.total_operational_cost)
  const hasOutstanding = data.total_outstanding > 0

  return (
    <div className="animate-fadeIn space-y-5">

      {/* Back + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl transition-all hover:brightness-95"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
        <nav className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
          <span>Laporan</span>
          <span>/</span>
          <a href="/laporan/aging-ar" className="hover:underline" style={{ color: 'var(--text-secondary)' }}>Aging AR</a>
          <span>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Detail Proyek</span>
        </nav>
      </div>

      {/* Project Header Card */}
      <div
        className="rounded-2xl p-6"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid var(--border-card)',
          borderRight: '1px solid var(--border-card)',
          borderBottom: '1px solid var(--border-card)',
          borderLeft: '4px solid #1E3A1E',
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{data.project_name}</h1>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: projectStatusCfg.bg, color: projectStatusCfg.color }}
              >
                {projectStatusCfg.label}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{data.project_code}</span>
              <span>·</span>
              <span>Kontrak: <span className="font-mono">{data.contract_number}</span></span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#15803D' }}>
              <Calendar size={12} />
              {formatDate(data.start_date)} – {data.end_date ? formatDate(data.end_date) : 'Selesai belum ditentukan'}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 flex flex-wrap gap-5" style={{ borderTop: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-2">
            <Building2 size={14} style={{ color: 'var(--text-secondary)' }} />
            <div>
              <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{data.customer_name}</div>
              <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {data.npwp ? `NPWP: ${data.npwp}` : 'NPWP: —'}
                {data.is_pkp && <span className="ml-2 px-1.5 py-0.5 rounded-full font-bold text-[10px]" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>PKP</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>{data.invoice_count} Invoice</span>
            <span>·</span>
            <span>{data.sj_count} Surat Jalan</span>
            <span>·</span>
            <span>{data.sj_delivered_count} Terkirim</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Ditagihkan"
          value={formatRupiah(data.total_invoiced)}
          sub={`${data.invoice_count} invoice`}
          accent="#1E3A1E"
        />
        <SummaryCard
          label="Total Terbayar"
          value={formatRupiah(data.total_paid)}
          sub={data.total_paid > 0 ? `${Math.round((data.total_paid / data.total_invoiced) * 100)}% dari total` : 'Belum ada pembayaran'}
          accent="#15803D"
        />
        <SummaryCard
          label="Sisa Tagihan"
          value={hasOutstanding ? formatRupiah(data.total_outstanding) : 'Lunas'}
          sub={hasOutstanding ? 'Belum terbayar' : 'Semua invoice lunas'}
          accent={hasOutstanding ? '#B45309' : '#15803D'}
        />
        <SummaryCard
          label="Total Biaya Operasional"
          value={totalOpsFormatted}
          sub={`${data.sj_count} surat jalan`}
          accent="#6B7280"
        />
      </div>

      {/* Invoice Section */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-2">
            <FileText size={16} style={{ color: 'var(--green-primary)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Daftar Invoice</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
              {data.invoice_count}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Klik baris untuk melihat detail item & pembayaran</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border-light)' }}>
                <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>No. Invoice</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Tgl Invoice</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Jatuh Tempo</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Total</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Terbayar</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Sisa Tagihan</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Aging</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map(inv => (
                <InvoiceRow key={inv.uuid} invoice={inv} />
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#F3F4F6', borderTop: '2px solid var(--border-light)' }}>
                <td colSpan={4} className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  TOTAL ({data.invoice_count} invoice)
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatRupiah(data.total_invoiced)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm font-bold" style={{ color: '#15803D' }}>
                  {formatRupiah(data.total_paid)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm font-bold" style={{ color: hasOutstanding ? '#B45309' : '#15803D' }}>
                  {formatRupiah(data.total_outstanding)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Surat Jalan Section */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-2">
            <Truck size={16} style={{ color: 'var(--green-primary)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Daftar Surat Jalan</h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
              {data.sj_count}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={11} style={{ color: '#15803D' }} />
              {data.sj_delivered_count} terkirim
            </span>
            {data.surat_jalan.filter(sj => sj.status === 'draft' || sj.status === 'assigned').length > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={11} style={{ color: '#B45309' }} />
                {data.surat_jalan.filter(sj => sj.status === 'draft' || sj.status === 'assigned').length} proses
              </span>
            )}
            {data.surat_jalan.filter(sj => !sj.invoice_number && sj.status !== 'void').length > 0 && (
              <span className="flex items-center gap-1">
                <AlertCircle size={11} style={{ color: '#D97706' }} />
                {data.surat_jalan.filter(sj => !sj.invoice_number && sj.status !== 'void').length} belum terlampir
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid var(--border-light)' }}>
                <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>No. SJ</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Tanggal</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Armada</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Supir</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Rute</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Biaya Ops</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>No. Invoice</th>
              </tr>
            </thead>
            <tbody>
              {data.surat_jalan.map((sj, i) => (
                <SJRow key={sj.uuid} sj={sj} index={i} />
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: '#F3F4F6', borderTop: '2px solid var(--border-light)' }}>
                <td colSpan={6} className="px-4 py-2.5 text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                  TOTAL BIAYA OPERASIONAL ({data.sj_count} SJ)
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatRupiah(data.total_operational_cost)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  )
}
